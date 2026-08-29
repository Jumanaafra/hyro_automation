const executionService = require('../services/executionService');

class ExecutionController {
  async getAll(req, res, next) {
    try {
      const executions = await executionService.getUserExecutions(req.user.id);
      return res.status(200).json({ success: true, data: { executions, count: executions.length } });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const execution = await executionService.getExecutionDetails(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: { execution } });
    } catch (err) { next(err); }
  }

  async getTimeline(req, res, next) {
    try {
      const timeline = await executionService.getExecutionTimeline(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: timeline });
    } catch (err) { next(err); }
  }

  async pause(req, res, next) {
    try {
      const execution = await executionService.pauseExecution(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: { execution } });
    } catch (err) { next(err); }
  }

  async resume(req, res, next) {
    try {
      const execution = await executionService.resumeExecution(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: { execution } });
    } catch (err) { next(err); }
  }

  async approve(req, res, next) {
    try {
      const execution = await executionService.approveExecution(req.params.id, req.user.id, req.body || {});
      return res.status(200).json({ success: true, data: { execution } });
    } catch (err) { next(err); }
  }

  async reject(req, res, next) {
    try {
      const execution = await executionService.rejectExecution(req.params.id, req.user.id, req.body || {});
      return res.status(200).json({ success: true, data: { execution } });
    } catch (err) { next(err); }
  }
}

module.exports = new ExecutionController();
