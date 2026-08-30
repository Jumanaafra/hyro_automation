/**
 * Text Chunker
 * Divides raw document text into overlapping retrievable chunks.
 */

function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || typeof text !== 'string') return [];

  const cleaned = text.trim();
  if (cleaned.length === 0) return [];

  if (cleaned.length <= chunkSize) {
    return [
      {
        content: cleaned,
        chunkIndex: 0,
        length: cleaned.length
      }
    ];
  }

  const chunks = [];
  let startIndex = 0;
  let index = 0;

  while (startIndex < cleaned.length) {
    let endIndex = startIndex + chunkSize;
    
    // If not at end, try to break at paragraph or sentence boundary
    if (endIndex < cleaned.length) {
      const nextBreak = cleaned.lastIndexOf('\n\n', endIndex);
      if (nextBreak > startIndex + 100) {
        endIndex = nextBreak + 2;
      } else {
        const periodBreak = cleaned.lastIndexOf('. ', endIndex);
        if (periodBreak > startIndex + 100) {
          endIndex = periodBreak + 2;
        }
      }
    }

    const chunkStr = cleaned.substring(startIndex, endIndex).trim();
    if (chunkStr.length > 0) {
      chunks.push({
        content: chunkStr,
        chunkIndex: index++,
        length: chunkStr.length
      });
    }

    startIndex = endIndex - overlap;
    if (startIndex >= cleaned.length || endIndex >= cleaned.length) break;
  }

  return chunks;
}

module.exports = { chunkText };
