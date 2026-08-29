const crypto = require('crypto');
const env = require('../config/env');

class BaseIntegration {
  constructor(providerName) {
    this.providerName = providerName;
    this.algorithm = 'aes-256-cbc';
  }

  // Derive 32-byte key from CREDENTIAL_ENCRYPTION_KEY
  _getSecretKey() {
    const keyString = env.CREDENTIAL_ENCRYPTION_KEY || 'hyro_32_byte_secret_credential_enc_key_2026!';
    return crypto.createHash('sha256').update(keyString).digest();
  }

  // Encrypt payload object to AES-256 hex ciphertext
  encryptTokens(tokensObj) {
    if (!tokensObj) return null;
    const iv = crypto.randomBytes(16);
    const key = this._getSecretKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(tokensObj), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Decrypt AES-256 hex ciphertext back to tokens object
  decryptTokens(ciphertext) {
    if (!ciphertext) return null;
    try {
      const [ivHex, encryptedText] = ciphertext.split(':');
      if (!ivHex || !encryptedText) return null;

      const iv = Buffer.from(ivHex, 'hex');
      const key = this._getSecretKey();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (err) {
      console.error(`[BaseIntegration] Decryption error for ${this.providerName}: ${err.message}`);
      return null;
    }
  }

  // Sanitized integration status object (NEVER exposes tokens)
  formatStatus(integration) {
    if (!integration) {
      return {
        provider: this.providerName,
        isConnected: false,
        scopes: [],
        expiresAt: null
      };
    }

    return {
      provider: integration.provider || this.providerName,
      isConnected: !!integration.isConnected,
      scopes: integration.scopes || [],
      expiresAt: integration.expiresAt || null,
      updatedAt: integration.updatedAt || null
    };
  }
}

module.exports = BaseIntegration;
