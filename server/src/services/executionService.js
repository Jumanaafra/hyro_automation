const orchestrator = require('../agents/orchestrator');
const workflowService = require('./workflowService');
const monitoringAgent = require('../agents/monitoringAgent');

class ExecutionService {
  async startExecution(workflowId, ownerId, inputs = {}) {
    const workflow = await workflowService.getWorkflowById(workflowId, ownerId);
    
    // 1. Create Execution record with immutable runtime snapshot
    const exec = await orchestrator.createExecution({ workflow, owner: ownerId, inputs });
    const execId = String(exec._id);

    // 2. Trigger asynchronous background run by orchestrator
    orchestrator.runExecution(execId, ownerId).catch((err) => {
      console.error(`[Execution Error] ${err.message}`);
    });

    return exec;
  }

  async getUserExecutions(ownerId) {
    return await orchestrator.getUserExecutions(ownerId);
  }

  async getExecutionDetails(executionId, ownerId) {
    const exec = await orchestrator.getExecutionById(executionId, ownerId);
    if (!exec) {
      throw Object.assign(new Error('Execution not found or access denied'), { statusCode: 404 });
    }
    return exec;
  }

  async getExecutionTimeline(executionId, ownerId) {
    // Verify ownership
    await this.getExecutionDetails(executionId, ownerId);
    const logs = await monitoringAgent.getExecutionLogs(executionId);
    return {
      executionId,
      langGraph: orchestrator.getLangGraphStatus(),
      events: logs
    };
  }

  async pauseExecution(executionId, ownerId) {
    return await orchestrator.pauseExecution(executionId, ownerId);
  }

  async resumeExecution(executionId, ownerId) {
    return await orchestrator.resumeExecution(executionId, ownerId);
  }

  async approveExecution(executionId, ownerId, options = {}) {
    return await orchestrator.approveExecution(executionId, ownerId, options);
  }

  async rejectExecution(executionId, ownerId, options = {}) {
    return await orchestrator.rejectExecution(executionId, ownerId, options);
  }
}

module.exports = new ExecutionService();
