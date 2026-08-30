/**
 * Notification Service
 * Persists notifications and delivers them via Slack or Discord
 */
const Notification = require('../models/Notification');
const { getDbStatus } = require('../config/db');
const slackIntegration = require('../integrations/slackIntegration');
const discordIntegration = require('../integrations/discordIntegration');
const integrationService = require('./integrationService');

// In-memory store fallback
const inMemoryNotifications = new Map();
let nextNotifId = 1;

class NotificationService {
  async _persist(owner, { title, message, type = 'INFO', provider = 'system', workflowId = null, metadata = {} }) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return Notification.create({ owner: String(owner), title, message, type, provider, workflowId, metadata });
    }
    const id = String(nextNotifId++);
    const doc = {
      _id: id,
      owner: String(owner),
      title,
      message,
      type,
      provider,
      workflowId,
      metadata,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryNotifications.set(id, doc);
    return doc;
  }

  async sendSlackNotification(owner, { type = 'INFO', workflowName, result, error, channel = '#general' }) {
    const credentials = await integrationService.getDecryptedTokens(owner, 'slack');
    let slackResult;
    let text;

    try {
      if (type === 'SUCCESS') {
        slackResult = await slackIntegration.sendSuccessNotification(credentials, { workflowName, result, channel });
        text = `Workflow "${workflowName}" succeeded: ${result}`;
      } else {
        slackResult = await slackIntegration.sendFailureNotification(credentials, { workflowName, error, channel });
        text = `Workflow "${workflowName}" failed: ${error}`;
      }
    } catch (err) {
      // Record the failure even if Slack delivery fails
      await this._persist(owner, {
        title: `Slack Delivery Failed`,
        message: err.message,
        type: 'FAILURE',
        provider: 'slack',
        metadata: { originalType: type, workflowName, errorCode: err.code }
      });
      throw err;
    }

    return this._persist(owner, {
      title: type === 'SUCCESS' ? `✅ ${workflowName} Succeeded` : `❌ ${workflowName} Failed`,
      message: text,
      type,
      provider: 'slack',
      metadata: { workflowName, slackTs: slackResult?.ts }
    });
  }

  async sendDiscordNotification(owner, { type = 'INFO', workflowName, result, error }) {
    const credentials = await integrationService.getDecryptedTokens(owner, 'discord');
    let discordResult;
    let text;

    try {
      if (type === 'SUCCESS') {
        discordResult = await discordIntegration.sendSuccessNotification(credentials, { workflowName, result });
        text = `Workflow "${workflowName}" succeeded: ${result}`;
      } else {
        discordResult = await discordIntegration.sendFailureNotification(credentials, { workflowName, error });
        text = `Workflow "${workflowName}" failed: ${error}`;
      }
    } catch (err) {
      await this._persist(owner, {
        title: `Discord Delivery Failed`,
        message: err.message,
        type: 'FAILURE',
        provider: 'discord',
        metadata: { originalType: type, workflowName, errorCode: err.code }
      });
      throw err;
    }

    return this._persist(owner, {
      title: type === 'SUCCESS' ? `✅ ${workflowName} Succeeded` : `❌ ${workflowName} Failed`,
      message: text,
      type,
      provider: 'discord',
      metadata: { workflowName, discordMsgId: discordResult?.id }
    });
  }

  async getUserNotifications(owner) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return Notification.find({ owner: String(owner) }).sort({ createdAt: -1 }).limit(50);
    }
    return Array.from(inMemoryNotifications.values())
      .filter((n) => n.owner === String(owner))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async markRead(owner, notificationId) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return Notification.findOneAndUpdate({ _id: notificationId, owner: String(owner) }, { read: true }, { new: true });
    }
    const doc = inMemoryNotifications.get(notificationId);
    if (doc && doc.owner === String(owner)) {
      doc.read = true;
      doc.updatedAt = new Date();
    }
    return doc || null;
  }

  clearInMemoryStore() {
    inMemoryNotifications.clear();
    nextNotifId = 1;
  }
}

module.exports = new NotificationService();
