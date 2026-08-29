const ragService = require('../services/ragService');

class ChatController {
  async query(req, res, next) {
    try {
      const { message, conversationId } = req.body;
      const result = await ragService.queryRAG({
        owner: req.user.id,
        conversationId,
        message
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async getConversations(req, res, next) {
    try {
      const conversations = await ragService.getConversations(req.user.id);
      return res.status(200).json({ success: true, data: { conversations } });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const conversation = await ragService.getConversationById(req.params.id, req.user.id);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
      }
      return res.status(200).json({ success: true, data: { conversation } });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await ragService.deleteConversation(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}

module.exports = new ChatController();
