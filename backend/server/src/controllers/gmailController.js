const gmailFilterService = require('../services/gmailFilterService');
const gmailIntegration = require('../integrations/gmailIntegration');
const integrationService = require('../services/integrationService');

class GmailController {
  async testClassifier(req, res, next) {
    try {
      const { subject, body, sender } = req.body;
      const category = gmailFilterService.classifyEmail(subject, body, sender);
      const extracted = gmailFilterService.extractFields({ subject, body, sender }, category);
      const targetSheet = gmailFilterService.determineTargetSheet(category);

      return res.status(200).json({
        success: true,
        data: {
          category,
          extracted,
          targetSheet
        }
      });
    } catch (err) { next(err); }
  }

  async fetchUserEmails(req, res, next) {
    try {
      const tokens = await integrationService.getDecryptedTokens(req.user.id, 'gmail');
      const emails = await gmailIntegration.fetchEmails(tokens);

      const processed = emails.map((email) => {
        const category = gmailFilterService.classifyEmail(email.subject, email.body, email.sender);
        const extracted = gmailFilterService.extractFields(email, category);
        const targetSheet = gmailFilterService.determineTargetSheet(category);
        return {
          email,
          category,
          extracted,
          targetSheet
        };
      });

      return res.status(200).json({ success: true, data: { processed, count: processed.length } });
    } catch (err) { next(err); }
  }
}

module.exports = new GmailController();
