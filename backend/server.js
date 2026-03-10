require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const http         = require('http');
const session      = require('express-session');
const passport     = require('./config/passport');
const { Server }   = require('socket.io');

const Message = require('./models/Message');

const app    = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────
app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));
app.use(session({
  secret: process.env.JWT_SECRET || 'ses_session_secret',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// 3. Socket.io Quraşdırılması
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"] 
  }
});

// 4. MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// 5. Socket.io Məntiqi
io.on('connection', (socket) => {
  socket.on('join_room', (userId) => {
    socket.join(userId);
  });

  socket.on('send_message', async (data) => {
    try {
      const newMessage = new Message({
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content
      });
      await newMessage.save();
      io.to(data.receiverId).emit('receive_message', newMessage);
    } catch (error) {
      console.error("Socket Error:", error);
    }
  });
});

// 6. API Route-ları (Bütün modullar buradadır)
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/auth',       require('./routes/oauthRoutes'));
app.use('/api/startups',   require('./routes/startupRoutes'));
app.use('/api/messages',   require('./routes/messageRoutes'));
app.use('/api/ai',         require('./routes/aiRoutes'));
app.use('/api/hackathons', require('./routes/hackathonRoutes'));
app.use('/api/it-hubs',    require('./routes/ithubRoutes'));
app.use('/api/hackathons', require('./routes/hackathonRoutes'));
// 7. Serveri Başlat
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 NEXUSIO Backend running on port ${PORT}`);
});
