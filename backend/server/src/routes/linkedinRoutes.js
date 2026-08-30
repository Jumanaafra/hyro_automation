const express = require('express');
const linkedinController = require('../controllers/linkedinController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/generate', (req, res, next) => linkedinController.generateContent(req, res, next));
router.post('/validate', (req, res, next) => linkedinController.validateContent(req, res, next));
router.get('/calendar', (req, res, next) => linkedinController.getCalendar(req, res, next));
router.get('/posts', (req, res, next) => linkedinController.getPosts(req, res, next));
router.post('/posts', (req, res, next) => linkedinController.createPost(req, res, next));
router.post('/posts/:id/submit', (req, res, next) => linkedinController.submitForApproval(req, res, next));
router.post('/posts/:id/approve', (req, res, next) => linkedinController.approve(req, res, next));
router.post('/posts/:id/schedule', (req, res, next) => linkedinController.schedule(req, res, next));
router.patch('/posts/:id/schedule', (req, res, next) => linkedinController.reschedule(req, res, next));
router.post('/posts/:id/cancel', (req, res, next) => linkedinController.cancel(req, res, next));
router.post('/posts/:id/publish', (req, res, next) => linkedinController.publish(req, res, next));

module.exports = router;
