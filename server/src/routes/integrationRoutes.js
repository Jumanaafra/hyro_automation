const express = require('express');
const integrationController = require('../controllers/integrationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', (req, res, next) => integrationController.getAll(req, res, next));
router.get('/status', (req, res, next) => integrationController.getStatus(req, res, next));
router.get('/oauth/:provider/start', (req, res, next) => integrationController.startOAuth(req, res, next));
router.get('/oauth/:provider/callback', (req, res, next) => integrationController.handleOAuthCallback(req, res, next));
router.post('/', (req, res, next) => integrationController.connect(req, res, next));

module.exports = router;
