const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    provider: {
      type: String,
      enum: ['gmail', 'google-sheets', 'slack', 'discord', 'linkedin', 'openrouter', 'gemini'],
      required: true
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    scopes: [{ type: String }],
    encryptedTokens: {
      type: String,
      default: null,
      select: false // Never return tokens by default in queries
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

integrationSchema.index({ owner: 1, provider: 1 }, { unique: true });

module.exports =
  mongoose.models.Integration || mongoose.model('Integration', integrationSchema);
