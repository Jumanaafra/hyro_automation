/**
 * Orchestrator Engine
 * Coordinates Planner, Execution, Validation, Recovery, and Monitoring agents.
 * Manages full execution lifecycle: PENDING -> RUNNING -> COMPLETED / FAILED / RETRYING / PAUSED / CANCELLED
 * Reports: langGraph: "available" | "not-installed"
 */

const plannerAgent = require('./plannerAgent');
const executionAgent = require('./executionAgent');
const validationAgent = require('./validationAgent');
const recoveryAgent = require('./recoveryAgent');
const monitoringAgent = require('./monitoringAgent');
const Execution = require('../models/Execution');
const { getDbStatus } = require('../config/db');

// Check LangGraph availability
let langGraphStatus = 'not-installed';
try {
  require('@langchain/langgraph');
  langGraphStatus = 'available';
} catch (e) {
  langGraphStatus = 'not-installed';
}

// In-memory fallback for execution store
const inMemoryExecutions = new Map();
let nextExecId = 1;

class Orchestrator {
  getLangGraphStatus() {
    return langGraphStatus;
  }

  async createExecution({ workflow, owner, inputs = {} }) {
    const now = new Date();
    // Save immutable snapshot at runtime
    const snapshot = {
      name: workflow.name,
      nodes: JSON.parse(JSON.stringify(workflow.nodes || [])),
      edges: JSON.parse(JSON.stringify(workflow.edges || [])),
      version: workflow.version || 1
    };

    const dbStatus = getDbStatus();
    let exec;

    if (dbStatus.isConnected) {
      exec = await Execution.create({
        workflowId: String(workflow._id),
        owner: String(owner),
        workflowSnapshot: snapshot,
        status: 'PENDING',
        inputs,
        startTime: now
      });
    } else {
      const id = String(nextExecId++);
      exec = {
        _id: id,
        workflowId: String(workflow._id),
        owner: String(owner),
        workflowSnapshot: snapshot,
        status: 'PENDING',
        currentNode: null,
        startTime: now,
        endTime: null,
        duration: 0,
        inputs,
        outputs: {},
        error: null,
        retryCount: 0,
        createdAt: now,
        updatedAt: now
      };
      inMemoryExecutions.set(id, exec);
    }

    return exec;
  }

  async runExecution(executionId, ownerId) {
    let exec = await this.getExecutionById(executionId, ownerId);
    if (!exec) throw new Error('Execution not found or access denied');

    const execId = String(exec._id);
    const wfId = String(exec.workflowId);
    const snapshot = exec.workflowSnapshot;

    // 1. Mark status RUNNING
    await this._updateStatus(execId, ownerId, 'RUNNING');
    await monitoringAgent.logEvent({
      executionId: execId,
      workflowId: wfId,
      agent: 'orchestrator',
      level: 'info',
      message: `Execution started. LangGraph substrate: ${langGraphStatus}`,
      metadata: { langGraph: langGraphStatus }
    });

    // 2. Planner Agent — Generate plan
    const planResult = plannerAgent.planExecution(snapshot.nodes, snapshot.edges);
    await monitoringAgent.logEvent({
      executionId: execId,
      workflowId: wfId,
      agent: 'planner',
      level: planResult.hasCycle ? 'warn' : 'info',
      message: `Planned execution order: [${planResult.executionPlan.join(' → ')}]. Confidence: ${planResult.confidenceScore}`,
      metadata: planResult
    });

    if (planResult.hasCycle) {
      await this._updateStatus(execId, ownerId, 'FAILED', { error: 'Cycle detected in workflow graph' });
      return await this.getExecutionById(execId, ownerId);
    }

    // Map nodes for lookup
    const nodeMap = new Map(snapshot.nodes.map((n) => [n.id, n]));
    const outputs = {};

    // 3. Sequential Node Execution loop
    for (const nodeId of planResult.executionPlan) {
      // Re-fetch execution to check if user paused or cancelled
      const currentExec = await this.getExecutionById(execId, ownerId);
      if (currentExec.status === 'PAUSED' || currentExec.status === 'CANCELLED') {
        await monitoringAgent.logEvent({
          executionId: execId,
          workflowId: wfId,
          nodeId,
          agent: 'orchestrator',
          level: 'warn',
          message: `Execution halted. Status is ${currentExec.status}`
        });
        return currentExec;
      }

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      await this._updateCurrentNode(execId, ownerId, nodeId);

      // Execution Agent with real context
      const execResult = await executionAgent.executeNode(node, outputs, {
        ownerId,
        executionId: execId,
        workflowId: wfId,
        inputs: exec.inputs || {},
        execution: currentExec
      });

      await monitoringAgent.logEvent({
        executionId: execId,
        workflowId: wfId,
        nodeId,
        agent: 'execution',
        level: 'info',
        message: `Node ${nodeId} (${node.type}) executed in ${execResult.duration}ms`,
        metadata: execResult.output
      });

      // Handle Approval Gate pause
      if (execResult.status === 'WAITING_FOR_APPROVAL' || execResult.output?.status === 'WAITING_FOR_APPROVAL') {
        outputs[nodeId] = execResult.output;
        await this._updateStatus(execId, ownerId, 'WAITING_FOR_APPROVAL', {
          currentNode: nodeId,
          outputs
        });
        await monitoringAgent.logEvent({
          executionId: execId,
          workflowId: wfId,
          nodeId,
          agent: 'orchestrator',
          level: 'warn',
          message: `Execution paused: Awaiting human approval at node ${nodeId} (${node.type})`
        });
        return await this.getExecutionById(execId, ownerId);
      }

      // Validation Agent
      const valResult = validationAgent.validateOutput(node, execResult);
      await monitoringAgent.logEvent({
        executionId: execId,
        workflowId: wfId,
        nodeId,
        agent: 'validation',
        level: valResult.isValid ? 'info' : 'error',
        message: `Validation for ${nodeId}: ${valResult.reason}`,
        metadata: valResult
      });

      if (!valResult.isValid) {
        // Recovery Agent
        const recoveryDecision = recoveryAgent.classifyAndDecide(valResult.errorCategory, currentExec.retryCount || 0);
        await monitoringAgent.logEvent({
          executionId: execId,
          workflowId: wfId,
          nodeId,
          agent: 'recovery',
          level: 'warn',
          message: `Recovery Decision: ${recoveryDecision.decision} — ${recoveryDecision.reason}`,
          metadata: recoveryDecision
        });

        if (recoveryDecision.decision === 'RETRY') {
          await this._updateStatus(execId, ownerId, 'RETRYING', { retryCount: recoveryDecision.retryCount });
          // Retry step after backoff
          await this._updateStatus(execId, ownerId, 'RUNNING');
        } else {
          // Escalation / Fail
          await this._updateStatus(execId, ownerId, 'FAILED', { error: valResult.reason });
          await monitoringAgent.logEvent({
            executionId: execId,
            workflowId: wfId,
            nodeId,
            agent: 'monitoring',
            level: 'error',
            message: `Workflow execution failed at node ${nodeId}: ${valResult.reason}`
          });
          return await this.getExecutionById(execId, ownerId);
        }
      }

      outputs[nodeId] = execResult.output;
    }

    // 4. Mark COMPLETED
    const endTime = new Date();
    const duration = endTime - new Date(exec.startTime);
    await this._updateStatus(execId, ownerId, 'COMPLETED', {
      endTime,
      duration,
      outputs,
      currentNode: null
    });

    await monitoringAgent.logEvent({
      executionId: execId,
      workflowId: wfId,
      agent: 'monitoring',
      level: 'info',
      message: `Workflow execution completed successfully in ${duration}ms`,
      metadata: { duration }
    });

    return await this.getExecutionById(execId, ownerId);
  }

  async approveExecution(executionId, ownerId, { nodeId = null } = {}) {
    const exec = await this.getExecutionById(executionId, ownerId);
    if (!exec) throw new Error('Execution not found or access denied');
    if (exec.status !== 'WAITING_FOR_APPROVAL') throw new Error('Execution is not waiting for approval');

    const approvedNodes = exec.approvedNodes || {};
    if (nodeId || exec.currentNode) {
      approvedNodes[nodeId || exec.currentNode] = true;
    }

    await this._updateStatus(executionId, ownerId, 'RUNNING', { approvedNodes });
    // Continue running in background
    this.runExecution(executionId, ownerId).catch(console.error);
    return await this.getExecutionById(executionId, ownerId);
  }

  async rejectExecution(executionId, ownerId, { reason = 'Rejected by user' } = {}) {
    const exec = await this.getExecutionById(executionId, ownerId);
    if (!exec) throw new Error('Execution not found or access denied');
    return await this._updateStatus(executionId, ownerId, 'CANCELLED', { error: reason });
  }

  async pauseExecution(executionId, ownerId) {
    return await this._updateStatus(executionId, ownerId, 'PAUSED');
  }

  async resumeExecution(executionId, ownerId) {
    const exec = await this.getExecutionById(executionId, ownerId);
    if (!exec) throw new Error('Execution not found or access denied');
    if (exec.status !== 'PAUSED') throw new Error('Execution is not in PAUSED state');

    await this._updateStatus(executionId, ownerId, 'RUNNING');
    // Resume processing in background
    this.runExecution(executionId, ownerId).catch(console.error);
    return await this.getExecutionById(executionId, ownerId);
  }

  async cancelExecution(executionId, ownerId) {
    return await this._updateStatus(executionId, ownerId, 'CANCELLED');
  }

  async getExecutionById(id, ownerId) {
    const ownerStr = String(ownerId);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await Execution.findOne({ _id: id, owner: ownerStr });
    }

    const exec = inMemoryExecutions.get(String(id));
    if (!exec || String(exec.owner) !== ownerStr) return null;
    return exec;
  }

  async getUserExecutions(ownerId) {
    const ownerStr = String(ownerId);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await Execution.find({ owner: ownerStr }).sort({ createdAt: -1 });
    }

    return Array.from(inMemoryExecutions.values())
      .filter((e) => String(e.owner) === ownerStr)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async _updateStatus(id, ownerId, status, extra = {}) {
    const ownerStr = String(ownerId);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await Execution.findOneAndUpdate(
        { _id: id, owner: ownerStr },
        { status, ...extra, updatedAt: new Date() },
        { new: true }
      );
    }

    const exec = inMemoryExecutions.get(String(id));
    if (!exec || String(exec.owner) !== ownerStr) return null;
    const updated = { ...exec, status, ...extra, updatedAt: new Date() };
    inMemoryExecutions.set(String(id), updated);
    return updated;
  }

  async _updateCurrentNode(id, ownerId, currentNode) {
    return await this._updateStatus(id, ownerId, null, { currentNode });
  }

  clearInMemoryStore() {
    inMemoryExecutions.clear();
    nextExecId = 1;
    monitoringAgent.clearInMemoryStore();
  }
}

module.exports = new Orchestrator();
