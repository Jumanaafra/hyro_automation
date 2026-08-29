const KnowledgeDocument = require('../models/KnowledgeDocument');
const { getDbStatus } = require('../config/db');
const { chunkText } = require('../rag/chunker');
const { generateEmbedding } = require('../rag/embeddings');
const vectorStore = require('../rag/vectorStore');

// In-memory document fallback store
const inMemoryDocs = new Map();
let nextDocId = 1;

class DocumentService {
  async processAndIndexDocument({ owner, name, type = 'txt', content, source = 'upload', metadata = {} }) {
    if (!name || !name.trim()) {
      throw Object.assign(new Error('Document name is required'), { statusCode: 400 });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw Object.assign(new Error('Document content cannot be empty'), { statusCode: 400 });
    }

    const dbStatus = getDbStatus();
    let doc;

    if (dbStatus.isConnected) {
      doc = await KnowledgeDocument.create({
        owner: String(owner),
        name: name.trim(),
        type,
        source,
        status: 'processing',
        metadata
      });
    } else {
      const id = String(nextDocId++);
      doc = {
        _id: id,
        owner: String(owner),
        name: name.trim(),
        type,
        source,
        status: 'processing',
        chunkCount: 0,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryDocs.set(id, doc);
    }

    const docId = String(doc._id);

    try {
      // 1. Chunk text
      const chunks = chunkText(content, 500, 50);

      // 2. Generate embeddings & save chunks
      for (const c of chunks) {
        const embedding = generateEmbedding(c.content);
        await vectorStore.saveChunk({
          documentId: docId,
          owner: String(owner),
          content: c.content,
          embedding,
          chunkIndex: c.chunkIndex,
          metadata: { documentName: name, type, page: c.chunkIndex + 1, ...metadata }
        });
      }

      // 3. Mark document indexed
      if (dbStatus.isConnected) {
        doc = await KnowledgeDocument.findByIdAndUpdate(
          docId,
          { status: 'indexed', chunkCount: chunks.length },
          { new: true }
        );
      } else {
        doc.status = 'indexed';
        doc.chunkCount = chunks.length;
        doc.updatedAt = new Date();
        inMemoryDocs.set(docId, doc);
      }

      return doc;
    } catch (err) {
      if (dbStatus.isConnected) {
        await KnowledgeDocument.findByIdAndUpdate(docId, { status: 'failed' });
      } else {
        doc.status = 'failed';
        inMemoryDocs.set(docId, doc);
      }
      throw err;
    }
  }

  async getUserDocuments(owner) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await KnowledgeDocument.find({ owner: ownerStr }).sort({ createdAt: -1 });
    }

    return Array.from(inMemoryDocs.values())
      .filter((d) => String(d.owner) === ownerStr)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getDocumentById(id, owner) {
    const ownerStr = String(owner);
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await KnowledgeDocument.findOne({ _id: id, owner: ownerStr });
    }

    const doc = inMemoryDocs.get(String(id));
    if (!doc || String(doc.owner) !== ownerStr) return null;
    return doc;
  }

  async deleteDocument(id, owner) {
    const doc = await this.getDocumentById(id, owner);
    if (!doc) {
      throw Object.assign(new Error('Document not found or access denied'), { statusCode: 404 });
    }

    const docId = String(id);
    const ownerStr = String(owner);

    // Delete chunks from vector store
    await vectorStore.deleteByDocumentId(docId, ownerStr);

    // Delete document metadata
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      await KnowledgeDocument.findOneAndDelete({ _id: docId, owner: ownerStr });
    } else {
      inMemoryDocs.delete(docId);
    }

    return { deleted: true, id: docId };
  }

  async reindexDocument(id, owner, newContent = null) {
    const doc = await this.getDocumentById(id, owner);
    if (!doc) {
      throw Object.assign(new Error('Document not found or access denied'), { statusCode: 404 });
    }

    // Delete existing vector chunks
    await vectorStore.deleteByDocumentId(id, owner);

    // Re-index with provided or existing content
    const contentToUse = newContent || (doc.metadata?.rawContent || 'Sample document content for re-indexing');
    return await this.processAndIndexDocument({
      owner,
      name: doc.name,
      type: doc.type,
      content: contentToUse,
      source: doc.source,
      metadata: doc.metadata
    });
  }

  clearInMemoryStore() {
    inMemoryDocs.clear();
    nextDocId = 1;
  }
}

module.exports = new DocumentService();
