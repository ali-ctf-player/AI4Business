const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define the post routes directly from the controller object
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/quick-demo', authController.quickDemoLogin);

module.exports = router;
