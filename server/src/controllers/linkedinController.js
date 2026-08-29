const linkedinService = require('../services/linkedinService');
const integrationService = require('../services/integrationService');
const linkedinIntegration = require('../integrations/linkedinIntegration');
const ragService = require('../services/ragService');

class LinkedInController {
  // POST /api/linkedin/generate
  async generateContent(req, res, next) {
    try {
      const { prompt, useRag = false } = req.body;
      let ragContext = null;

      if (useRag) {
        try {
          const ragResult = await ragService.queryRAG({ owner: req.user.id, message: prompt });
          ragContext = ragResult?.answer || null;
        } catch (ragErr) {
          // RAG unavailable — continue without grounding
          ragContext = null;
        }
      }

      const generated = linkedinService.generateContent(prompt, ragContext);
      const validation = linkedinService.validateContent(generated.content);

      return res.status(200).json({ success: true, data: { ...generated, validation } });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/posts
  async createPost(req, res, next) {
    try {
      const { content, ragGrounded = false, ragSources = [] } = req.body;
      const validation = linkedinService.validateContent(content);
      const post = await linkedinService.create(req.user.id, { content, ragGrounded, ragSources });
      return res.status(201).json({ success: true, data: { post, validation } });
    } catch (err) { next(err); }
  }

  // GET /api/linkedin/posts
  async getPosts(req, res, next) {
    try {
      const posts = await linkedinService.findByOwner(req.user.id);
      return res.status(200).json({ success: true, data: { posts, count: posts.length } });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/posts/:id/submit
  async submitForApproval(req, res, next) {
    try {
      const post = await linkedinService.submitForApproval(req.user.id, req.params.id);
      return res.status(200).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/posts/:id/approve
  async approve(req, res, next) {
    try {
      const post = await linkedinService.approve(req.user.id, req.params.id);
      return res.status(200).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/posts/:id/schedule
  async schedule(req, res, next) {
    try {
      const { scheduledAt } = req.body;
      const post = await linkedinService.schedule(req.user.id, req.params.id, scheduledAt);
      return res.status(200).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }

  // PATCH /api/linkedin/posts/:id/schedule
  async reschedule(req, res, next) {
    try {
      const { scheduledAt } = req.body;
      const post = await linkedinService.reschedule(req.user.id, req.params.id, scheduledAt);
      return res.status(200).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/posts/:id/cancel
  async cancel(req, res, next) {
    try {
      const post = await linkedinService.cancel(req.user.id, req.params.id);
      return res.status(200).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/posts/:id/publish
  async publish(req, res, next) {
    try {
      const post = await linkedinService.publish(req.user.id, req.params.id);
      return res.status(200).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }

  // GET /api/linkedin/calendar?view=week&date=...
  async getCalendar(req, res, next) {
    try {
      const { view = 'week', date } = req.query;
      const calendar = await linkedinService.getCalendar(req.user.id, { view, date: date ? new Date(date) : new Date() });
      return res.status(200).json({ success: true, data: calendar });
    } catch (err) { next(err); }
  }

  // POST /api/linkedin/validate
  async validateContent(req, res, next) {
    try {
      const { content } = req.body;
      const result = linkedinService.validateContent(content);
      return res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}

module.exports = new LinkedInController();
