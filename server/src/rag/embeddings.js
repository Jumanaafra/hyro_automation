/**
 * Embeddings Generator
 * Generates 384-dimensional normalized vector embeddings.
 */

const VECTOR_DIM = 384;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'what', 'where', 'when', 'who',
  'how', 'why', 'this', 'that', 'these', 'those'
]);

function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    return new Array(VECTOR_DIM).fill(0);
  }

  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = normalized.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w));
  
  const vector = new Array(VECTOR_DIM).fill(0);

  // Hash each word into vector space dimensions
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    
    const dimIndex = Math.abs(hash) % VECTOR_DIM;
    const weight = 1.0 + (word.length > 5 ? 0.5 : 0);
    vector[dimIndex] += weight;

    // Bi-gram hashing for context
    if (i > 0) {
      const bigram = words[i - 1] + '_' + word;
      let bHash = 0;
      for (let k = 0; k < bigram.length; k++) {
        bHash = (bHash << 5) - bHash + bigram.charCodeAt(k);
        bHash |= 0;
      }
      const bDim = Math.abs(bHash) % VECTOR_DIM;
      vector[bDim] += 1.5;
    }
  }

  // L2 Normalize vector
  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  VECTOR_DIM
};
