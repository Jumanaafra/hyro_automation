const workflowRepository = require('./workflowRepository');
const aiService = require('./aiService');
const { validateGeneratedWorkflow } = require('./workflowValidator');

// Valid node types per the SDD
const VALID_NODE_TYPES = new Set([
  'gmailTrigger',
  'scheduleTrigger',
  'webhookTrigger',
  'aiEmailClassifier',
  'aiDetailExtractor',
  'aiSummarizer',
  'googleSheetsAppend',
  'slackPostMessage',
  'discordPostMessage',
  'linkedinPost',
  'conditionBranch',
  'approvalGate',
  // Generic fallback type for builder
  'trigger',
  'action',
  'condition',
  'ai',
  'integration',
  'custom'
]);

class WorkflowService {
  /**
   * Validate graph structure before persist/execute.
   */
  validateGraph(nodes, edges) {
    if (!Array.isArray(nodes)) throw Object.assign(new Error('nodes must be an array'), { statusCode: 400 });
    if (!Array.isArray(edges)) throw Object.assign(new Error('edges must be an array'), { statusCode: 400 });

    const nodeIds = new Set();
    for (const n of nodes) {
      if (!n.id) throw Object.assign(new Error('Each node must have an id'), { statusCode: 400 });
      if (nodeIds.has(n.id)) throw Object.assign(new Error(`Duplicate node id: ${n.id}`), { statusCode: 400 });
      nodeIds.add(n.id);
    }

    for (const e of edges) {
      if (!e.id) throw Object.assign(new Error('Each edge must have an id'), { statusCode: 400 });
      if (!e.source || !nodeIds.has(e.source))
        throw Object.assign(new Error(`Edge ${e.id} references unknown source node: ${e.source}`), { statusCode: 400 });
      if (!e.target || !nodeIds.has(e.target))
        throw Object.assign(new Error(`Edge ${e.id} references unknown target node: ${e.target}`), { statusCode: 400 });
    }
    return true;
  }

  async createWorkflow({ name, description, owner, nodes = [], edges = [], triggerConfig = {}, tags = [] }) {
    if (!name || !name.trim()) {
      throw Object.assign(new Error('Workflow name is required'), { statusCode: 400 });
    }
    if (nodes.length > 0 || edges.length > 0) {
      this.validateGraph(nodes, edges);
    }

    const workflow = await workflowRepository.create({
      name: name.trim(),
      description: description || '',
      owner: String(owner),
      nodes,
      edges,
      triggerConfig,
      tags,
      version: 1,
      status: 'draft'
    });

    return workflow;
  }

  async getUserWorkflows(ownerId) {
    return await workflowRepository.findAllByOwner(ownerId);
  }

  async getWorkflowById(id, ownerId) {
    const workflow = await workflowRepository.findByIdAndOwner(id, ownerId);
    if (!workflow) {
      throw Object.assign(new Error('Workflow not found or access denied'), { statusCode: 404 });
    }
    return workflow;
  }

  async updateWorkflow(id, ownerId, updates) {
    // Re-validate graph if nodes/edges provided
    const nodesToValidate = updates.nodes;
    const edgesToValidate = updates.edges;
    if (nodesToValidate !== undefined || edgesToValidate !== undefined) {
      const existing = await this.getWorkflowById(id, ownerId);
      this.validateGraph(
        nodesToValidate !== undefined ? nodesToValidate : existing.nodes,
        edgesToValidate !== undefined ? edgesToValidate : existing.edges
      );
    }

    // Determine if this is a structural update (nodes or edges changed)
    const isStructural = updates.nodes !== undefined || updates.edges !== undefined;

    // Build clean update payload — never pass $inc:undefined
    const payload = { ...updates };
    if (isStructural) {
      const existing = await this.getWorkflowById(id, ownerId);
      payload.version = (existing.version || 1) + 1;
    }

    const workflow = await workflowRepository.updateByIdAndOwner(id, ownerId, payload);

    if (!workflow) {
      throw Object.assign(new Error('Workflow not found or access denied'), { statusCode: 404 });
    }

    return workflow;
  }

  async duplicateWorkflow(id, ownerId) {
    const original = await this.getWorkflowById(id, ownerId);
    const clone = await workflowRepository.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      owner: String(ownerId),
      nodes: original.nodes || [],
      edges: original.edges || [],
      triggerConfig: original.triggerConfig || {},
      tags: original.tags || [],
      version: 1,
      status: 'draft'
    });
    return clone;
  }

  async deleteWorkflow(id, ownerId) {
    const workflow = await workflowRepository.deleteByIdAndOwner(id, ownerId);
    if (!workflow) {
      throw Object.assign(new Error('Workflow not found or access denied'), { statusCode: 404 });
    }
    return { deleted: true, id };
  }

  async placeholderExecute(id, ownerId) {
    const workflow = await this.getWorkflowById(id, ownerId);

    // Create an immutable snapshot of the workflow state at this point in time
    const snapshot = {
      workflowId: String(workflow._id || id),
      workflowSnapshot: {
        name: workflow.name,
        nodes: workflow.nodes,
        edges: workflow.edges,
        version: workflow.version
      },
      status: 'PENDING',
      startTime: new Date().toISOString(),
      message: 'Placeholder execution — agentic execution engine available in Phase 5.'
    };

    return snapshot;
  }

  async generateWorkflowFromPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw Object.assign(new Error('Prompt is required for workflow generation'), { statusCode: 400 });
    }

    // 1. Generate via AI pipeline (OpenRouter -> Gemini -> Deterministic Fallback)
    const generated = await aiService.generateWorkflow(prompt.trim());

    // 2. Validate schema & graph safety
    validateGeneratedWorkflow(generated);

    return generated;
  }

  async getDashboardMetrics(ownerId) {
    const workflows = await workflowRepository.findAllByOwner(ownerId);
    const total = workflows.length;
    const active = workflows.filter((w) => w.status === 'active').length;
    const draft = workflows.filter((w) => w.status === 'draft').length;
    const recent = workflows.slice(0, 5);

    return {
      total,
      active,
      draft,
      recent
    };
  }
}

module.exports = new WorkflowService();
