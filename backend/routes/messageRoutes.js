const express = require('express');
const router = express.Router();
const { getChatHistory, getContacts } = require('../controllers/messageController');

/* IMPORTANT: You need to import your authentication middleware here. 
  Look at your `startupRoutes.js` or `ithubRoutes.js` to see exactly what 
  you named it and where it is located. Usually, it looks something like this:
*/
const { protect } = require('../middleware/authMiddleware'); 

// GET /api/messages/contacts
// Must come BEFORE /:peerId so "contacts" isn't treated as a dynamic ID
router.get('/contacts', protect, getContacts);

// GET /api/messages/:peerId
router.get('/:peerId', protect, getChatHistory);

module.exports = router;
