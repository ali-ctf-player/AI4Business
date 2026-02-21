const express = require('express');
const router = express.Router();
const { getConversation } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:userId1/:userId2', protect, getConversation);

module.exports = router;
