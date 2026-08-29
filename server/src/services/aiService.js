/**
 * AI Service — Workflow Generation
 * Priority: 1. OpenRouter → 2. Google Gemini → 3. Deterministic fallback
 */
const env = require('../config/env');

// ── Deterministic rule-based workflow builder ──────────────────────────────
const RULE_BASED_TEMPLATES = {
  gmail_sheets: {
    name: 'Gmail Job Monitor to Google Sheets',
    description: 'Monitor Gmail for job emails and save structured details to Google Sheets',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 100, y: 200 }, data: { label: 'Gmail Trigger', nodeType: 'gmailTrigger' }, config: { searchQuery: 'subject:job OR subject:interview OR subject:application OR subject:offer OR subject:internship OR subject:career OR engineer OR developer OR is:unread', maxResults: 15 } },
      { id: 'n2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier', nodeType: 'aiEmailClassifier' }, config: { categories: ['JOB', 'INTERVIEW', 'OFFER', 'INTERNSHIP', 'OTHER'] } },
      { id: 'n3', type: 'aiDetailExtractor', position: { x: 600, y: 200 }, data: { label: 'AI Detail Extractor', nodeType: 'aiDetailExtractor' }, config: { targetFields: 'company,role,location,jobType,salary,applicationUrl,email,receivedDate' } },
      { id: 'n4', type: 'googleSheetsAppend', position: { x: 850, y: 200 }, data: { label: 'Google Sheets Append', nodeType: 'googleSheetsAppend' }, config: { sheetName: 'Jobs' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true }
    ],
    triggerConfig: { type: 'gmail', pollInterval: '5m' },
    requiredIntegrations: ['gmail', 'google-sheets'],
    approvalRequired: false
  },
  gmail_slack: {
    name: 'Gmail Alert to Slack',
    description: 'Monitor Gmail and send Slack notifications for important emails',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 100, y: 200 }, data: { label: 'Gmail Trigger', nodeType: 'gmailTrigger' }, config: { searchQuery: 'is:important', maxResults: 5 } },
      { id: 'n2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier', nodeType: 'aiEmailClassifier' }, config: { categories: ['JOB', 'CERTIFICATE', 'IMPORTANT'] } },
      { id: 'n3', type: 'slackPostMessage', position: { x: 600, y: 200 }, data: { label: 'Slack Notify', nodeType: 'slackPostMessage' }, config: { channel: '#alerts', messageTemplate: 'New email: {{subject}} from {{sender}}' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true }
    ],
    triggerConfig: { type: 'gmail', pollInterval: '5m' },
    requiredIntegrations: ['gmail', 'slack'],
    approvalRequired: false
  },
  gmail_job_sheets_slack: {
    name: 'Gmail Job Extractor to Sheets & Slack',
    description: 'Monitor Gmail for job emails, extract company and role, save to Google Sheets and notify Slack.',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 100, y: 200 }, data: { label: 'Gmail Trigger', nodeType: 'gmailTrigger' }, config: { searchQuery: 'subject:job OR subject:interview OR subject:application OR subject:offer OR subject:internship OR subject:career OR engineer OR developer OR is:unread', maxResults: 15 } },
      { id: 'n2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier', nodeType: 'aiEmailClassifier' }, config: { categories: ['JOB', 'INTERVIEW', 'OFFER', 'REJECTION'] } },
      { id: 'n3', type: 'aiDetailExtractor', position: { x: 600, y: 200 }, data: { label: 'AI Detail Extractor', nodeType: 'aiDetailExtractor' }, config: { targetFields: 'company,role,location,jobType,salary,applicationUrl,email,receivedDate' } },
      { id: 'n4', type: 'googleSheetsAppend', position: { x: 850, y: 200 }, data: { label: 'Google Sheets Append', nodeType: 'googleSheetsAppend' }, config: { sheetName: 'Jobs' } },
      { id: 'n5', type: 'slackPostMessage', position: { x: 1100, y: 200 }, data: { label: 'Slack Message', nodeType: 'slackPostMessage' }, config: { channel: '#career-alerts', messageTemplate: 'New Job: {{role}} at {{company}}' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true },
      { id: 'e4', source: 'n4', target: 'n5', animated: true }
    ],
    triggerConfig: { type: 'gmail', pollInterval: '5m' },
    requiredIntegrations: ['gmail', 'google-sheets', 'slack'],
    approvalRequired: false
  },
  invoice: {
    name: 'Invoice Processor',
    description: 'Detect invoice emails, extract details, save to Sheets and notify on Slack',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 100, y: 200 }, data: { label: 'Gmail Trigger', nodeType: 'gmailTrigger' }, config: { searchQuery: 'subject:invoice OR subject:payment', maxResults: 10 } },
      { id: 'n2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'Invoice Detector', nodeType: 'aiEmailClassifier' }, config: { categories: ['INVOICE'] } },
      { id: 'n3', type: 'aiDetailExtractor', position: { x: 600, y: 200 }, data: { label: 'Invoice Extractor', nodeType: 'aiDetailExtractor' }, config: { targetFields: 'vendor,amount,invoice_number,date' } },
      { id: 'n4', type: 'googleSheetsAppend', position: { x: 850, y: 200 }, data: { label: 'Invoice Sheet', nodeType: 'googleSheetsAppend' }, config: { sheetName: 'Invoices' } },
      { id: 'n5', type: 'slackPostMessage', position: { x: 850, y: 350 }, data: { label: 'Finance Alert', nodeType: 'slackPostMessage' }, config: { channel: '#finance', messageTemplate: 'New invoice from {{vendor}} — Amount: {{amount}}' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true },
      { id: 'e4', source: 'n3', target: 'n5', animated: true }
    ],
    triggerConfig: { type: 'gmail', pollInterval: '10m' },
    requiredIntegrations: ['gmail', 'google-sheets', 'slack'],
    approvalRequired: false
  },
  conditional_job_sheets: {
    name: 'Conditional Software Job Filter',
    description: 'Check Gmail for job emails. If it is a software engineering job, save it to Google Sheets, otherwise ignore it.',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 100, y: 200 }, data: { label: 'Gmail Trigger', nodeType: 'gmailTrigger' }, config: { searchQuery: 'subject:job OR subject:engineer', maxResults: 10 } },
      { id: 'n2', type: 'aiEmailClassifier', position: { x: 350, y: 200 }, data: { label: 'AI Classifier', nodeType: 'aiEmailClassifier' }, config: { categories: ['SOFTWARE_ENGINEERING_JOB', 'OTHER'] } },
      { id: 'n3', type: 'conditionBranch', position: { x: 600, y: 200 }, data: { label: 'Job Condition', nodeType: 'conditionBranch' }, config: { condition: "category === 'SOFTWARE_ENGINEERING_JOB'" } },
      { id: 'n4', type: 'googleSheetsAppend', position: { x: 850, y: 200 }, data: { label: 'Google Sheets', nodeType: 'googleSheetsAppend' }, config: { sheetName: 'Jobs' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true }
    ],
    triggerConfig: { type: 'gmail', pollInterval: '5m' },
    requiredIntegrations: ['gmail', 'google-sheets'],
    approvalRequired: false
  },
  scheduled_linkedin: {
    name: 'Scheduled LinkedIn Post',
    description: 'Create scheduled professional posts and publish them to LinkedIn with human approval',
    nodes: [
      { id: 'n1', type: 'scheduleTrigger', position: { x: 100, y: 200 }, data: { label: 'Schedule Trigger', nodeType: 'scheduleTrigger' }, config: { cron: '0 18 * * 5', interval: 'Every Friday at 6 PM' } },
      { id: 'n2', type: 'aiSummarizer', position: { x: 350, y: 200 }, data: { label: 'AI Content Generator', nodeType: 'aiSummarizer' }, config: { prompt: 'Create a short professional post about recent project highlights' } },
      { id: 'n3', type: 'approvalGate', position: { x: 600, y: 200 }, data: { label: 'Human Approval', nodeType: 'approvalGate' }, config: { approvalMessage: 'Review and approve this scheduled LinkedIn post' } },
      { id: 'n4', type: 'linkedinPost', position: { x: 850, y: 200 }, data: { label: 'LinkedIn Post', nodeType: 'linkedinPost' }, config: { requireApproval: true } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true }
    ],
    triggerConfig: { type: 'schedule', cron: '0 18 * * 5' },
    requiredIntegrations: ['linkedin'],
    approvalRequired: true
  },
  approval_linkedin_email: {
    name: 'Gmail to LinkedIn with Approval Gate',
    description: 'Draft a LinkedIn post from job-related emails and require user approval before posting',
    nodes: [
      { id: 'n1', type: 'gmailTrigger', position: { x: 100, y: 200 }, data: { label: 'Gmail Trigger', nodeType: 'gmailTrigger' }, config: { searchQuery: 'subject:job OR subject:career', maxResults: 10 } },
      { id: 'n2', type: 'aiSummarizer', position: { x: 350, y: 200 }, data: { label: 'AI Summarizer', nodeType: 'aiSummarizer' }, config: { prompt: 'Summarize job opportunity into a LinkedIn post draft' } },
      { id: 'n3', type: 'approvalGate', position: { x: 600, y: 200 }, data: { label: 'Approval Gate', nodeType: 'approvalGate' }, config: { approvalMessage: 'Approve post before publishing to LinkedIn' } },
      { id: 'n4', type: 'linkedinPost', position: { x: 850, y: 200 }, data: { label: 'LinkedIn Post', nodeType: 'linkedinPost' }, config: { requireApproval: true } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true },
      { id: 'e3', source: 'n3', target: 'n4', animated: true }
    ],
    triggerConfig: { type: 'gmail', pollInterval: '5m' },
    requiredIntegrations: ['gmail', 'linkedin'],
    approvalRequired: true
  },
  discord_alert: {
    name: 'Webhook to Discord Alert',
    description: 'Receive webhook payloads, summarize with AI, and post alert to Discord',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', position: { x: 100, y: 200 }, data: { label: 'Webhook Trigger', nodeType: 'webhookTrigger' }, config: { path: '/webhook' } },
      { id: 'n2', type: 'aiSummarizer', position: { x: 350, y: 200 }, data: { label: 'AI Summarizer', nodeType: 'aiSummarizer' }, config: { prompt: 'Summarize incoming webhook event' } },
      { id: 'n3', type: 'discordPostMessage', position: { x: 600, y: 200 }, data: { label: 'Discord Message', nodeType: 'discordPostMessage' }, config: { channelId: 'general', messageTemplate: '{{summary}}' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', animated: true },
      { id: 'e2', source: 'n2', target: 'n3', animated: true }
    ],
    triggerConfig: { type: 'webhook' },
    requiredIntegrations: ['discord'],
    approvalRequired: false
  }
};

// ── Extract required integrations dynamically ──────────────────────────────
function extractRequiredIntegrations(nodes = []) {
  const integrations = new Set();
  for (const n of nodes) {
    if (n.type === 'gmailTrigger') integrations.add('gmail');
    if (n.type === 'googleSheetsAppend') integrations.add('google-sheets');
    if (n.type === 'slackPostMessage') integrations.add('slack');
    if (n.type === 'discordPostMessage') integrations.add('discord');
    if (n.type === 'linkedinPost') integrations.add('linkedin');
  }
  return Array.from(integrations);
}

// ── Keyword intent classifier ──────────────────────────────────────────────
function classifyIntent(prompt) {
  const p = prompt.toLowerCase();
  // 1. Conditional routing check (use word boundaries so "notification" doesn't trigger "if")
  if (/\b(if|otherwise|condition|branch)\b/i.test(p) && (p.includes('sheet') || p.includes('google')) && (p.includes('gmail') || p.includes('email'))) {
    return 'conditional_job_sheets';
  }
  // 2. LinkedIn with Approval from Email
  if (p.includes('linkedin') && (p.includes('approval') || p.includes('approve') || p.includes('ask me')) && (p.includes('email') || p.includes('gmail'))) {
    return 'approval_linkedin_email';
  }
  // 3. Scheduled LinkedIn
  if (p.includes('linkedin') && (p.includes('schedule') || p.includes('friday') || p.includes('every') || p.includes('daily') || p.includes('weekly'))) {
    return 'scheduled_linkedin';
  }
  // 4. Multi-step Gmail -> Extractor/Classifier -> Sheets -> Slack
  if ((p.includes('job') || p.includes('career')) && (p.includes('sheet') || p.includes('google')) && (p.includes('slack') || p.includes('notify') || p.includes('notification') || p.includes('alert'))) {
    return 'gmail_job_sheets_slack';
  }
  // 5. General job & certificate tracker
  if ((p.includes('job') || p.includes('career') || p.includes('certificate')) && (p.includes('gmail') || p.includes('email')) && p.includes('separate')) {
    return 'job_tracker';
  }
  // 6. Invoice emails
  if ((p.includes('invoice') || p.includes('payment') || p.includes('bill')) && (p.includes('gmail') || p.includes('email'))) {
    return 'invoice';
  }
  // 7. General LinkedIn
  if (p.includes('linkedin')) {
    return 'linkedin_content';
  }
  // 8. Discord
  if (p.includes('discord')) {
    return 'discord_alert';
  }
  // 9. Gmail to Slack
  if ((p.includes('gmail') || p.includes('email')) && (p.includes('slack') || p.includes('notify') || p.includes('notification') || p.includes('alert'))) {
    return 'gmail_slack';
  }
  // 10. Gmail to Sheets
  if ((p.includes('gmail') || p.includes('email')) && (p.includes('sheet') || p.includes('spreadsheet') || p.includes('google'))) {
    return 'gmail_sheets';
  }
  // Default fallback
  return 'gmail_job_sheets_slack';
}

function deterministicGenerate(prompt) {
  const intent = classifyIntent(prompt);
  const template = RULE_BASED_TEMPLATES[intent] || RULE_BASED_TEMPLATES.gmail_job_sheets_slack;
  const nodes = JSON.parse(JSON.stringify(template.nodes));
  const edges = JSON.parse(JSON.stringify(template.edges));
  const requiredIntegrations = extractRequiredIntegrations(nodes);
  const approvalRequired = nodes.some((n) => n.type === 'approvalGate');

  return {
    ...template,
    nodes,
    edges,
    requiredIntegrations,
    approvalRequired,
    provider: 'deterministic-fallback',
    intent
  };
}

// ── AI generation system prompt ──────────────────────────────────────────
function buildSystemPrompt() {
  return `You are HYRO, an AI workflow automation designer. 
When a user describes an automation task, you must return a valid JSON workflow object.

The workflow must exactly match this schema:
{
  "name": "string - concise workflow name",
  "description": "string - what this workflow does",
  "nodes": [
    {
      "id": "string - unique node ID (e.g. n1, n2...)",
      "type": "string - one of: gmailTrigger, scheduleTrigger, webhookTrigger, aiEmailClassifier, aiDetailExtractor, aiSummarizer, googleSheetsAppend, slackPostMessage, discordPostMessage, linkedinPost, conditionBranch, approvalGate",
      "position": { "x": number, "y": number },
      "data": { "label": "string", "nodeType": "string - same as type" },
      "config": {}
    }
  ],
  "edges": [
    {
      "id": "string - unique edge ID",
      "source": "string - source node id",
      "target": "string - target node id",
      "animated": true
    }
  ],
  "triggerConfig": { "type": "gmail|schedule|webhook|manual" },
  "requiredIntegrations": ["array of: gmail, google-sheets, slack, discord, linkedin"],
  "approvalRequired": false
}

Rules:
- Return ONLY valid JSON, no markdown, no explanation text.
- Node IDs must be unique.
- ALWAYS generate valid edges connecting nodes in sequence (e.g. n1 -> n2 -> n3 -> n4 -> n5).
- Edges must reference valid node IDs.
- Space nodes horizontally: x increases by ~250 per step, y=200 default.
- Include approvalGate node before linkedinPost if LinkedIn is involved.
- Never include unauthorized actions or credential bypasses.`;
}

// ── OpenRouter call ────────────────────────────────────────────────────────
async function callOpenRouter(prompt) {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hyro-automation.app',
      'X-Title': 'HYRO Automation'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: `Generate a workflow for: ${prompt}` }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned empty content');
  return { content, provider: 'openrouter' };
}

// ── Gemini call ────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildSystemPrompt() + '\n\nUser request: ' + prompt }
            ]
          }
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini returned empty content');
  return { content, provider: 'gemini' };
}

// ── Parse and clean AI JSON output ────────────────────────────────────────
function parseAIOutput(raw) {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

// ── Main generate function ─────────────────────────────────────────────────
async function generateWorkflow(prompt) {
  let result = null;
  let provider = 'unknown';

  // 1. Try OpenRouter
  if (env.OPENROUTER_API_KEY) {
    try {
      const { content, provider: p } = await callOpenRouter(prompt);
      result = parseAIOutput(content);
      provider = p;
    } catch (err) {
      console.warn(`[AI Service] OpenRouter failed: ${err.message}. Trying Gemini...`);
    }
  }

  // 2. Try Gemini fallback
  if (!result && env.GEMINI_API_KEY) {
    try {
      const { content, provider: p } = await callGemini(prompt);
      result = parseAIOutput(content);
      provider = p;
    } catch (err) {
      console.warn(`[AI Service] Gemini failed: ${err.message}. Using deterministic fallback.`);
    }
  }

  // 3. Deterministic rule-based fallback
  if (!result) {
    result = deterministicGenerate(prompt);
    provider = 'deterministic-fallback';
  }

  // Guarantee valid connected edges if ever missing or empty
  if (result && Array.isArray(result.nodes) && (!Array.isArray(result.edges) || result.edges.length === 0) && result.nodes.length > 1) {
    result.edges = [];
    for (let i = 0; i < result.nodes.length - 1; i++) {
      result.edges.push({
        id: `e-${result.nodes[i].id}-${result.nodes[i+1].id}`,
        source: result.nodes[i].id,
        target: result.nodes[i+1].id,
        animated: true
      });
    }
  }

  return { ...result, provider };
}

module.exports = {
  generateWorkflow,
  deterministicGenerate,
  classifyIntent,
  parseAIOutput,
  RULE_BASED_TEMPLATES
};
