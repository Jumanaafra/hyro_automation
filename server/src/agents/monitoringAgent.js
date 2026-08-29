/**
 * Monitoring Agent
 * Responsibilities:
 * - Emit timeline events for live UI streams
 * - Record agent logs and execution state
 * - Format audit logs
 */

const ExecutionLog = require('../models/ExecutionLog');
const { getDbStatus } = require('../config/db');
const socketService = require('../services/socketService');

// In-memory logs fallback store
const inMemoryLogs = new Map();
let nextLogId = 1;

class MonitoringAgent {
  async logEvent({ executionId, workflowId, nodeId = null, agent, level = 'info', message, metadata = {} }) {
    const timestamp = new Date();
    const eventData = {
      executionId: String(executionId),
      workflowId: String(workflowId),
      nodeId: nodeId ? String(nodeId) : null,
      agent,
      level,
      message,
      metadata,
      timestamp
    };

    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      await ExecutionLog.create(eventData);
    } else {
      const id = String(nextLogId++);
      inMemoryLogs.set(id, { _id: id, ...eventData });
    }

    // Stream live to Socket.IO subscribers
    try {
      socketService.emitExecutionEvent(String(executionId), 'execution:log', eventData);
      if (nodeId) {
        socketService.emitExecutionEvent(String(executionId), 'node:status', {
          nodeId: String(nodeId),
          status: level === 'error' ? 'failed' : level === 'warn' ? 'warning' : 'completed',
          agent,
          message
        });
      }
    } catch (e) {
      // Non-blocking socket emission
    }

    return eventData;
  }

  async getExecutionLogs(executionId) {
    const execIdStr = String(executionId);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await ExecutionLog.find({ executionId: execIdStr }).sort({ timestamp: 1 });
    }

    return Array.from(inMemoryLogs.values())
      .filter((l) => String(l.executionId) === execIdStr)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  clearInMemoryStore() {
    inMemoryLogs.clear();
    nextLogId = 1;
  }
}

module.exports = new MonitoringAgent();
