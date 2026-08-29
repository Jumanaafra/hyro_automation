const express = require('express');
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', (req, res, next) => chatController.query(req, res, next));
router.get('/conversations', (req, res, next) => chatController.getConversations(req, res, next));
router.get('/conversations/:id', (req, res, next) => chatController.getById(req, res, next));
router.delete('/conversations/:id', (req, res, next) => chatController.remove(req, res, next));

module.exports = router;
