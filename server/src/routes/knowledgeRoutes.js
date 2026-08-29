const express = require('express');
const knowledgeController = require('../controllers/knowledgeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/documents', (req, res, next) => knowledgeController.upload(req, res, next));
router.get('/documents', (req, res, next) => knowledgeController.getAll(req, res, next));
router.get('/documents/:id', (req, res, next) => knowledgeController.getById(req, res, next));
router.delete('/documents/:id', (req, res, next) => knowledgeController.remove(req, res, next));
router.post('/documents/:id/reindex', (req, res, next) => knowledgeController.reindex(req, res, next));

module.exports = router;
