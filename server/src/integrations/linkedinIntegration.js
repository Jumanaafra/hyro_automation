/**
 * LinkedIn Integration — OAuth + Publishing
 * Supports: w_member_social scope only (per SDD 4.3 capability constraints)
 */
const BaseIntegration = require('./baseIntegration');

const SUPPORTED_SCOPES = ['w_member_social', 'r_liteprofile', 'r_emailaddress'];
const UNSUPPORTED_ACTIONS = ['auto_connect', 'bulk_message', 'scrape_profile'];

class LinkedInIntegration extends BaseIntegration {
  constructor() {
    super('linkedin');
  }

  getAuthUrl(redirectUri) {
    const scopes = SUPPORTED_SCOPES.join(' ');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || 'mock_linkedin_client_id',
      redirect_uri: redirectUri,
      scope: scopes
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback(code, redirectUri) {
    return {
      tokens: {
        accessToken: `linkedin_access_${code}_mock`,
        refreshToken: `linkedin_refresh_mock_${Date.now()}`
      },
      scopes: SUPPORTED_SCOPES,
      expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000) // 60-day token
    };
  }

  async publishPost(credentials, { content, visibility = 'PUBLIC', expiresAt = null }) {
    if (!credentials) {
      const err = new Error('LinkedIn integration not connected');
      err.code = 'INTEGRATION_NOT_CONNECTED';
      throw err;
    }

    // If expiresAt is explicitly passed (from Integration doc), validate it
    if (expiresAt && new Date(expiresAt) < new Date()) {
      const err = new Error('LinkedIn token has expired. Please reconnect.');
      err.code = 'AUTH_EXPIRED';
      throw err;
    }

    if (credentials.expiresAt && new Date(credentials.expiresAt) < new Date()) {
      const err = new Error('LinkedIn token has expired. Please reconnect.');
      err.code = 'AUTH_EXPIRED';
      throw err;
    }

    // In production with real member access token
    if (credentials.accessToken && !credentials.accessToken.includes('mock')) {
      try {
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify({
            author: credentials.authorUrn || `urn:li:person:${credentials.personId || 'me'}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: content },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC'
            }
          })
        });
        if (!res.ok) {
          throw new Error(`LinkedIn API error (${res.status}): ${await res.text()}`);
        }
        const data = await res.json();
        return {
          id: data.id || `urn:li:share:${Date.now()}`,
          content,
          visibility,
          publishedAt: new Date().toISOString()
        };
      } catch (err) {
        throw err;
      }
    }

    // Mock response matching personal member post URN
    return {
      id: `urn:li:share:mock_${Date.now()}`,
      content,
      visibility,
      publishedAt: new Date().toISOString()
    };
  }

  assertSupportedAction(action) {
    if (UNSUPPORTED_ACTIONS.includes(action)) {
      const err = new Error(`LinkedIn action "${action}" is not supported. HYRO only supports: ${SUPPORTED_SCOPES.join(', ')}`);
      err.code = 'UNSUPPORTED_ACTION';
      throw err;
    }
    return true;
  }

  formatStatus(doc) {
    if (!doc || !doc.isConnected) {
      return { provider: 'linkedin', isConnected: false, label: 'LinkedIn', scopes: [] };
    }
    return {
      provider: 'linkedin',
      isConnected: true,
      label: 'LinkedIn',
      scopes: doc.scopes || SUPPORTED_SCOPES,
      expiresAt: doc.expiresAt,
      connectedAt: doc.createdAt
    };
  }
}

module.exports = new LinkedInIntegration();
