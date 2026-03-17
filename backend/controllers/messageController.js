const mongoose = require('mongoose'); // CRITICAL: Required for the ObjectId math
const Message = require('../models/Message');
const User = require('../models/User'); 

// Fetch chat history between the logged-in user and a specific peer
exports.getChatHistory = async (req, res) => {
  try {
    const { peerId } = req.params;
    const myId = req.user._id || req.user.id; // Safely handles different auth middlewares

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: peerId },
        { senderId: peerId, receiverId: myId }
      ]
    }).sort({ createdAt: 1 }); 

    // Mark their messages to you as read
    await Message.updateMany(
      { senderId: peerId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (error) {
    console.error('🚨 Error fetching chat history:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};

// Fetch a list of contacts with their unread message counts
exports.getContacts = async (req, res) => {
  try {
    const myId = req.user._id || req.user.id; // Safely handles different auth middlewares
    
    if (!myId) {
      console.error('🚨 getContacts Error: User ID is missing from the request.');
      return res.status(401).json({ message: 'Unauthorized: No user ID found.' });
    }

    // 1. Fetch all users except yourself
    const users = await User.find({ _id: { $ne: myId } })
      .select('fullName role email')
      .sort({ fullName: 1 })
      .lean();

    // 2. Aggregate unread messages
    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: new mongoose.Types.ObjectId(myId), isRead: false } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } }
    ]);

    // 3. Map unread counts
    const unreadMap = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    // 4. Attach counts to users
    const contactsWithUnread = users.map(user => ({
      ...user,
      unreadCount: unreadMap[user._id.toString()] || 0
    }));

    res.json(contactsWithUnread);
  } catch (error) {
    console.error('🚨 Error in getContacts:', error);
    res.status(500).json({ message: 'Server error fetching contacts', error: error.message });
  }
};
