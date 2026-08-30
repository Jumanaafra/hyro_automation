const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    workflowSnapshot: {
      name: String,
      nodes: Array,
      edges: Array,
      version: Number
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'PAUSED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    currentNode: {
      type: String,
      default: null
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number,
      default: 0
    },
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    outputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Execution || mongoose.model('Execution', executionSchema);
