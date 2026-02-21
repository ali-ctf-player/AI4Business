# 🚀 SES — Startup Ecosystem Support Platform

A full-stack web platform built for a hackathon to connect **startups**, **investors**, and **ecosystem managers** in one collaborative space. Features AI-powered startup analysis, real-time messaging, hackathon management, and role-based dashboards.

---

## 🌟 Features

### 🔐 Authentication
- Email/password login with JWT
- Social login: **GitHub**, **Google**, **myGov**, **Aşan İmza**
- Multi-factor authentication (MFA) flow
- Role-based access: Investor · Startup · Compliance Officer · Ecosystem Manager

### 💼 Investor Dashboard
- Discovery Feed — browse and filter startups
- AI Examiner — analyze any startup with AI-generated risk/opportunity reports
- Portfolio tracker
- **Invest Now** directly from startup cards

### 🚀 Startup Dashboard
- Profile & metrics management
- Investor interest feed
- Real-time messaging

### ⚙️ Compliance Officer (Admin)
- User management — view, suspend, activate users
- Startup registry — approve/reject submissions
- KPI dashboard with live charts
- Audit log

### 👑 Ecosystem Manager (Superadmin)
- Full platform oversight
- Suspend Compliance Officers
- Registry & user analytics

### 🏆 Hackathon Management
- Browse upcoming hackathon events with countdown timers
- Create & join teams
- Filter teams by hackathon
- Event registration

### 🤖 AI Examiner
- Powered by OpenAI GPT
- Analyzes startups: funding stage, market fit, risk, opportunity
- Real-time streaming responses

### 💬 Real-time Messaging
- Socket.io powered chat
- Live online status

---

## 🛠️ Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | Vanilla HTML · CSS · JavaScript         |
| Backend    | Node.js · Express.js                    |
| Database   | MongoDB Atlas (Mongoose)                |
| Real-time  | Socket.io                               |
| AI         | OpenAI API (GPT-4)                      |
| Auth       | JWT · Passport.js · OAuth 2.0           |
| Charts     | Chart.js                                |

---

## 📁 Project Structure

```
Hackathon/
├── frontend/
│   ├── index.html       # Main SPA shell
│   ├── app.js           # All frontend logic (SPA router, API calls, UI)
│   └── styles.css       # Full design system (light/dark theme)
│
└── backend/
    ├── server.js        # Express app entry point
    ├── models/
    │   ├── User.js
    │   ├── Startup.js
    │   ├── Hackathon.js
    │   └── Message.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── oauthRoutes.js
    │   ├── startupRoutes.js
    │   ├── aiRoutes.js
    │   ├── hackathonRoutes.js
    │   └── messageRoutes.js
    └── config/
        └── passport.js  # GitHub & Google OAuth strategies
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key (for AI Examiner)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Setup backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/hackathon_db
JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=your_openai_key_here

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Optional: Social Login
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Start backend:
```bash
node server.js
```

### 3. Serve frontend
```bash
cd frontend
npx serve -l 3000
```

Open **http://localhost:3000**

---

## 🎭 Demo Accounts

Use the **Quick Demo Access** buttons on the login screen to instantly explore each role:

| Role | Access Level |
|------|-------------|
| 💼 Investor | Discovery feed, AI Examiner, portfolio |
| 🚀 Startup | Profile, metrics, messaging |
| ⚙️ Compliance Officer | User management, registry, audit |
| 👑 Ecosystem Manager | Full platform control |

---

## 🔑 OAuth Setup (Optional)

To enable real GitHub/Google login:

**GitHub:** Go to [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App  
Callback URL: `http://localhost:5000/api/auth/github/callback`

**Google:** Go to [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth 2.0 Client  
Callback URL: `http://localhost:5000/api/auth/google/callback`

---

## 🎨 UI Features

- ☀️ Light / 🌙 Dark theme toggle (persisted in localStorage)
- Fully responsive design
- Single Page Application (no page reloads)
- Animated cards, modals, and transitions

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (JWT) |
| GET | `/api/auth/github` | GitHub OAuth |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/startups` | List startups |
| POST | `/api/startups` | Create startup |
| POST | `/api/ai/analyze` | AI analysis |
| GET | `/api/hackathons` | List hackathons |
| GET | `/api/messages` | Get messages |

---

## 🏗️ Built At Hackathon

This project was built as part of a hackathon to demonstrate a modern startup ecosystem platform with AI-powered features and real-time collaboration.

---

## 📄 License

MIT
