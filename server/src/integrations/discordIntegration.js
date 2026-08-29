/**
 * Discord Integration — Bot + Webhook message delivery
 */
const BaseIntegration = require('./baseIntegration');

class DiscordIntegration extends BaseIntegration {
  constructor() {
    super('discord');
  }

  getAuthUrl(redirectUri) {
    const scopes = ['bot', 'webhook.incoming'].join('%20');
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || 'mock_discord_client_id',
      scope: scopes,
      redirect_uri: redirectUri,
      response_type: 'code',
      permissions: '2048' // SEND_MESSAGES
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  async handleCallback(code, redirectUri) {
    return {
      tokens: {
        accessToken: `discord_access_${code}_mock`,
        webhookUrl: `https://discord.com/api/webhooks/mock_id/mock_token_${Date.now()}`
      },
      scopes: ['bot', 'webhook.incoming'],
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000)
    };
  }

  async postMessage(credentials, { webhookUrl, content, embeds = [] }) {
    if (!credentials) {
      const err = new Error('Discord integration not connected');
      err.code = 'INTEGRATION_NOT_CONNECTED';
      throw err;
    }

    const targetUrl = webhookUrl || credentials.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (targetUrl && targetUrl.startsWith('https://discord.com/api/webhooks') && !targetUrl.includes('mock_id')) {
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, embeds })
        });
        if (!res.ok) throw new Error(`Discord Webhook error: ${res.status}`);
        return { ok: true, id: `discord_msg_${Date.now()}`, content };
      } catch (err) {
        throw err;
      }
    }

    return {
      ok: true,
      id: `discord_msg_${Date.now()}`,
      content
    };
  }

  async sendSuccessNotification(credentials, { workflowName, result }) {
    const content = `✅ **HYRO Workflow Success**\n**Workflow:** ${workflowName}\n**Result:** ${result}`;
    const webhookUrl = credentials?.webhookUrl;
    return this.postMessage(credentials, { webhookUrl, content });
  }

  async sendFailureNotification(credentials, { workflowName, error }) {
    const content = `❌ **HYRO Workflow Failure**\n**Workflow:** ${workflowName}\n**Error:** ${error}`;
    const webhookUrl = credentials?.webhookUrl;
    return this.postMessage(credentials, { webhookUrl, content });
  }

  formatStatus(doc) {
    if (!doc || !doc.isConnected) {
      return { provider: 'discord', isConnected: false, label: 'Discord', scopes: [] };
    }
    return {
      provider: 'discord',
      isConnected: true,
      label: 'Discord',
      scopes: doc.scopes || ['bot'],
      expiresAt: doc.expiresAt,
      connectedAt: doc.createdAt
    };
  }
}

module.exports = new DiscordIntegration();
