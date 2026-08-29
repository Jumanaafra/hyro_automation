const retriever = require('../rag/retriever');
const ChatConversation = require('../models/ChatConversation');
const { getDbStatus } = require('../config/db');

// In-memory conversation fallback store
const inMemoryConvs = new Map();
let nextConvId = 1;

class RAGService {
  async queryRAG({ owner, conversationId, message }) {
    if (!message || !message.trim()) {
      throw Object.assign(new Error('Query message is required'), { statusCode: 400 });
    }

    const ownerStr = String(owner);
    const query = message.trim();

    // 1. Retrieve semantically relevant context chunks for owner
    const chunks = await retriever.retrieveContext({
      query,
      owner: ownerStr,
      topK: 4,
      minScore: 0.10
    });

    let answer = '';
    const sources = [];

    if (chunks.length === 0) {
      // Per SDD Section 6 & Testing Spec P4-009: Strict factual grounding rule
      answer = 'I checked your available knowledge base, but it does not contain information to answer this question.';
    } else {
      // Build grounded answer from chunks
      const contextText = chunks.map((c) => c.content).join('\n---\n');
      answer = `Based on your knowledge base:\n\n${contextText}\n\n[Answer grounded on ${chunks.length} retrieved document section(s)]`;

      for (const c of chunks) {
        sources.push({
          documentName: c.metadata?.documentName || 'Document',
          chunkIndex: c.chunkIndex,
          snippet: c.content.substring(0, 150) + (c.content.length > 150 ? '...' : '')
        });
      }
    }

    // 2. Persist message in conversation
    let conversation;
    const dbStatus = getDbStatus();

    if (conversationId) {
      if (dbStatus.isConnected) {
        conversation = await ChatConversation.findOne({ _id: conversationId, owner: ownerStr });
      } else {
        conversation = inMemoryConvs.get(String(conversationId));
      }
    }

    if (!conversation) {
      const newTitle = query.length > 30 ? query.substring(0, 30) + '...' : query;
      if (dbStatus.isConnected) {
        conversation = await ChatConversation.create({
          owner: ownerStr,
          title: newTitle,
          messages: []
        });
      } else {
        const cId = String(nextConvId++);
        conversation = {
          _id: cId,
          owner: ownerStr,
          title: newTitle,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        inMemoryConvs.set(cId, conversation);
      }
    }

    const userMsg = { role: 'user', content: query, sources: [], timestamp: new Date() };
    const botMsg = { role: 'assistant', content: answer, sources, timestamp: new Date() };

    conversation.messages.push(userMsg, botMsg);
    conversation.updatedAt = new Date();

    if (dbStatus.isConnected) {
      await ChatConversation.findByIdAndUpdate(conversation._id, {
        messages: conversation.messages,
        updatedAt: conversation.updatedAt
      });
    } else {
      inMemoryConvs.set(String(conversation._id), conversation);
    }

    return {
      conversationId: String(conversation._id),
      answer,
      sources,
      messages: conversation.messages
    };
  }

  async getConversations(owner) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await ChatConversation.find({ owner: ownerStr }).sort({ updatedAt: -1 });
    }

    return Array.from(inMemoryConvs.values())
      .filter((c) => String(c.owner) === ownerStr)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getConversationById(id, owner) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await ChatConversation.findOne({ _id: id, owner: ownerStr });
    }

    const conv = inMemoryConvs.get(String(id));
    if (!conv || String(conv.owner) !== ownerStr) return null;
    return conv;
  }

  async deleteConversation(id, owner) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      await ChatConversation.findOneAndDelete({ _id: id, owner: ownerStr });
    } else {
      inMemoryConvs.delete(String(id));
    }
    return { deleted: true, id };
  }

  clearInMemoryStore() {
    inMemoryConvs.clear();
    nextConvId = 1;
  }
}

module.exports = new RAGService();
