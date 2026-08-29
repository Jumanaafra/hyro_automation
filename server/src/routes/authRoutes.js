const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validators');

const router = express.Router();

router.post('/register', validateRegister, (req, res, next) => authController.register(req, res, next));
router.post('/login', validateLogin, (req, res, next) => authController.login(req, res, next));
router.get('/me', protect, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
