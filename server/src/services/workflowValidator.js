/**
 * Workflow Schema Validator
 * Validates AI-generated workflow output before saving or execution.
 */

const VALID_NODE_TYPES = new Set([
  'gmailTrigger', 'scheduleTrigger', 'webhookTrigger',
  'aiEmailClassifier', 'aiDetailExtractor', 'aiSummarizer',
  'googleSheetsAppend', 'slackPostMessage', 'discordPostMessage',
  'linkedinPost', 'conditionBranch', 'approvalGate',
  'trigger', 'action', 'condition', 'ai', 'integration', 'custom'
]);

const VALID_INTEGRATIONS = new Set([
  'gmail', 'google-sheets', 'slack', 'discord', 'linkedin',
  'openrouter', 'gemini'
]);

/**
 * Validates an AI-generated workflow structure.
 * Throws with a descriptive error on any violation.
 */
function validateGeneratedWorkflow(workflow) {
  if (!workflow || typeof workflow !== 'object') {
    throw Object.assign(new Error('Workflow output is not a valid object'), { code: 'INVALID_SCHEMA' });
  }

  if (!workflow.name || typeof workflow.name !== 'string' || !workflow.name.trim()) {
    throw Object.assign(new Error('Generated workflow missing required field: name'), { code: 'MISSING_NAME' });
  }

  if (!Array.isArray(workflow.nodes)) {
    throw Object.assign(new Error('Generated workflow missing required field: nodes (must be array)'), { code: 'MISSING_NODES' });
  }

  if (!Array.isArray(workflow.edges)) {
    throw Object.assign(new Error('Generated workflow missing required field: edges (must be array)'), { code: 'MISSING_EDGES' });
  }

  if (workflow.nodes.length === 0) {
    throw Object.assign(new Error('Generated workflow must have at least one node'), { code: 'EMPTY_NODES' });
  }

  // Validate unique node IDs
  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      throw Object.assign(new Error('Each node must have a string id'), { code: 'INVALID_NODE_ID' });
    }
    if (nodeIds.has(node.id)) {
      throw Object.assign(new Error(`Duplicate node id detected: ${node.id}`), { code: 'DUPLICATE_NODE_ID' });
    }
    nodeIds.add(node.id);

    if (!node.type || typeof node.type !== 'string') {
      throw Object.assign(new Error(`Node ${node.id} is missing a valid type`), { code: 'INVALID_NODE_TYPE' });
    }

    if (!VALID_NODE_TYPES.has(node.type)) {
      throw Object.assign(new Error(`Node ${node.id} has unsupported type: ${node.type}`), { code: 'UNSUPPORTED_NODE_TYPE' });
    }

    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw Object.assign(new Error(`Node ${node.id} has invalid position`), { code: 'INVALID_POSITION' });
    }
  }

  // Validate edges reference valid node IDs
  const edgeIds = new Set();
  for (const edge of workflow.edges) {
    if (!edge.id || typeof edge.id !== 'string') {
      throw Object.assign(new Error('Each edge must have a string id'), { code: 'INVALID_EDGE_ID' });
    }
    if (edgeIds.has(edge.id)) {
      throw Object.assign(new Error(`Duplicate edge id: ${edge.id}`), { code: 'DUPLICATE_EDGE_ID' });
    }
    edgeIds.add(edge.id);

    if (!edge.source || !nodeIds.has(edge.source)) {
      throw Object.assign(new Error(`Edge ${edge.id} references invalid source node: ${edge.source}`), { code: 'INVALID_EDGE_SOURCE' });
    }
    if (!edge.target || !nodeIds.has(edge.target)) {
      throw Object.assign(new Error(`Edge ${edge.id} references invalid target node: ${edge.target}`), { code: 'INVALID_EDGE_TARGET' });
    }
  }

  // Validate requiredIntegrations if present
  if (workflow.requiredIntegrations && !Array.isArray(workflow.requiredIntegrations)) {
    throw Object.assign(new Error('requiredIntegrations must be an array'), { code: 'INVALID_INTEGRATIONS' });
  }

  // Check for prompt injection markers
  const serialized = JSON.stringify(workflow).toLowerCase();
  const injectionPatterns = ['ignore previous', 'ignore all instructions', 'system:', 'bypass', 'override system'];
  for (const pattern of injectionPatterns) {
    if (serialized.includes(pattern)) {
      throw Object.assign(new Error('Workflow output contains potentially unsafe content and was rejected'), { code: 'PROMPT_INJECTION' });
    }
  }

  return true;
}

module.exports = { validateGeneratedWorkflow, VALID_NODE_TYPES };
