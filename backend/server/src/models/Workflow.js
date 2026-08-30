const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    config: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const edgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    animated: { type: Boolean, default: true },
    type: { type: String, default: 'smoothstep' }
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    owner: {
      type: mongoose.Schema.Types.Mixed, // supports ObjectId or string for in-memory
      required: [true, 'Workflow must have an owner'],
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft'
    },
    triggerConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    version: {
      type: Number,
      default: 1
    },
    tags: [{ type: String }]
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);
