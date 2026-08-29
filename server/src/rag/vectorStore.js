const KnowledgeChunk = require('../models/KnowledgeChunk');
const { getDbStatus } = require('../config/db');
const { cosineSimilarity } = require('./embeddings');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'what', 'where', 'when', 'who',
  'how', 'why', 'this', 'that', 'these', 'those', 'does', 'do', 'did', 'stand'
]);

function calculateHybridScore(query, chunkContent, queryVector, chunkVector) {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const chunkTerms = new Set(
    chunkContent
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
  );

  if (queryTerms.length === 0) return 0;

  let matches = 0;
  for (const term of queryTerms) {
    if (chunkTerms.has(term)) {
      matches++;
    }
  }

  const keywordOverlap = matches / queryTerms.length;
  if (keywordOverlap === 0) return 0; // Strict zero score if no keywords match!

  const vecSim = cosineSimilarity(queryVector, chunkVector);
  return keywordOverlap * 0.7 + vecSim * 0.3;
}

const inMemoryChunks = new Map();
let nextChunkId = 1;

class VectorStore {
  async saveChunk({ documentId, owner, content, embedding, chunkIndex, metadata = {} }) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await KnowledgeChunk.create({
        documentId: String(documentId),
        owner: String(owner),
        content,
        embedding,
        chunkIndex,
        metadata
      });
    }

    const id = String(nextChunkId++);
    const chunkDoc = {
      _id: id,
      documentId: String(documentId),
      owner: String(owner),
      content,
      embedding,
      chunkIndex,
      metadata,
      createdAt: new Date()
    };
    inMemoryChunks.set(id, chunkDoc);
    return { ...chunkDoc };
  }

  async searchSimilar({ owner, query, queryVector, topK = 4, minScore = 0.1 }) {
    const ownerStr = String(owner);
    let allChunks = [];

    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      allChunks = await KnowledgeChunk.find({ owner: ownerStr });
    } else {
      allChunks = Array.from(inMemoryChunks.values()).filter(
        (c) => String(c.owner) === ownerStr
      );
    }

    const scored = allChunks.map((chunk) => {
      const score = calculateHybridScore(query, chunk.content, queryVector, chunk.embedding);
      return {
        chunk,
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter((item) => item.score >= minScore)
      .slice(0, topK)
      .map((item) => ({
        id: item.chunk._id,
        documentId: item.chunk.documentId,
        content: item.chunk.content,
        chunkIndex: item.chunk.chunkIndex,
        metadata: item.chunk.metadata,
        score: item.score
      }));
  }

  async deleteByDocumentId(documentId, owner) {
    const docIdStr = String(documentId);
    const ownerStr = String(owner);

    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      await KnowledgeChunk.deleteMany({ documentId: docIdStr, owner: ownerStr });
      return;
    }

    for (const [id, chunk] of inMemoryChunks.entries()) {
      if (String(chunk.documentId) === docIdStr && String(chunk.owner) === ownerStr) {
        inMemoryChunks.delete(id);
      }
    }
  }

  clearInMemoryStore() {
    inMemoryChunks.clear();
    nextChunkId = 1;
  }
}

module.exports = new VectorStore();
