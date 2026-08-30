const mongoose = require('mongoose');

const executionLogSchema = new mongoose.Schema(
  {
    executionId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    workflowId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    nodeId: {
      type: String,
      default: null
    },
    agent: {
      type: String,
      enum: ['planner', 'execution', 'validation', 'recovery', 'monitoring', 'orchestrator'],
      required: true
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info'
    },
    message: {
      type: String,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.ExecutionLog ||
  mongoose.model('ExecutionLog', executionLogSchema);
