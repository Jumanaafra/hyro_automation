const Integration = require('../models/Integration');
const { getDbStatus } = require('../config/db');
const gmailIntegration = require('../integrations/gmailIntegration');
const googleSheetsIntegration = require('../integrations/googleSheetsIntegration');
const slackIntegration = require('../integrations/slackIntegration');
const discordIntegration = require('../integrations/discordIntegration');
const linkedinIntegration = require('../integrations/linkedinIntegration');
const baseIntegration = new (require('../integrations/baseIntegration'))('common');

// In-memory integration fallback store
const inMemoryIntegrations = new Map();
let nextIntegId = 1;

class IntegrationService {
  _getProviderInstance(provider) {
    if (provider === 'gmail') return gmailIntegration;
    if (provider === 'google-sheets') return googleSheetsIntegration;
    if (provider === 'slack') return slackIntegration;
    if (provider === 'discord') return discordIntegration;
    if (provider === 'linkedin') return linkedinIntegration;
    return new (require('../integrations/baseIntegration'))(provider);
  }

  async connectProvider({ owner, provider, tokens, scopes = [], expiresAt = null }) {
    const ownerStr = String(owner);
    const providerInstance = this._getProviderInstance(provider);
    const encryptedTokens = providerInstance.encryptTokens(tokens);

    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      const integration = await Integration.findOneAndUpdate(
        { owner: ownerStr, provider },
        {
          isConnected: true,
          scopes,
          encryptedTokens,
          expiresAt: expiresAt || new Date(Date.now() + 3600 * 1000)
        },
        { upsert: true, new: true }
      );
      return providerInstance.formatStatus(integration);
    }

    const key = `${ownerStr}:${provider}`;
    const id = inMemoryIntegrations.get(key)?._id || String(nextIntegId++);
    const doc = {
      _id: id,
      owner: ownerStr,
      provider,
      isConnected: true,
      scopes,
      encryptedTokens,
      expiresAt: expiresAt || new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryIntegrations.set(key, doc);
    return providerInstance.formatStatus(doc);
  }

  async getDecryptedTokens(owner, provider) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();
    let ciphertext = null;

    if (dbStatus.isConnected) {
      const doc = await Integration.findOne({ owner: ownerStr, provider }).select('+encryptedTokens');
      ciphertext = doc?.encryptedTokens;
    } else {
      const key = `${ownerStr}:${provider}`;
      const doc = inMemoryIntegrations.get(key);
      ciphertext = doc?.encryptedTokens;
    }

    if (!ciphertext) return null;
    const providerInstance = this._getProviderInstance(provider);
    return providerInstance.decryptTokens(ciphertext);
  }

  async getUserIntegrations(owner) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();
    const providers = ['gmail', 'google-sheets', 'slack', 'discord', 'linkedin'];

    let docs = [];
    if (dbStatus.isConnected) {
      docs = await Integration.find({ owner: ownerStr });
    } else {
      docs = Array.from(inMemoryIntegrations.values()).filter((i) => String(i.owner) === ownerStr);
    }

    const map = new Map(docs.map((d) => [d.provider, d]));

    return providers.map((p) => {
      const inst = this._getProviderInstance(p);
      return inst.formatStatus(map.get(p));
    });
  }

  async getIntegrationStatus(owner, provider) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();
    let doc = null;

    if (dbStatus.isConnected) {
      doc = await Integration.findOne({ owner: ownerStr, provider });
    } else {
      doc = inMemoryIntegrations.get(`${ownerStr}:${provider}`);
    }

    const inst = this._getProviderInstance(provider);
    return inst.formatStatus(doc);
  }

  clearInMemoryStore() {
    inMemoryIntegrations.clear();
    nextIntegId = 1;
  }
}

module.exports = new IntegrationService();
