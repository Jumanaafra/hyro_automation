const { generateEmbedding } = require('./embeddings');
const vectorStore = require('./vectorStore');

class Retriever {
  async retrieveContext({ query, owner, topK = 4, minScore = 0.05 }) {
    if (!query || !owner) return [];

    const queryVector = generateEmbedding(query);
    const results = await vectorStore.searchSimilar({
      owner,
      query,
      queryVector,
      topK,
      minScore
    });

    return results;
  }
}

module.exports = new Retriever();
