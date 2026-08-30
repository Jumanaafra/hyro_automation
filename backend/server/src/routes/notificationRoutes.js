const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', (req, res, next) => notificationController.getAll(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationController.markRead(req, res, next));
router.post('/slack', (req, res, next) => notificationController.sendSlack(req, res, next));
router.post('/discord', (req, res, next) => notificationController.sendDiscord(req, res, next));
router.post('/slack/test', (req, res, next) => notificationController.testSlackMessage(req, res, next));
router.post('/discord/test', (req, res, next) => notificationController.testDiscordMessage(req, res, next));

module.exports = router;
