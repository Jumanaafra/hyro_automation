const notificationService = require('../services/notificationService');
const integrationService = require('../services/integrationService');
const slackIntegration = require('../integrations/slackIntegration');
const discordIntegration = require('../integrations/discordIntegration');

class NotificationController {
  // GET /api/notifications
  async getAll(req, res, next) {
    try {
      const notifications = await notificationService.getUserNotifications(req.user.id);
      return res.status(200).json({ success: true, data: { notifications, count: notifications.length } });
    } catch (err) { next(err); }
  }

  // PATCH /api/notifications/:id/read
  async markRead(req, res, next) {
    try {
      const notification = await notificationService.markRead(req.user.id, req.params.id);
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
      return res.status(200).json({ success: true, data: { notification } });
    } catch (err) { next(err); }
  }

  // POST /api/notifications/slack
  async sendSlack(req, res, next) {
    try {
      const { workflowName, type = 'SUCCESS', result, error, channel } = req.body;
      const notification = await notificationService.sendSlackNotification(req.user.id, {
        type, workflowName, result, error, channel
      });
      return res.status(201).json({ success: true, data: { notification } });
    } catch (err) { next(err); }
  }

  // POST /api/notifications/discord
  async sendDiscord(req, res, next) {
    try {
      const { workflowName, type = 'SUCCESS', result, error } = req.body;
      const notification = await notificationService.sendDiscordNotification(req.user.id, {
        type, workflowName, result, error
      });
      return res.status(201).json({ success: true, data: { notification } });
    } catch (err) { next(err); }
  }

  // POST /api/notifications/slack/test
  async testSlackMessage(req, res, next) {
    try {
      const { message, channel } = req.body;
      const credentials = await integrationService.getDecryptedTokens(req.user.id, 'slack');
      const result = await slackIntegration.postMessage(credentials, { channel: channel || '#general', text: message || 'HYRO test message 👋' });
      return res.status(200).json({ success: true, data: { result } });
    } catch (err) { next(err); }
  }

  // POST /api/notifications/discord/test
  async testDiscordMessage(req, res, next) {
    try {
      const { message } = req.body;
      const credentials = await integrationService.getDecryptedTokens(req.user.id, 'discord');
      const result = await discordIntegration.postMessage(credentials, { content: message || 'HYRO test message 👋' });
      return res.status(200).json({ success: true, data: { result } });
    } catch (err) { next(err); }
  }
}

module.exports = new NotificationController();
