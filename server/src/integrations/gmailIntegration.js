const BaseIntegration = require('./baseIntegration');

class GmailIntegration extends BaseIntegration {
  constructor() {
    super('gmail');
    this.requiredScopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ];
  }

  getAuthUrl(redirectUri) {
    const clientId = process.env.GMAIL_CLIENT_ID || 'mock_gmail_client_id.apps.googleusercontent.com';
    const scopeStr = encodeURIComponent(this.requiredScopes.join(' '));
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopeStr}&access_type=offline`;
  }

  async handleCallback(code, redirectUri) {
    // In dev / mock mode, exchange code for tokens
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000);
    const tokens = {
      accessToken: `gmail_at_${Date.now()}_${code}`,
      refreshToken: `gmail_rt_${Date.now()}`,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString()
    };

    return {
      tokens,
      scopes: this.requiredScopes,
      expiresAt
    };
  }

  async fetchEmails(tokens, options = {}) {
    if (!tokens || !tokens.accessToken) {
      const err = new Error('Gmail integration not connected');
      err.code = 'INTEGRATION_NOT_CONNECTED';
      err.statusCode = 400;
      throw err;
    }

    if (tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
      const err = new Error('Gmail access token has expired');
      err.code = 'AUTH_EXPIRED';
      err.statusCode = 401;
      throw err;
    }

    const searchQuery = options.searchQuery || 'is:unread';
    const maxResults = options.maxResults || 10;

    // If real Google OAuth Access Token (starts with ya29.)
    if (tokens.accessToken.startsWith('ya29.')) {
      try {
        const queryParam = encodeURIComponent(searchQuery);
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${queryParam}&maxResults=${maxResults}`;
        const listRes = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });
        if (!listRes.ok) {
          throw new Error(`Gmail API error (${listRes.status}): ${await listRes.text()}`);
        }
        const listData = await listRes.json();
        const msgIds = (listData.messages || []).map((m) => m.id);
        const messages = [];

        for (const id of msgIds.slice(0, maxResults)) {
          const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` }
          });
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            const headers = msgData.payload?.headers || [];
            const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject');
            const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from');
            const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date');
            messages.push({
              id: msgData.id,
              subject: subjectHeader ? subjectHeader.value : 'No Subject',
              sender: fromHeader ? fromHeader.value : 'Unknown Sender',
              body: msgData.snippet || '',
              snippet: msgData.snippet || '',
              date: dateHeader ? new Date(dateHeader.value).toISOString() : new Date().toISOString()
            });
          }
        }

        if (messages.length > 0) {
          return messages;
        }
      } catch (err) {
        console.warn(`[Gmail API] Live fetch error: ${err.message}`);
        throw err;
      }
    }

    // Standard normalized messages for dev / testing
    return [
      {
        id: 'msg_001',
        subject: 'Interview Invitation — Full Stack Developer at TechCorp',
        sender: 'recruiter@techcorp.com',
        body: 'Dear Applicant, We would like to invite you for an interview for the Full Stack Developer position on Monday at 10 AM. Salary budget: $120k.',
        date: new Date().toISOString()
      },
      {
        id: 'msg_002',
        subject: 'Your Python Programming Certificate is Ready',
        sender: 'certs@coursera.org',
        body: 'Congratulations! Your certificate for Python Programming is ready. View credential link: https://coursera.org/verify/py123',
        date: new Date().toISOString()
      },
      {
        id: 'msg_003',
        subject: 'Summer Software Internship Application Update',
        sender: 'careers@innovate.io',
        body: 'Thank you for applying for the Summer Software Internship. We are reviewing your application.',
        date: new Date().toISOString()
      }
    ];
  }
}

module.exports = new GmailIntegration();
