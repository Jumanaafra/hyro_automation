const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sources: [
      {
        documentName: String,
        chunkIndex: Number,
        snippet: String
      }
    ],
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const chatConversationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    title: {
      type: String,
      default: 'New Conversation'
    },
    messages: [messageSchema]
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.ChatConversation ||
  mongoose.model('ChatConversation', chatConversationSchema);
