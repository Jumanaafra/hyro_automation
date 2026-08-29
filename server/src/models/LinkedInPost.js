const mongoose = require('mongoose');

const linkedInPostSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true, index: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED'],
      default: 'DRAFT'
    },
    ragGrounded: { type: Boolean, default: false },
    ragSources: [{ type: String }],
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    publishedId: { type: String, default: null }, // LinkedIn URN
    failureReason: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: null },
    publishAttempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Prevent duplicate publishing — once published, block re-publish
linkedInPostSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'PUBLISHED' && this.publishAttempts > 1) {
    const err = new Error('Duplicate publish attempt blocked');
    err.code = 'DUPLICATE_PUBLISH';
    return next(err);
  }
  next();
});

module.exports = mongoose.model('LinkedInPost', linkedInPostSchema);
