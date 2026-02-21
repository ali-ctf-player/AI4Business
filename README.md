# 🚀 SES — Startup Ecosystem Support Platform

A full-stack web platform built for a hackathon to connect **startups**, **investors**, and **ecosystem managers** in one collaborative space. Features AI-powered startup analysis, real-time messaging, hackathon management, and role-based dashboards.

---

## 🌟 Features

### 🔐 Authentication
- Email/password login with JWT
- Social login: **GitHub**, **Google**, **myGov**, **Asan İmza**
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
git clone https://github.com/ali-ctf-player/AI4Business.git
cd AI4Business
```

### 2. Setup backend
```bash
cd backend
npm install
npm install dotenv
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

## ❓ FAQ

<details>
<summary><strong>Q: The backend won't start — "Cannot connect to MongoDB"</strong></summary>

Make sure your `backend/.env` has a valid `MONGO_URI`. If you're using MongoDB Atlas, whitelist your IP in **Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`).

</details>

<details>
<summary><strong>Q: AI Examiner returns "OpenAI key not configured"</strong></summary>

Add your key to `backend/.env`:
```env
OPENAI_API_KEY=sk-...
```
Then restart the backend (`node server.js`). Without a key the platform runs in **demo mode** — all other features still work.

</details>

<details>
<summary><strong>Q: GitHub / Google login doesn't work</strong></summary>

Social login requires real OAuth credentials. See the [OAuth Setup](#-oauth-setup-optional) section above. For a quick demo, use the **Quick Demo Access** buttons instead — no credentials needed.

</details>

<details>
<summary><strong>Q: How do I access the platform from my phone?</strong></summary>

1. Make sure your phone and computer are on the **same Wi-Fi network**.
2. Find your computer's local IP (run `ip addr` on Linux or `ipconfig` on Windows).
3. Open `http://<YOUR_IP>:3000` in your phone's browser.

The app auto-detects the hostname, so all API calls will route correctly.

</details>

<details>
<summary><strong>Q: I can't register as Organizer or IT Company</strong></summary>

These roles are supported. On the Register tab, click the role button (🏛️ Organizer or 💻 IT Company) before submitting. If you get a "Role not allowed" error, restart the backend to pick up the latest `User.js` model changes.

</details>

<details>
<summary><strong>Q: How do I create a Hackathon?</strong></summary>

Log in as **Organizer**, **IT Company**, **Admin**, or **Ecosystem Manager**. Go to the **Hackathons** page and click the orange **＋ Create Hackathon** button. Fill in the form and submit — the event appears instantly even if the backend is offline (saved locally for the demo).

</details>

<details>
<summary><strong>Q: Where is the Reports section?</strong></summary>

Reports are available to **Compliance Officer** (admin) and **Ecosystem Manager** (superadmin) accounts only. Log in with one of those roles and click **📊 Reports** in the sidebar. You can export data as CSV or print directly from the browser.

</details>

<details>
<summary><strong>Q: Can I run this without Node.js / backend?</strong></summary>

The frontend is a plain HTML/CSS/JS SPA. You can open `frontend/index.html` directly in a browser for a limited preview, but features like authentication, AI Examiner, real-time chat, and registry management require the backend to be running.

</details>

<details>
<summary><strong>Q: How do I reset the database / clear all demo data?</strong></summary>

In MongoDB Atlas, go to your cluster → **Collections** → select `hackathon_db` → drop the collections you want to clear (`users`, `startups`, `hackathons`, `messages`). A fresh registration will recreate them.

</details>

<details>
<summary><strong>Q: The dark theme doesn't persist after refresh</strong></summary>

The theme is saved to `localStorage`. Make sure your browser isn't blocking localStorage (e.g., private/incognito mode may clear it on close). Toggle with the ☀️/🌙 button in the top bar.

</details>

---

## 🏗️ Built At Hackathon

This project was built as part of a hackathon to demonstrate a modern startup ecosystem platform with AI-powered features and real-time collaboration.

---

## 📄 License

MIT
