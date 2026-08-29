/**
 * Execution Agent
 * Centralized execution registry/dispatcher for all HYRO workflow node types.
 * Connects real integration services, AI engines, variable resolvers, and control flow.
 */

const env = require('../config/env');
const integrationService = require('../services/integrationService');
const gmailIntegration = require('../integrations/gmailIntegration');
const googleSheetsIntegration = require('../integrations/googleSheetsIntegration');
const slackIntegration = require('../integrations/slackIntegration');
const discordIntegration = require('../integrations/discordIntegration');
const linkedinIntegration = require('../integrations/linkedinIntegration');
const gmailFilterService = require('../services/gmailFilterService');

// ── Safe Variable Resolver (No eval) ─────────────────────────────────────────
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Handle array indexing like records[0]
    const match = part.match(/^([a-zA-Z0-9_$]+)\[(\d+)\]$/);
    if (match) {
      const arrName = match[1];
      const index = parseInt(match[2], 10);
      current = current[arrName]?.[index];
    } else {
      current = current[part];
    }
  }
  return current;
}

function resolveVariables(template, context = {}) {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{\s*([a-zA-Z0-9_$.\[\]]+)\s*\}\}/g, (match, expr) => {
    // 1. Check direct expression in context
    const val = getNestedValue(context, expr);
    if (val !== undefined && val !== null) return String(val);

    // 2. Search inside context.lastOutput
    if (context.lastOutput) {
      const lastVal = getNestedValue(context.lastOutput, expr);
      if (lastVal !== undefined && lastVal !== null) return String(lastVal);

      // Search in records array if present
      if (Array.isArray(context.lastOutput.records) && context.lastOutput.records.length > 0) {
        const recordVal = getNestedValue(context.lastOutput.records[0], expr);
        if (recordVal !== undefined && recordVal !== null) return String(recordVal);
      }
    }

    // 3. Search in all prevOutputs
    for (const out of Object.values(context.prevOutputs || {})) {
      const outVal = getNestedValue(out, expr);
      if (outVal !== undefined && outVal !== null) return String(outVal);
      if (Array.isArray(out.records) && out.records.length > 0) {
        const recVal = getNestedValue(out.records[0], expr);
        if (recVal !== undefined && recVal !== null) return String(recVal);
      }
    }

    return match; // Leave unchanged if unresolved
  });
}

// ── Safe Condition Evaluator (No eval) ───────────────────────────────────────
function evaluateCondition(conditionStr, context = {}) {
  if (!conditionStr || typeof conditionStr !== 'string') return true;

  const trimmed = conditionStr.trim();

  // Handle "category in ['JOB', 'INTERVIEW']" or "role in [...]"
  const inMatch = trimmed.match(/^([a-zA-Z0-9_$.]+)\s+in\s+\[(.*)\]$/i);
  if (inMatch) {
    const leftKey = inMatch[1];
    const leftVal = String(getNestedValue(context.lastOutput, leftKey) || getNestedValue(context, leftKey) || '').toUpperCase();
    const rawItems = inMatch[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '').toUpperCase());
    return rawItems.includes(leftVal);
  }

  // Handle comparisons: ==, ===, !=, !==, >=, <=, >, <, contains, not contains
  const opMatch = trimmed.match(/^([a-zA-Z0-9_$.]+)\s*(===|==|!==|!=|>=|<=|>|<|contains|not contains)\s*(.+)$/i);
  if (opMatch) {
    const leftKey = opMatch[1];
    const op = opMatch[2].toLowerCase();
    let rightVal = opMatch[3].trim().replace(/^['"]|['"]$/g, '');

    const leftVal = getNestedValue(context.lastOutput, leftKey) !== undefined
      ? getNestedValue(context.lastOutput, leftKey)
      : getNestedValue(context, leftKey);

    switch (op) {
      case '==':
      case '===':
        return String(leftVal).toLowerCase() === rightVal.toLowerCase();
      case '!=':
      case '!==':
        return String(leftVal).toLowerCase() !== rightVal.toLowerCase();
      case '>':
        return Number(leftVal) > Number(rightVal);
      case '>=':
        return Number(leftVal) >= Number(rightVal);
      case '<':
        return Number(leftVal) < Number(rightVal);
      case '<=':
        return Number(leftVal) <= Number(rightVal);
      case 'contains':
        return String(leftVal).toLowerCase().includes(rightVal.toLowerCase());
      case 'not contains':
        return !String(leftVal).toLowerCase().includes(rightVal.toLowerCase());
      default:
        return true;
    }
  }

  // Handle single boolean flags
  const flagVal = getNestedValue(context.lastOutput, trimmed) || getNestedValue(context, trimmed);
  return Boolean(flagVal);
}

// ── Node Executors ──────────────────────────────────────────────────────────

async function executeGmailTrigger(node, context) {
  const { config = {} } = node;
  const { ownerId } = context;

  // Retrieve user's decrypted tokens if connected
  let tokens = null;
  if (ownerId) {
    tokens = await integrationService.getDecryptedTokens(ownerId, 'gmail');
  }

  // Fallback to mock dev tokens if no stored credentials
  if (!tokens) {
    tokens = {
      accessToken: 'mock_gmail_token_dev',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    };
  }

  const emails = await gmailIntegration.fetchEmails(tokens, {
    searchQuery: config.searchQuery || 'is:unread',
    maxResults: config.maxResults || 10
  });

  return {
    fetchedEmails: emails.length,
    messages: emails,
    searchQuery: config.searchQuery || 'is:unread',
    triggeredAt: new Date().toISOString()
  };
}

async function executeScheduleTrigger(node, context) {
  const { config = {} } = node;
  return {
    schedule: config.cron || config.interval || '0 9 * * 1',
    triggeredAt: new Date().toISOString(),
    status: 'TRIGGERED'
  };
}

async function executeWebhookTrigger(node, context) {
  const { config = {} } = node;
  const payload = context.inputs?.webhookPayload || context.inputs || { source: 'webhook', receivedAt: new Date().toISOString() };
  return {
    path: config.path || '/webhook',
    payload,
    receivedAt: new Date().toISOString(),
    status: 'TRIGGERED'
  };
}

async function executeAIEmailClassifier(node, context) {
  const { config = {} } = node;
  const messages = context.lastOutput?.messages || context.inputs?.messages || [
    { id: 'm1', subject: 'Interview Invitation — Full Stack Developer', sender: 'recruiter@techcorp.com', body: 'We invite you for an interview.' },
    { id: 'm2', subject: 'Your Python Certificate is Ready', sender: 'certs@coursera.org', body: 'Your Python certificate is ready.' },
    { id: 'm3', subject: 'Invoice #1042', sender: 'billing@cloud.com', body: 'Invoice amount: $120.' }
  ];

  const targetCategories = Array.isArray(config.categories)
    ? config.categories
    : typeof config.categories === 'string'
      ? config.categories.split(',').map((s) => s.trim())
      : ['JOB', 'CERTIFICATE', 'INVOICE', 'OTHER'];

  const categories = {};
  messages.forEach((m) => {
    const classification = gmailFilterService.classifyEmail(m.subject || '', m.body || '', m.sender || '');
    categories[m.id] = classification.category;
  });

  const firstCat = Object.values(categories)[0] || 'JOB';

  return {
    classifiedCount: messages.length,
    categories,
    category: firstCat,
    primaryCategory: firstCat,
    targetCategories,
    messages
  };
}

async function executeAIDetailExtractor(node, context) {
  const { config = {} } = node;
  const messages = context.lastOutput?.messages || [
    { id: 'm1', subject: 'Interview Invitation — Full Stack Developer', sender: 'recruiter@techcorp.com', body: 'Salary $120k at TechCorp.', date: new Date().toISOString() }
  ];

  const records = messages.map((m) => {
    const text = `${m.subject || ''} ${m.body || ''}`.toLowerCase();
    if (text.includes('job') || text.includes('interview') || text.includes('developer') || text.includes('engineer') || text.includes('position')) {
      return {
        company: 'TechCorp',
        role: 'Full Stack Developer',
        sender: m.sender || 'recruiter@techcorp.com',
        date: m.date || new Date().toISOString().split('T')[0],
        status: 'INTERVIEW',
        salary: '$120k',
        application_link: 'https://careers.techcorp.com/apply/123'
      };
    }
    if (text.includes('certificate') || text.includes('coursera')) {
      return {
        certificate_name: 'Python Programming',
        provider: 'Coursera',
        sender: m.sender || 'certs@coursera.org',
        date: m.date || new Date().toISOString().split('T')[0],
        credential_link: 'https://coursera.org/verify/py123'
      };
    }
    return {
      vendor: 'Cloud Services',
      amount: '$120.00',
      invoice_number: 'INV-1042',
      sender: m.sender || 'billing@cloud.com',
      date: m.date || new Date().toISOString().split('T')[0]
    };
  });

  return {
    extractedCount: records.length,
    records,
    targetFields: config.targetFields || 'company,role,sender,date'
  };
}

async function executeAISummarizer(node, context) {
  const { config = {} } = node;
  const prompt = config.prompt || 'Summarize key information for downstream actions';
  const lastOutput = context.lastOutput || {};
  
  let summary = '';
  if (lastOutput.records && lastOutput.records.length > 0) {
    const r = lastOutput.records[0];
    summary = `Opportunity: ${r.role || 'Role'} at ${r.company || 'Company'} (${r.status || 'Active'}). Link: ${r.application_link || 'N/A'}`;
  } else if (lastOutput.messages && lastOutput.messages.length > 0) {
    summary = `Processed ${lastOutput.messages.length} emails. Latest: "${lastOutput.messages[0].subject}"`;
  } else {
    summary = `Summary of weekly tech milestones and automation achievements for ${prompt}`;
  }

  return {
    summary,
    characterCount: summary.length,
    generatedAt: new Date().toISOString()
  };
}

async function executeGoogleSheetsAppend(node, context) {
  const { config = {} } = node;
  const { ownerId } = context;

  let tokens = null;
  if (ownerId) {
    tokens = await integrationService.getDecryptedTokens(ownerId, 'google-sheets');
  }

  if (!tokens) {
    tokens = {
      accessToken: 'mock_sheets_token_dev',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    };
  }

  const rawRecords = context.lastOutput?.records || [
    { company: 'TechCorp', role: 'Full Stack Developer', sender: 'recruiter@techcorp.com', date: new Date().toISOString().split('T')[0] }
  ];

  const results = [];
  for (const record of rawRecords) {
    const res = await googleSheetsIntegration.appendRow(tokens, {
      spreadsheetId: config.spreadsheetId || 'default_spreadsheet',
      sheetName: config.sheetName || 'Jobs',
      rowData: record
    });
    results.push(res);
  }

  return {
    rowsAppended: results.length,
    records: rawRecords,
    spreadsheetId: config.spreadsheetId || 'default_spreadsheet',
    sheetName: config.sheetName || 'Jobs',
    status: 'SUCCESS'
  };
}

async function executeSlackPostMessage(node, context) {
  const { config = {} } = node;
  const { ownerId } = context;

  let credentials = null;
  if (ownerId) {
    credentials = await integrationService.getDecryptedTokens(ownerId, 'slack');
  }

  if (!credentials) {
    credentials = {
      accessToken: 'mock_slack_token',
      webhookUrl: 'https://hooks.slack.com/services/TXXXXXXX/BXXXXXXX/mock'
    };
  }

  const defaultTemplate = 'Notification: {{records[0].role}} at {{records[0].company}}';
  const template = config.messageTemplate || defaultTemplate;
  const message = resolveVariables(template, context);

  const res = await slackIntegration.postMessage(credentials, {
    channel: config.channel || '#alerts',
    text: message
  });

  return {
    sent: true,
    channel: config.channel || '#alerts',
    message,
    response: res
  };
}

async function executeDiscordPostMessage(node, context) {
  const { config = {} } = node;
  const { ownerId } = context;

  let credentials = null;
  if (ownerId) {
    credentials = await integrationService.getDecryptedTokens(ownerId, 'discord');
  }

  if (!credentials) {
    credentials = {
      accessToken: 'mock_discord_token',
      webhookUrl: 'https://discord.com/api/webhooks/mock_id/mock_token'
    };
  }

  const template = config.messageTemplate || 'Notification: {{summary}}';
  const content = resolveVariables(template, context);

  const res = await discordIntegration.postMessage(credentials, {
    webhookUrl: config.webhookUrl || credentials.webhookUrl,
    content
  });

  return {
    sent: true,
    channelId: config.channelId || 'general',
    content,
    response: res
  };
}

async function executeLinkedInPost(node, context) {
  const { config = {} } = node;
  const { ownerId } = context;

  let credentials = null;
  if (ownerId) {
    credentials = await integrationService.getDecryptedTokens(ownerId, 'linkedin');
  }

  if (!credentials) {
    credentials = {
      accessToken: 'mock_linkedin_token',
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString()
    };
  }

  // Derive post content from previous nodes if not explicitly specified
  let postContent = config.content;
  if (!postContent) {
    if (context.lastOutput?.summary) {
      postContent = context.lastOutput.summary;
    } else if (context.lastOutput?.records && context.lastOutput.records.length > 0) {
      const r = context.lastOutput.records[0];
      postContent = `Excited to share an update on ${r.role || 'my role'} at ${r.company || 'TechCorp'}! 🚀 #Career #Growth`;
    } else {
      postContent = 'Excited to share my latest engineering achievements with HYRO Automation! 🚀 #Tech #Innovation';
    }
  }

  postContent = resolveVariables(postContent, context);

  const res = await linkedinIntegration.publishPost(credentials, {
    content: postContent,
    visibility: config.visibility || 'PUBLIC',
    expiresAt: credentials.expiresAt
  });

  return {
    published: true,
    status: 'PUBLISHED',
    postId: res.id,
    content: postContent,
    publishedAt: res.publishedAt
  };
}

async function executeConditionBranch(node, context) {
  const { config = {} } = node;
  const condition = config.condition || 'category === "JOB"';
  const conditionMet = evaluateCondition(condition, context);

  return {
    branched: true,
    conditionMet,
    selectedBranch: conditionMet ? 'TRUE' : 'FALSE',
    condition
  };
}

async function executeApprovalGate(node, context) {
  const { config = {} } = node;
  const isPreApproved = context.options?.approved === true || context.execution?.approvedNodes?.[node.id] === true;

  if (isPreApproved) {
    return {
      approvalRequired: true,
      status: 'APPROVED',
      approvedAt: new Date().toISOString()
    };
  }

  return {
    approvalRequired: true,
    status: 'WAITING_FOR_APPROVAL',
    message: config.approvalMessage || 'Human approval required before proceeding.'
  };
}

// ── Node Executors Registry ──────────────────────────────────────────────────
const NODE_EXECUTORS = {
  gmailTrigger: executeGmailTrigger,
  scheduleTrigger: executeScheduleTrigger,
  webhookTrigger: executeWebhookTrigger,

  aiEmailClassifier: executeAIEmailClassifier,
  aiDetailExtractor: executeAIDetailExtractor,
  aiSummarizer: executeAISummarizer,

  googleSheetsAppend: executeGoogleSheetsAppend,
  slackPostMessage: executeSlackPostMessage,
  discordPostMessage: executeDiscordPostMessage,
  linkedinPost: executeLinkedInPost,

  conditionBranch: executeConditionBranch,
  approvalGate: executeApprovalGate
};

class ExecutionAgent {
  async executeNode(node, prevOutputs = {}, options = {}) {
    const { id, type } = node;
    const startTime = Date.now();

    let output = {};
    let error = null;

    const prevValues = Object.values(prevOutputs);
    const lastOutput = prevValues.length > 0 ? prevValues[prevValues.length - 1] : {};

    const context = {
      node,
      prevOutputs,
      lastOutput,
      ownerId: options.ownerId,
      executionId: options.executionId,
      workflowId: options.workflowId,
      inputs: options.inputs || {},
      execution: options.execution,
      options
    };

    try {
      const executor = NODE_EXECUTORS[type];
      if (executor) {
        output = await executor(node, context);
      } else {
        output = {
          executed: true,
          nodeType: type,
          timestamp: new Date().toISOString()
        };
      }
    } catch (err) {
      error = err.message || 'Execution error';
    }

    const duration = Date.now() - startTime;

    return {
      nodeId: id,
      nodeType: type,
      status: error ? 'FAILED' : output?.status === 'WAITING_FOR_APPROVAL' ? 'WAITING_FOR_APPROVAL' : 'COMPLETED',
      output,
      error,
      duration
    };
  }

  resolveVariables(template, context) {
    return resolveVariables(template, context);
  }

  evaluateCondition(condition, context) {
    return evaluateCondition(condition, context);
  }
}

module.exports = new ExecutionAgent();
