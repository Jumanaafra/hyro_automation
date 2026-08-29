const integrationService = require('../services/integrationService');
const gmailIntegration = require('../integrations/gmailIntegration');
const googleSheetsIntegration = require('../integrations/googleSheetsIntegration');

class IntegrationController {
  async getAll(req, res, next) {
    try {
      const integrations = await integrationService.getUserIntegrations(req.user.id);
      return res.status(200).json({ success: true, data: { integrations } });
    } catch (err) { next(err); }
  }

  async getStatus(req, res, next) {
    try {
      const { provider } = req.query;
      const status = await integrationService.getIntegrationStatus(req.user.id, provider || 'gmail');
      return res.status(200).json({ success: true, data: status });
    } catch (err) { next(err); }
  }

  async startOAuth(req, res, next) {
    try {
      const { provider } = req.params;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/${provider}/callback`;

      let authUrl = '#';
      if (provider === 'gmail') authUrl = gmailIntegration.getAuthUrl(redirectUri);
      else if (provider === 'google-sheets') authUrl = googleSheetsIntegration.getAuthUrl(redirectUri);
      else if (provider === 'linkedin') {
        const linkedinIntegration = require('../integrations/linkedinIntegration');
        authUrl = linkedinIntegration.getAuthUrl(redirectUri);
      }

      return res.status(200).json({ success: true, data: { authUrl, provider } });
    } catch (err) { next(err); }
  }

  async handleOAuthCallback(req, res, next) {
    try {
      const { provider } = req.params;
      const { code } = req.query;
      const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/${provider}/callback`;

      let result;
      if (provider === 'gmail') result = await gmailIntegration.handleCallback(code || 'mock_code', redirectUri);
      else if (provider === 'google-sheets') result = await googleSheetsIntegration.handleCallback(code || 'mock_code', redirectUri);
      else result = { tokens: { accessToken: 'mock_at' }, scopes: [], expiresAt: new Date() };

      const status = await integrationService.connectProvider({
        owner: req.user.id,
        provider,
        tokens: result.tokens,
        scopes: result.scopes,
        expiresAt: result.expiresAt
      });

      return res.status(200).json({ success: true, message: `Connected ${provider} successfully`, data: status });
    } catch (err) { next(err); }
  }

  async connect(req, res, next) {
    try {
      const { provider, tokens, scopes, expiresAt } = req.body;
      const status = await integrationService.connectProvider({
        owner: req.user.id,
        provider,
        tokens,
        scopes,
        expiresAt
      });
      return res.status(201).json({ success: true, data: status });
    } catch (err) { next(err); }
  }
}

module.exports = new IntegrationController();
