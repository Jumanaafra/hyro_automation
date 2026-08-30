const workflowService = require('../services/workflowService');

class WorkflowController {
  async getDashboard(req, res, next) {
    try {
      const metrics = await workflowService.getDashboardMetrics(req.user.id);
      return res.status(200).json({ success: true, data: metrics });
    } catch (err) { next(err); }
  }

  async getAll(req, res, next) {
    try {
      const workflows = await workflowService.getUserWorkflows(req.user.id);
      return res.status(200).json({ success: true, data: { workflows, count: workflows.length } });
    } catch (err) { next(err); }
  }

  async generate(req, res, next) {
    try {
      const { prompt } = req.body;
      const result = await workflowService.generateWorkflowFromPrompt(prompt);
      return res.status(200).json({
        success: true,
        message: 'Workflow generated successfully',
        data: {
          workflow: result,
          ...result
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name, description, nodes, edges, triggerConfig, tags } = req.body;
      const workflow = await workflowService.createWorkflow({
        name, description, owner: req.user.id, nodes, edges, triggerConfig, tags
      });
      return res.status(201).json({ success: true, data: { workflow } });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const workflow = await workflowService.getWorkflowById(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: { workflow } });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { name, description, nodes, edges, triggerConfig, tags, status } = req.body;
      const workflow = await workflowService.updateWorkflow(req.params.id, req.user.id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(triggerConfig !== undefined && { triggerConfig }),
        ...(tags !== undefined && { tags }),
        ...(status !== undefined && { status })
      });
      return res.status(200).json({ success: true, data: { workflow } });
    } catch (err) { next(err); }
  }

  async duplicate(req, res, next) {
    try {
      const clone = await workflowService.duplicateWorkflow(req.params.id, req.user.id);
      return res.status(201).json({ success: true, data: { workflow: clone } });
    } catch (err) { next(err); }
  }

  async execute(req, res, next) {
    try {
      const executionService = require('../services/executionService');
      const result = await executionService.startExecution(req.params.id, req.user.id, req.body.inputs || {});
      const execObj = result && typeof result.toObject === 'function' ? result.toObject() : (result || {});
      return res.status(200).json({
        success: true,
        message: 'Workflow execution started',
        data: {
          execution: execObj,
          _id: execObj._id,
          id: execObj._id,
          ...execObj
        }
      });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await workflowService.deleteWorkflow(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}

module.exports = new WorkflowController();
