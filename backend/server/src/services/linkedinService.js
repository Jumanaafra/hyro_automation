/**
 * LinkedIn Service
 * AI content generation, RAG grounding, approval workflow, scheduling, publishing
 */
const LinkedInPost = require('../models/LinkedInPost');
const { getDbStatus } = require('../config/db');
const linkedinIntegration = require('../integrations/linkedinIntegration');
const integrationService = require('./integrationService');

// In-memory fallback store
const inMemoryPosts = new Map();
let nextPostId = 1;

class LinkedInService {
  // ── Content Generation ───────────────────────────────────────────────────────
  generateContent(prompt, ragContext = null) {
    const ragPrefix = ragContext
      ? `Based on: "${ragContext.slice(0, 120)}...", `
      : '';

    const templates = [
      `${ragPrefix}🚀 Excited to share my journey on "${prompt}". Every challenge is a stepping stone to mastery. #Growth #Innovation`,
      `${ragPrefix}💡 Just completed a deep dive into: "${prompt}". Here's what I learned and how it's shaping my work. #Learning #Tech`,
      `${ragPrefix}🎯 "${prompt}" — Three key takeaways from my recent project that changed how I approach problem-solving. #Professional`
    ];

    const content = templates[Math.floor(Math.random() * templates.length)];
    return {
      content,
      ragGrounded: !!ragContext,
      ragSources: ragContext ? ['uploaded-document'] : [],
      editable: true
    };
  }

  validateContent(content) {
    // Unsupported claim protection — flag unverifiable superlatives
    const unsupportedPhrases = ['#1 in the world', 'best in class', 'proven to cure', 'guaranteed'];
    const flagged = unsupportedPhrases.filter((p) => content.toLowerCase().includes(p));
    return {
      valid: flagged.length === 0,
      flagged,
      warning: flagged.length > 0 ? `Unsupported claims detected: ${flagged.join(', ')}` : null
    };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  async create(owner, { content, ragGrounded = false, ragSources = [] }) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return LinkedInPost.create({ owner: String(owner), content, ragGrounded, ragSources, status: 'DRAFT' });
    }
    const id = String(nextPostId++);
    const doc = { _id: id, owner: String(owner), content, ragGrounded, ragSources, status: 'DRAFT', publishAttempts: 0, createdAt: new Date(), updatedAt: new Date() };
    inMemoryPosts.set(id, doc);
    return doc;
  }

  async findByOwner(owner) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return LinkedInPost.find({ owner: String(owner) }).sort({ createdAt: -1 });
    }
    return Array.from(inMemoryPosts.values()).filter((p) => p.owner === String(owner));
  }

  async findById(owner, id) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return LinkedInPost.findOne({ _id: id, owner: String(owner) });
    }
    const doc = inMemoryPosts.get(id);
    return doc?.owner === String(owner) ? doc : null;
  }

  async updateStatus(owner, id, status, extra = {}) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return LinkedInPost.findOneAndUpdate({ _id: id, owner: String(owner) }, { status, ...extra, updatedAt: new Date() }, { new: true });
    }
    const doc = inMemoryPosts.get(id);
    if (!doc || doc.owner !== String(owner)) return null;
    Object.assign(doc, { status, ...extra, updatedAt: new Date() });
    return doc;
  }

  // ── Approval Workflow ────────────────────────────────────────────────────────
  async submitForApproval(owner, id) {
    return this.updateStatus(owner, id, 'PENDING_APPROVAL');
  }

  async approve(owner, id) {
    return this.updateStatus(owner, id, 'APPROVED', { approvedAt: new Date(), approvedBy: String(owner) });
  }

  async cancel(owner, id) {
    return this.updateStatus(owner, id, 'CANCELLED');
  }

  // ── Scheduling ───────────────────────────────────────────────────────────────
  async schedule(owner, id, scheduledAt) {
    const post = await this.findById(owner, id);
    if (!post) throw Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' });
    if (post.status !== 'APPROVED') throw Object.assign(new Error('Post must be APPROVED before scheduling'), { code: 'INVALID_STATUS' });
    return this.updateStatus(owner, id, 'SCHEDULED', { scheduledAt: new Date(scheduledAt) });
  }

  async reschedule(owner, id, newScheduledAt) {
    const post = await this.findById(owner, id);
    if (!post) throw Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' });
    return this.updateStatus(owner, id, 'SCHEDULED', { scheduledAt: new Date(newScheduledAt) });
  }

  // ── Publishing ───────────────────────────────────────────────────────────────
  async publish(owner, id) {
    const post = await this.findById(owner, id);
    if (!post) throw Object.assign(new Error('Post not found'), { code: 'NOT_FOUND' });
    if (post.status === 'PUBLISHED') {
      throw Object.assign(new Error('Post already published — duplicate prevention active'), { code: 'DUPLICATE_PUBLISH' });
    }
    if (post.status !== 'APPROVED' && post.status !== 'SCHEDULED') {
      throw Object.assign(new Error('Post must be APPROVED or SCHEDULED to publish'), { code: 'INVALID_STATUS' });
    }

    const credentials = await integrationService.getDecryptedTokens(owner, 'linkedin');
    const attemptCount = (post.publishAttempts || 0) + 1;
    try {
      const result = await linkedinIntegration.publishPost(credentials, { content: post.content });
      return this.updateStatus(owner, id, 'PUBLISHED', {
        publishedAt: new Date(),
        publishedId: result.id,
        publishAttempts: attemptCount
      });
    } catch (err) {
      await this.updateStatus(owner, id, 'FAILED', { failureReason: err.message, publishAttempts: attemptCount });
      throw err;
    }
  }

  // ── Calendar ─────────────────────────────────────────────────────────────────
  async getCalendar(owner, { view = 'week', date = new Date() } = {}) {
    const posts = await this.findByOwner(owner);
    const scheduled = posts.filter((p) => p.scheduledAt);

    const startDate = new Date(date);
    const endDate = new Date(date);
    if (view === 'week') {
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    }

    const filtered = scheduled.filter((p) => {
      const d = new Date(p.scheduledAt);
      return d >= startDate && d <= endDate;
    });

    return { view, startDate, endDate, posts: filtered, count: filtered.length };
  }

  clearInMemoryStore() {
    inMemoryPosts.clear();
    nextPostId = 1;
  }
}

module.exports = new LinkedInService();
