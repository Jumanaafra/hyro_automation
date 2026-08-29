const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true
    },
    embedding: [
      {
        type: Number
      }
    ],
    chunkIndex: {
      type: Number,
      required: true
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
  mongoose.models.KnowledgeChunk ||
  mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
