const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING', 'INFO'],
      default: 'INFO'
    },
    provider: { type: String, enum: ['slack', 'discord', 'system', null], default: 'system' },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', default: null },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
