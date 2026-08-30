const documentService = require('../services/documentService');

class KnowledgeController {
  async upload(req, res, next) {
    try {
      const { name, type, content, source, metadata } = req.body;
      const doc = await documentService.processAndIndexDocument({
        owner: req.user.id,
        name,
        type,
        content,
        source,
        metadata
      });
      return res.status(201).json({ success: true, data: { document: doc } });
    } catch (err) { next(err); }
  }

  async getAll(req, res, next) {
    try {
      const documents = await documentService.getUserDocuments(req.user.id);
      return res.status(200).json({ success: true, data: { documents, count: documents.length } });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const document = await documentService.getDocumentById(req.params.id, req.user.id);
      if (!document) {
        return res.status(404).json({ success: false, message: 'Document not found or access denied' });
      }
      return res.status(200).json({ success: true, data: { document } });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await documentService.deleteDocument(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async reindex(req, res, next) {
    try {
      const { content } = req.body;
      const doc = await documentService.reindexDocument(req.params.id, req.user.id, content);
      return res.status(200).json({ success: true, data: { document: doc } });
    } catch (err) { next(err); }
  }
}

module.exports = new KnowledgeController();
