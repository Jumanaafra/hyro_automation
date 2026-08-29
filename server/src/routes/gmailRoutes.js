const express = require('express');
const gmailController = require('../controllers/gmailController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/test-classifier', (req, res, next) => gmailController.testClassifier(req, res, next));
router.get('/emails', (req, res, next) => gmailController.fetchUserEmails(req, res, next));

module.exports = router;
