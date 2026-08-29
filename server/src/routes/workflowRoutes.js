const express = require('express');
const workflowController = require('../controllers/workflowController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes protected
router.use(protect);

router.get('/dashboard', (req, res, next) => workflowController.getDashboard(req, res, next));
router.get('/', (req, res, next) => workflowController.getAll(req, res, next));
router.post('/generate', (req, res, next) => workflowController.generate(req, res, next));
router.post('/', (req, res, next) => workflowController.create(req, res, next));
router.get('/:id', (req, res, next) => workflowController.getById(req, res, next));
router.put('/:id', (req, res, next) => workflowController.update(req, res, next));
router.post('/:id/duplicate', (req, res, next) => workflowController.duplicate(req, res, next));
router.post('/:id/execute', (req, res, next) => workflowController.execute(req, res, next));
router.delete('/:id', (req, res, next) => workflowController.remove(req, res, next));

module.exports = router;
