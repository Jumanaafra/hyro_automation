const mongoose = require('mongoose');

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Document must belong to an owner'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['pdf', 'markdown', 'txt', 'note'],
      default: 'txt'
    },
    source: {
      type: String,
      default: 'upload'
    },
    status: {
      type: String,
      enum: ['processing', 'indexed', 'failed'],
      default: 'processing'
    },
    chunkCount: {
      type: Number,
      default: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.KnowledgeDocument ||
  mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
