require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const http         = require('http');
const session      = require('express-session');
const passport     = require('./config/passport');
const { Server }   = require('socket.io');

// --- NEW SECURITY IMPORTS ---
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit     = require('express-rate-limit');
const jwt           = require('jsonwebtoken'); 

const Message = require('./models/Message');

// --- FAIL FAST IF SECRETS ARE MISSING ---
if (!process.env.JWT_SECRET) {
  console.error('🛑 FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1); 
}

const app    = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────
// 1. Security Headers
app.use(helmet()); 

// 2. Body Parser & NoSQL Injection Prevention
app.use(express.json());

// --- FIX: Express 5 compatibility patch for express-mongo-sanitize ---
app.use((req, res, next) => {
  Object.defineProperty(req, 'query', {
    value: { ...req.query },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
});

app.use(mongoSanitize());

// 3. Strict CORS Policy
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://192.168.1.75:3000',
  'https://ai4business-9z7o.onrender.com',
  'http://localhost:5500',
  'http://127.0.0.1:8080',
  'http://localhost:8080'
];

app.use(cors({ 
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or local file:// testing)
    if(!origin) return callback(null, true);
    
    // Check if the origin is in our allowed list
    if(allowedOrigins.indexOf(origin) === -1){
      // --- ADD THIS LINE SO WE CAN SEE THE CULPRIT ---
      console.error(`🚨 CORS BLOCKED ORIGIN: '${origin}'`); 
      
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }, 
  credentials: true 
}));

// 4. Rate Limiting (Protects against brute force & DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter); 

// 5. Session Setup (Hardcoded secret removed)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false, 
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// 3. Socket.io Quraşdırılması
const io = new Server(server, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- NEW: Socket Authentication Middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.user = decoded; 
    next();
  });
});

// 4. MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// 5. Socket.io Məntiqi (Secured)
io.on('connection', (socket) => {
  // Auto-join the user to a room based on their VERIFIED token ID, not client input
  socket.join(socket.user.id);

  socket.on('send_message', async (data) => {
    try {
      const newMessage = new Message({
        senderId: socket.user.id, // Trust the token, NOT data.senderId
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

// 7. Serveri Başlat
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SES Backend running on port ${PORT}`);
});
