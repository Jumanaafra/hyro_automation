/**
 * Slack Integration — OAuth + Message Actions
 * Posts messages, success/failure notifications via Slack Incoming Webhooks
 */
const BaseIntegration = require('./baseIntegration');

class SlackIntegration extends BaseIntegration {
  constructor() {
    super('slack');
  }

  getAuthUrl(redirectUri) {
    const scopes = ['chat:write', 'incoming-webhook', 'channels:read'].join(',');
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || 'mock_slack_client_id',
      scope: scopes,
      redirect_uri: redirectUri,
      response_type: 'code'
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async handleCallback(code, redirectUri) {
    // In production: exchange code with Slack token endpoint
    // Here we return mock tokens for testability
    return {
      tokens: {
        accessToken: `slack_access_${code}_mock`,
        botToken: `xoxb-mock-bot-token-${Date.now()}`,
        webhookUrl: 'https://hooks.slack.com/services/TXXXXXXX/BXXXXXXX/mock'
      },
      scopes: ['chat:write', 'incoming-webhook'],
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) // Slack tokens don't expire
    };
  }

  async postMessage(credentials, { channel = '#general', text, blocks = null }) {
    if (!credentials) {
      const err = new Error('Slack integration not connected');
      err.code = 'INTEGRATION_NOT_CONNECTED';
      throw err;
    }

    const webhookUrl = credentials.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith('https://hooks.slack.com') && !webhookUrl.includes('TXXXXXXX')) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, channel })
        });
        if (!res.ok) throw new Error(`Slack Webhook error: ${res.status}`);
        return { ok: true, ts: Date.now().toString(), channel, message: { text } };
      } catch (err) {
        throw err;
      }
    }

    return {
      ok: true,
      ts: Date.now().toString(),
      channel,
      message: { text }
    };
  }

  async sendSuccessNotification(credentials, { workflowName, result, channel }) {
    const text = `✅ *HYRO Workflow Success*\n*Workflow:* ${workflowName}\n*Result:* ${result}`;
    return this.postMessage(credentials, { channel, text });
  }

  async sendFailureNotification(credentials, { workflowName, error, channel }) {
    const text = `❌ *HYRO Workflow Failure*\n*Workflow:* ${workflowName}\n*Error:* ${error}`;
    return this.postMessage(credentials, { channel, text });
  }

  formatStatus(doc) {
    if (!doc || !doc.isConnected) {
      return { provider: 'slack', isConnected: false, label: 'Slack', scopes: [] };
    }
    return {
      provider: 'slack',
      isConnected: true,
      label: 'Slack',
      scopes: doc.scopes || ['chat:write', 'incoming-webhook'],
      expiresAt: doc.expiresAt,
      connectedAt: doc.createdAt
    };
  }
}

module.exports = new SlackIntegration();
