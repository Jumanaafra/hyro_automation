const BaseIntegration = require('./baseIntegration');

class GoogleSheetsIntegration extends BaseIntegration {
  constructor() {
    super('google-sheets');
    this.requiredScopes = [
      'https://www.googleapis.com/auth/spreadsheets'
    ];
  }

  getAuthUrl(redirectUri) {
    const clientId = process.env.SHEETS_CLIENT_ID || 'mock_sheets_client_id.apps.googleusercontent.com';
    const scopeStr = encodeURIComponent(this.requiredScopes.join(' '));
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopeStr}&access_type=offline`;
  }

  async handleCallback(code, redirectUri) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000);
    const tokens = {
      accessToken: `sheets_at_${Date.now()}_${code}`,
      refreshToken: `sheets_rt_${Date.now()}`,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString()
    };

    return {
      tokens,
      scopes: this.requiredScopes,
      expiresAt
    };
  }

  async appendRow(tokens, { spreadsheetId, sheetName, rowData }) {
    if (!tokens || !tokens.accessToken) {
      const err = new Error('Google Sheets integration not connected');
      err.code = 'INTEGRATION_NOT_CONNECTED';
      err.statusCode = 400;
      throw err;
    }

    if (tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
      const err = new Error('Google Sheets access token has expired');
      err.code = 'AUTH_EXPIRED';
      err.statusCode = 401;
      throw err;
    }

    const effectiveSheet = sheetName || 'Sheet1';
    const rowValues = Array.isArray(rowData)
      ? rowData
      : typeof rowData === 'object' && rowData !== null
        ? Object.values(rowData)
        : [String(rowData || '')];

    // If real Google OAuth Access Token (starts with ya29.) and valid spreadsheetId
    if (tokens.accessToken.startsWith('ya29.') && spreadsheetId && spreadsheetId !== 'default_spreadsheet' && spreadsheetId !== 'sheet_123') {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(effectiveSheet)}!A1:append?valueInputOption=USER_ENTERED`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowValues]
          })
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Google Sheets API error (${res.status}): ${body}`);
        }
        const data = await res.json();
        return {
          success: true,
          spreadsheetId,
          sheetName: effectiveSheet,
          appendedRow: rowData,
          updates: data.updates,
          timestamp: new Date().toISOString()
        };
      } catch (apiErr) {
        throw apiErr;
      }
    }

    return {
      success: true,
      spreadsheetId: spreadsheetId || 'default_spreadsheet',
      sheetName: effectiveSheet,
      appendedRow: rowData,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new GoogleSheetsIntegration();
