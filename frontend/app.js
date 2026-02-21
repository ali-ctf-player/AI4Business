'use strict';

const API_URL = 'http://localhost:5000/api';

const APP = {
  role: null,
  page: null,
  token: localStorage.getItem('token') || null,
  userData: JSON.parse(localStorage.getItem('userData')) || null,
};

// ─── THEME ────────────────────────────────────────────
(function applyStoredTheme() {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  }
})();

window.toggleTheme = function() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.body.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isDark ? '🌙' : '☀️';
};

// Set correct icon on load
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = localStorage.getItem('theme') === 'dark' ? '☀️' : '🌙';
});

// ─── INITIALIZATION ───────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  // Pick up OAuth token from redirect query params
  const params = new URLSearchParams(window.location.search);
  const oauthToken = params.get('token');
  const oauthUser  = params.get('user');
  const authError  = params.get('auth_error');
  if (oauthToken && oauthUser) {
    try {
      const user = JSON.parse(decodeURIComponent(oauthUser));
      localStorage.setItem('token', oauthToken);
      localStorage.setItem('userData', JSON.stringify(user));
      APP.token = oauthToken; APP.userData = user; APP.role = user.role;
      window.history.replaceState({}, '', window.location.pathname);
      loginAs(user.role);
      return;
    } catch(e) {}
  }
  if (authError) {
    window.history.replaceState({}, '', window.location.pathname);
    showToastMsg(`❌ ${authError.charAt(0).toUpperCase()+authError.slice(1)} login failed. Try again.`);
  }
  if (APP.token && APP.userData) {
    APP.role = APP.userData.role;
    loginAs(APP.role);
  }
});

// ─── AUTHENTICATION ───────────────────────────────────
let authMode = 'login';
let selectedRole = 'startup';

// ─── SOCIAL LOGIN ──────────────────────────────────────
const OAUTH_BASE = 'http://localhost:5000/api/auth';

window.socialLogin = function(provider) {
  if (provider === 'github') {
    window.location.href = `${OAUTH_BASE}/github`;
  } else if (provider === 'google') {
    window.location.href = `${OAUTH_BASE}/google`;
  } else if (provider === 'mygov') {
    openGovLoginModal('mygov');
  } else if (provider === 'asanimza') {
    openGovLoginModal('asanimza');
  }
};

function openGovLoginModal(type) {
  const isAsan = type === 'asanimza';
  const modal = document.getElementById('gov-login-modal');
  const title = document.getElementById('gov-modal-title');
  const desc  = document.getElementById('gov-modal-desc');
  const input = document.getElementById('gov-modal-input');
  if (!modal) return;
  title.textContent = isAsan ? '🔏 Asan İmza — Digital Signature' : '🏛️ myGov Azerbaijan';
  desc.textContent  = isAsan
    ? 'Enter your Asan İmza PIN to authenticate with your digital signature certificate.'
    : 'Enter your FIN code (Fərdi İdentifikasiya Nömrəsi) to login via myGov portal.';
  input.placeholder = isAsan ? 'Asan İmza PIN (e.g. A1234567)' : 'FIN Code (e.g. 5XY3B4Z)';
  input.dataset.provider = type;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

window.closeGovModal = function() {
  const modal = document.getElementById('gov-login-modal');
  if (modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; }
  const input = document.getElementById('gov-modal-input');
  if (input) input.value = '';
};

window.submitGovLogin = function() {
  const input    = document.getElementById('gov-modal-input');
  const provider = input?.dataset.provider;
  const value    = input?.value.trim();
  if (!value) { showToastMsg('⚠️ Please enter your ' + (provider === 'asanimza' ? 'PIN' : 'FIN code')); return; }
  closeGovModal();
  showToastMsg('🔄 Verifying with government portal…');
  // Demo: simulate verification delay then login as investor
  setTimeout(() => {
    const demoUser = { id: 'gov_' + Date.now(), role: 'investor', fullName: provider === 'asanimza' ? 'Aşan İmza User' : 'myGov User' };
    localStorage.setItem('userData', JSON.stringify(demoUser));
    APP.userData = demoUser; APP.role = demoUser.role;
    showToastMsg('✅ Government authentication successful!');
    loginAs(demoUser.role);
  }, 1500);
};

window.switchToHackathonRegister = function() {
  // Switch to Register tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="register"]')?.classList.add('active');
  authMode = 'register';
  document.getElementById('role-selector')?.classList.remove('hidden');
  document.getElementById('name-field')?.classList.remove('hidden');
  document.getElementById('email-login-fields')?.classList.remove('hidden');
  document.getElementById('btn-show-email').textContent = '✉️ Hide Email Form';
  // Scroll auth card into view
  document.querySelector('.auth-card')?.scrollIntoView({ behavior: 'smooth' });
};

window.toggleEmailFields = function() {
  const fields = document.getElementById('email-login-fields');
  const btn = document.getElementById('btn-show-email');
  const hidden = fields.classList.toggle('hidden');
  btn.textContent = hidden ? '✉️ Sign in with Email' : '✉️ Hide Email Form';
};

// Tab buttons (Login / Register)
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    authMode = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Reset email fields visibility on tab switch
    document.getElementById('email-login-fields')?.classList.add('hidden');
    document.getElementById('btn-show-email').textContent = '✉️ Sign in with Email';

    const roleSelector = document.getElementById('role-selector');
    const nameField = document.getElementById('name-field');
    
    if (authMode === 'register') {
      roleSelector?.classList.remove('hidden');
      nameField?.classList.remove('hidden');
      // Auto-show email fields on register
      document.getElementById('email-login-fields')?.classList.remove('hidden');
      document.getElementById('btn-show-email').textContent = '✉️ Hide Email Form';
      const cont = document.getElementById('btn-continue');
      if (cont) cont.textContent = 'Continue →';
    } else {
      roleSelector?.classList.add('hidden');
      nameField?.classList.add('hidden');
      document.getElementById('hackathon-reg-fields')?.classList.add('hidden');
      document.getElementById('email-login-fields')?.classList.add('hidden');
      document.getElementById('btn-show-email').textContent = '✉️ Sign in with Email';
      const cont = document.getElementById('btn-continue');
      if (cont) cont.textContent = 'Continue →';
    }
  });
});

// Role selector buttons (Startup / Investor)
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRole = btn.dataset.role;
  });
});

window.handleAuthStep = async function() {
  // Elementləri tək-tək yoxlayırıq (null xətası almasın deyə)
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  const nameEl = document.getElementById('register-name');
  const btn = document.getElementById('btn-continue');

  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value.trim();
  const fullName = nameEl ? nameEl.value.trim() : "";

  if (!email || !password) {
    alert("Zəhmət olmasa email və şifrəni daxil edin.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>...';

  const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
  const payload = authMode === 'register' 
    ? { email, password, fullName, role: selectedRole }
    : { email, password };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      if (authMode === 'login') {
        APP.token = data.token;
        APP.userData = data.user;
        APP.role = data.user.role;
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        document.getElementById('step-credentials')?.classList.add('hidden');
        document.getElementById('step-mfa')?.classList.remove('hidden');
      } else {
        alert("Qeydiyyat uğurludur! Giriş edin.");
        location.reload();
      }
    } else {
      alert(data.message || "Xəta!");
    }
  } catch (err) {
    alert("Backend serverə qoşulmaq mümkün deyil!");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue →';
  }
};

window.verifyMFA = function() {
  loginAs(APP.role);
};

window.loginAs = function(role) {
  APP.role = role;
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
  document.getElementById('chat-toggle-btn')?.classList.remove('hidden');
  
  updateUserUI();
  buildSidebarNav(role);
  initSocket();
  
  const defaultPages = { investor:'investor-dash', startup:'profile', admin:'kpi', superadmin:'kpi' };
  navigateTo(defaultPages[role] || 'discovery');
};

function updateUserUI() {
  const roleLabels = { investor:'INVESTOR', startup:'STARTUP', admin:'COMPLIANCE OFFICER', superadmin:'ECOSYSTEM MANAGER' };
  const sidebarUser = document.getElementById('sidebar-user');
  if (sidebarUser && APP.userData) {
    sidebarUser.innerHTML = `
      <div class="user-card">
        <div class="user-row">
          <div class="user-avatar">${APP.userData.fullName[0]}</div>
          <div>
            <div class="user-name">${APP.userData.fullName}</div>
            <div class="user-email">${roleLabels[APP.role] || APP.role.toUpperCase()} ACCOUNT</div>
          </div>
        </div>
      </div>`;
  }
}

// ─── NAVIGATION & PAGES ────────────────────────────────
const SELF_RENDER_PAGES = ['kpi','registry','users','audit','ai-examiner','hackathon'];

window.navigateTo = function(pageId) {
  const content = document.getElementById('page-content');
  if (!content) return;

  if (SELF_RENDER_PAGES.includes(pageId)) {
    content.innerHTML = '';
    APP.page = pageId;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });
    onPageLoad(pageId);
    return;
  }

  const tpl = document.getElementById('tpl-' + pageId);
  if (!tpl) return;

  content.innerHTML = '';
  content.appendChild(tpl.content.cloneNode(true));
  APP.page = pageId;

  // Aktiv linki rənglə
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  onPageLoad(pageId);
};

// HTML-də çatışmayan funksiyaları əlavə edirik:
window.saveProfile = function() {
  alert("Profil məlumatları yadda saxlanıldı!");
};

window.signOut = function() {
  localStorage.clear();
  location.reload();
};

// ─── CHAT & AI ─────────────────────────────────────────
window.toggleFloatingChat = function() {
  document.getElementById('floating-chat')?.classList.toggle('hidden');
};

window.sendFloatingChat = async function() {
  const input = document.getElementById('floating-chat-input');
  const text = input?.value.trim();
  if (!text) return;
  
  addFloatingChatMsg('self', text);
  input.value = '';

  try {
    const res = await fetch(`${API_URL}/ai/ask`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APP.token}`
      },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    addFloatingChatMsg('other', data.reply);
  } catch (err) {
    addFloatingChatMsg('other', "AI xətası.");
  }
};

function addFloatingChatMsg(sender, text) {
  const box = document.getElementById('floating-chat-msgs');
  if (!box) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${sender}`;
  msgDiv.textContent = text;
  box.appendChild(msgDiv);
  box.scrollTop = box.scrollHeight;
}

// ─── ANIMATION ─────────────────────────────────────────
function initCanvas() {
  const canvas = document.getElementById('auth-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  function animate() {
    ctx.clearRect(0, 0, w, h);
    requestAnimationFrame(animate);
  }
  animate();
}

// ─── SIDEBAR NAV ───────────────────────────────────
const NAV_CONFIG = {
  investor:   [
    { page: 'investor-dash', icon: '🏠', label: 'Dashboard' },
    { page: 'discovery',     icon: '🔍', label: 'Discovery Feed' },
    { page: 'portfolio',     icon: '📊', label: 'Portfolio' },
    { page: 'hackathon',     icon: '🏆', label: 'Hackathons' },
    { page: 'chat',          icon: '💬', label: 'Messages' },
    { page: 'ai-examiner',   icon: '🤖', label: 'AI Examiner' },
  ],
  startup:    [
    { page: 'profile',     icon: '🚀', label: 'My Profile' },
    { page: 'funding',     icon: '💰', label: 'Funding Tracker' },
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'chat',        icon: '💬', label: 'Messages' },
    { page: 'ai-examiner', icon: '🤖', label: 'AI Examiner' },
  ],
  admin:      [
    { page: 'kpi',       icon: '📈', label: 'KPI Dashboard' },
    { page: 'registry',  icon: '📋', label: 'Registry' },
    { page: 'hackathon', icon: '🏆', label: 'Hackathons' },
    { page: 'users',     icon: '👥', label: 'Users' },
    { page: 'audit',     icon: '🔒', label: 'Audit Log' },
  ],
  superadmin: [
    { page: 'kpi',       icon: '📈', label: 'KPI Dashboard' },
    { page: 'registry',  icon: '📋', label: 'Registry' },
    { page: 'hackathon', icon: '🏆', label: 'Hackathons' },
    { page: 'users',     icon: '👥', label: 'Users' },
    { page: 'audit',     icon: '🔒', label: 'Audit Log' },
  ],
};

function buildSidebarNav(role) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  const items = NAV_CONFIG[role] || NAV_CONFIG.investor;
  nav.innerHTML = items.map(i =>
    `<button type="button" class="nav-item" data-page="${i.page}" onclick="navigateTo('${i.page}')">
       <span class="nav-icon">${i.icon}</span><span>${i.label}</span>
     </button>`
  ).join('');
}

// ─── UI HELPERS ────────────────────────────────────
window.toggleSidebar = function() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('hidden');
};

window.closeModal = function() {
  document.getElementById('modal-overlay')?.classList.add('hidden');
};

// ─── DISCOVERY ─────────────────────────────────────
const DEMO_STARTUPS = [
  {
    id: 1, companyName: 'FinTechPro', icon: '💳', color: '#00c2a8',
    industry: 'FinTech', stage: 'Series A',
    desc: 'AI-powered cross-border payment infrastructure reducing transaction costs by 60%.',
    raised: 2400000, goal: 5000000, team: 12, founded: 2021,
    risk: 'Medium', reward: 'High', score: 82,
    tags: ['AI', 'Payments', 'B2B'], location: 'Dubai, UAE', status: 'approved'
  },
  {
    id: 2, companyName: 'GreenAI', icon: '🌱', color: '#10b981',
    industry: 'CleanTech', stage: 'Seed',
    desc: 'Machine learning platform for carbon footprint tracking in industrial manufacturing.',
    raised: 800000, goal: 3000000, team: 7, founded: 2022,
    risk: 'High', reward: 'High', score: 74,
    tags: ['AI', 'Sustainability', 'IoT'], location: 'Abu Dhabi, UAE', status: 'approved'
  },
  {
    id: 3, companyName: 'MedVault', icon: '🏥', color: '#6366f1',
    industry: 'HealthTech', stage: 'Pre-Seed',
    desc: 'Blockchain-secured electronic health records system for GCC hospitals.',
    raised: 300000, goal: 1500000, team: 5, founded: 2023,
    risk: 'High', reward: 'Medium', score: 61,
    tags: ['Blockchain', 'Healthcare', 'Security'], location: 'Riyadh, KSA', status: 'pending'
  },
  {
    id: 4, companyName: 'EduQuest', icon: '📚', color: '#f59e0b',
    industry: 'EdTech', stage: 'Series B',
    desc: 'Personalized AI tutoring platform with 500K active students across MENA.',
    raised: 8200000, goal: 12000000, team: 45, founded: 2020,
    risk: 'Low', reward: 'High', score: 91,
    tags: ['AI', 'Education', 'SaaS'], location: 'Cairo, Egypt', status: 'approved'
  },
  {
    id: 5, companyName: 'LogiChain', icon: '📦', color: '#8b5cf6',
    industry: 'Logistics', stage: 'Series A',
    desc: 'End-to-end supply chain automation using autonomous robots and AI routing.',
    raised: 3100000, goal: 6000000, team: 28, founded: 2021,
    risk: 'Low', reward: 'Medium', score: 79,
    tags: ['Robotics', 'AI', 'B2B'], location: 'Bahrain', status: 'approved'
  },
  {
    id: 6, companyName: 'CyberShield', icon: '🛡️', color: '#ef4444',
    industry: 'CyberSec', stage: 'Seed',
    desc: 'Zero-trust security platform designed for SMEs with real-time threat intelligence.',
    raised: 650000, goal: 2000000, team: 9, founded: 2022,
    risk: 'Medium', reward: 'High', score: 77,
    tags: ['Security', 'SaaS', 'B2B'], location: 'Dubai, UAE', status: 'approved'
  },
];

let selectedStartup = null;

function formatMoney(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(0)    + 'K';
  return '$' + n;
}

window.renderDiscovery = function() {
  filterStartups();
};

window.filterStartups = function() {
  const ind   = document.getElementById('f-industry')?.value || '';
  const stage = document.getElementById('f-stage')?.value    || '';
  const risk  = document.getElementById('f-risk')?.value     || '';
  const filtered = DEMO_STARTUPS.filter(s =>
    (!ind   || s.industry === ind)   &&
    (!stage || s.stage    === stage) &&
    (!risk  || s.risk     === risk)
  );
  const grid = document.getElementById('startup-grid');
  if (!grid) return;

  const countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = `${filtered.length} startups`;

  grid.innerHTML = filtered.map(s => {
    const pct       = Math.round(s.raised / s.goal * 100);
    const riskBadge = s.risk === 'Low' ? 'badge-emerald' : s.risk === 'Medium' ? 'badge-gold' : 'badge-red';
    const scoreClr  = s.score > 80 ? '#10b981' : s.score > 65 ? '#f59e0b' : '#ef4444';
    return `
      <div class="startup-card" onclick="openStartupModal(${s.id})">
        <div class="startup-header">
          <div class="startup-logo" style="background:${s.color}20;font-size:22px;">${s.icon}</div>
          <div class="startup-info">
            <div class="startup-name">${s.companyName}</div>
            <div class="startup-industry">${s.industry} · ${s.location}</div>
          </div>
        </div>
        <div class="startup-desc">${s.desc}</div>
        <div class="startup-meta">
          <span class="badge badge-navy">📍 ${s.stage}</span>
          <span class="badge ${riskBadge}">${s.risk} Risk</span>
          <span class="badge badge-teal">${s.reward} Reward</span>
        </div>
        <div class="startup-stats">
          <div class="stat-item"><div class="stat-label">Raised</div><div class="sval" style="color:#00c2a8;">${formatMoney(s.raised)}</div></div>
          <div class="stat-item"><div class="stat-label">Goal</div><div class="sval">${formatMoney(s.goal)}</div></div>
          <div class="stat-item"><div class="stat-label">Team</div><div class="sval">${s.team} people</div></div>
          <div class="stat-item"><div class="stat-label">AI Score</div><div class="sval" style="color:${scoreClr};">${s.score}/100</div></div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:6px;">
          <span>${pct}% funded</span><span>Est. ${s.founded}</span>
        </div>
      </div>`;
  }).join('') || '<div style="color:var(--text-muted);padding:40px;text-align:center;grid-column:1/-1;">No startups match the selected filters.</div>';
};

window.openStartupModal = function(id) {
  selectedStartup = DEMO_STARTUPS.find(s => s.id === id);
  if (!selectedStartup) return;
  const s = selectedStartup;

  document.getElementById('modal-startup-name').textContent = s.companyName;
  document.getElementById('modal-startup-meta').textContent = `${s.industry} · ${s.stage} · ${s.location}`;

  const logoEl = document.getElementById('modal-startup-logo');
  Object.assign(logoEl.style, { background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' });
  logoEl.textContent = s.icon;

  const scoreClr = s.score > 80 ? '#10b981' : s.score > 65 ? '#f59e0b' : '#ef4444';
  const pct = Math.round(s.raised / s.goal * 100);

  document.getElementById('modal-startup-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div style="padding:16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">RAISED</div>
        <div style="font-size:22px;font-weight:800;color:#00c2a8;">${formatMoney(s.raised)}</div>
        <div style="font-size:12px;color:var(--text-secondary);">of ${formatMoney(s.goal)} goal</div>
      </div>
      <div style="padding:16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">AI SCORE</div>
        <div style="font-size:22px;font-weight:800;color:${scoreClr};">${s.score}<span style="font-size:14px;font-weight:500;color:var(--text-muted);">/100</span></div>
        <div style="font-size:12px;color:var(--text-secondary);">${s.score > 80 ? 'Excellent' : 'Good'} potential</div>
      </div>
    </div>
    <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">${s.desc}</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
      ${s.tags.map(t => `<span class="badge badge-navy">#${t}</span>`).join('')}
      <span class="badge badge-teal">✅ Verified</span>
      <span class="badge badge-emerald">🔒 Encrypted</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:4px;">
      ${[['Team Size', s.team], ['Founded', s.founded], ['Funded', pct + '%']].map(([l, v]) => `
        <div style="text-align:center;padding:12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);">
          <div style="font-size:18px;font-weight:800;color:var(--text-primary);">${v}</div>
          <div style="font-size:11px;color:var(--text-muted);">${l}</div>
        </div>`).join('')}
    </div>`;

  document.getElementById('modal-ai-content').innerHTML =
    '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Click "Run AI Analysis" to generate risk & reward assessment</div>';
  document.getElementById('startup-modal').classList.remove('hidden');
};

window.closeStartupModal = function() { document.getElementById('startup-modal').classList.add('hidden'); };

window.openInvestModal = function(id) {
  if (id) selectedStartup = DEMO_STARTUPS.find(s => s.id === id) || selectedStartup;
  if (!selectedStartup) return;
  closeStartupModal();
  document.getElementById('invest-startup-name').textContent = `Investing in: ${selectedStartup.companyName}`;
  document.getElementById('invest-amount').value = '';
  document.getElementById('fee-breakdown').style.display = 'none';
  document.getElementById('invest-modal').classList.remove('hidden');
};
window.closeInvestModal = function() { document.getElementById('invest-modal').classList.add('hidden'); };

window.calcFee = function() {
  const amt = parseFloat(document.getElementById('invest-amount').value) || 0;
  const fb  = document.getElementById('fee-breakdown');
  if (amt > 0) {
    const fee = amt * 0.01;
    fb.style.display = 'block';
    document.getElementById('fb-amount').textContent = '$' + amt.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('fb-fee').textContent    = '$' + fee.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('fb-total').textContent  = '$' + (amt + fee).toLocaleString('en-US', { minimumFractionDigits: 2 });
  } else {
    fb.style.display = 'none';
  }
};

window.confirmInvest = function() {
  const amt = parseFloat(document.getElementById('invest-amount').value) || 0;
  if (amt <= 0) { alert('Please enter a valid amount.'); return; }
  closeInvestModal();
  // Show confirmation toast
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10b981;color:#fff;padding:14px 20px;border-radius:12px;font-weight:600;font-size:14px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:fadeIn 0.3s ease;';
  toast.textContent = `✅ Investment of $${amt.toLocaleString()} in ${selectedStartup.companyName} confirmed!`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};

window.runModalAIAnalysis = async function() {
  if (!selectedStartup) return;
  const s = selectedStartup;
  const box = document.getElementById('modal-ai-content');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">🤖 Analysing…</div>';
  try {
    const res = await fetch(`${API_URL}/ai/ask`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Analyse this startup: ${s.companyName} in ${s.industry}, ${s.stage} stage. Score: ${s.score}/100. Risk: ${s.risk}. Raised ${formatMoney(s.raised)} of ${formatMoney(s.goal)}. Give brief investment recommendation.` })
    });
    const data = await res.json();
    const reply = data.reply || data.error || 'Unable to analyse at this time.';
    box.innerHTML = `<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;font-size:13px;line-height:1.6;color:var(--text-secondary);">${reply}</div>`;
  } catch {
    box.innerHTML = `<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;font-size:13px;color:var(--text-secondary);">AI service unavailable. Review the metrics above to make your assessment.</div>`;
  }
};

window.filterStartupsByAI = async function() {
  // kept for compatibility — not used in new discovery template
};

// ─── AI EXAMINER (SES reference version) ──────────
let aiExaminerMessages = [];

window.renderAIExaminer = function() {
  aiExaminerMessages = [{
    from: 'assistant',
    text: '👋 Hello! I\'m your AI Product Examiner powered by GPT-4. Share your pitch, product details, or any specific aspect you\'d like me to analyze — I\'ll give you instant feedback, market analysis, and improvement tips.'
  }];

  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">AI Product Examiner</h1><p class="page-sub">GPT-4 powered pitch analysis &amp; feedback</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start;">
      <div class="ai-chat-box">
        <div class="ai-chat-header">
          <div class="ai-badge"><div class="ai-dot"></div> AI Product Examiner</div>
          <span style="font-size:12px;color:var(--text-muted);">GPT-4 Powered · Instant Analysis</span>
        </div>
        <div class="ai-messages" id="ai-messages-area">${_renderAIExaminerMsgs()}</div>
        <div class="ai-input-row">
          <input class="form-input" id="ai-examiner-input" placeholder="Describe your product, pitch, or ask for feedback…" onkeydown="if(event.key==='Enter')sendAIExaminerMsg()" style="flex:1;margin-bottom:0;" />
          <button type="button" class="btn-primary" style="padding:9px 16px;white-space:nowrap;" onclick="sendAIExaminerMsg()">▶ Send</button>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:14px;">💡 Quick Prompts</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${["Analyze my pitch deck for investors","Review my go-to-market strategy","What are my biggest risks?","How to improve my product positioning?","Competitive analysis for FinTech in MENA"].map(q => `
              <button type="button" style="text-align:left;padding:9px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text-secondary);cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor=\'#00c2a8\';this.style.color=\'#00c2a8\'" onmouseout="this.style.borderColor=\'\';this.style.color=\'\';" onclick="quickExaminerPrompt(\'${q.replace(/'/g,"\\'")}\')"> ${q}</button>`).join('')}
          </div>
        </div>
        <div class="card">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;">📊 About This Tool</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">The AI examines market fit, competitive positioning, pitch clarity, risk factors, and provides actionable improvement tips tailored to MENA investors.</div>
        </div>
      </div>
    </div>`;
};

function _renderAIExaminerMsgs() {
  return aiExaminerMessages.map(m =>
    `<div class="ai-msg ${m.from}" style="border-radius:10px;padding:10px 14px;font-size:13px;line-height:1.6;${m.from==='user'?'align-self:flex-end;max-width:80%;':'align-self:flex-start;max-width:90%;'}">${m.text}</div>`
  ).join('');
}

window.quickExaminerPrompt = function(q) {
  const input = document.getElementById('ai-examiner-input');
  if (input) { input.value = q; sendAIExaminerMsg(); }
};

window.sendAIExaminerMsg = async function() {
  const input = document.getElementById('ai-examiner-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  aiExaminerMessages.push({ from: 'user', text });

  const area = document.getElementById('ai-messages-area');
  if (!area) return;
  area.innerHTML = _renderAIExaminerMsgs() +
    '<div style="display:flex;gap:4px;align-items:center;padding:10px 14px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;align-self:flex-start;">' +
    '<span style="width:6px;height:6px;background:#00c2a8;border-radius:50%;animation:pulse 1.4s ease infinite;display:inline-block;"></span>' +
    '<span style="width:6px;height:6px;background:#00c2a8;border-radius:50%;animation:pulse 1.4s ease 0.2s infinite;display:inline-block;"></span>' +
    '<span style="width:6px;height:6px;background:#00c2a8;border-radius:50%;animation:pulse 1.4s ease 0.4s infinite;display:inline-block;"></span>' +
    '</div>';
  area.scrollTop = area.scrollHeight;

  try {
    const res = await fetch(`${API_URL}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    const reply = data.reply || data.error || 'Unable to analyse at this time.';
    aiExaminerMessages.push({ from: 'assistant', text: reply });
  } catch {
    const fallbacks = {
      pitch:  'Your pitch has solid fundamentals. To strengthen it: 1) Lead with the problem size (TAM), 2) Quantify your traction with specific metrics, 3) Show a clear path to profitability, 4) Highlight your unfair competitive advantage.',
      risk:   'Key risks to address: 1) Market timing risk — validate demand NOW, 2) Execution risk — ensure your team covers all critical functions, 3) Regulatory risk — map compliance requirements early, 4) Competition risk — identify your 3 closest competitors.',
      market: 'MENA market is growing fast. Focus on UAE & Saudi Arabia as primary markets (80% of regional investment), strong mobile-first demographics, and increasing regulatory support through ADGM & DIFC sandboxes.',
    };
    const key = Object.keys(fallbacks).find(k => text.toLowerCase().includes(k)) || 'pitch';
    aiExaminerMessages.push({ from: 'assistant', text: fallbacks[key] });
  }
  area.innerHTML = _renderAIExaminerMsgs();
  area.scrollTop = area.scrollHeight;
};
// ─── SOCKET.IO CHAT ────────────────────────────────
let socket = null;

function initSocket() {
  if (socket || !APP.userData?.id) return;
  try {
    socket = io('http://localhost:5000');
    socket.emit('join_room', APP.userData.id);
    socket.on('receive_message', (msg) => {
      appendChatMessage('other', msg.content);
    });
  } catch (e) {
    console.warn('Socket.io not available:', e);
  }
}

window.sendMessage = function() {
  const input = document.getElementById('chat-input');
  const text  = input?.value.trim();
  if (!text) return;

  appendChatMessage('self', text);
  input.value = '';

  if (socket && APP.userData?.id) {
    socket.emit('send_message', {
      senderId:   APP.userData.id,
      receiverId: 'demo',
      content:    text
    });
  }
};

function appendChatMessage(sender, text) {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  const div = document.createElement('div');
  div.style.cssText = `padding:8px 14px;margin:4px 0;border-radius:12px;max-width:70%;word-break:break-word;${
    sender === 'self'
      ? 'margin-left:auto;background:#3B82F6;color:#fff;border-bottom-right-radius:2px'
      : 'background:rgba(255,255,255,0.07);border-bottom-left-radius:2px'
  }`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ─── KPI CHARTS ────────────────────────────────────
function initKPICharts() {
  const bar = (labels, data, color) => ({
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 6, borderSkipped: false }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  const inv = document.getElementById('chart-investment');
  const usr = document.getElementById('chart-users');
  const ind = document.getElementById('chart-industry');
  const com = document.getElementById('chart-commission');
  if (inv) new Chart(inv, bar(months, [2.1,3.4,2.8,4.2,5.1,4.8], '#3B82F6'));
  if (usr) new Chart(usr, bar(months, [120,180,240,310,420,580], '#06B6D4'));
  if (ind) new Chart(ind, {
    type: 'doughnut',
    data: { labels: ['HealthTech','FinTech','CleanTech','EdTech','Other'], datasets: [{ data: [30,25,20,15,10], backgroundColor: ['#3B82F6','#06B6D4','#10B981','#F59E0B','#6366F1'] }] },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8' } } } }
  });
  if (com) new Chart(com, bar(months, [45,72,58,89,103,94], '#10B981'));
}

// ─── ADMIN KPI ────────────────────────────────────
function renderKPI() {
  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">KPI Dashboard</h1><p class="page-sub">Platform performance overview</p></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card teal"><div class="kpi-icon">💰</div><div class="kpi-value">$24.7M</div><div class="kpi-label">Total Platform Investments</div><div class="kpi-change up">↑ +12.4% this quarter</div></div>
      <div class="kpi-card emerald"><div class="kpi-icon">🚀</div><div class="kpi-value">247</div><div class="kpi-label">Registered Startups</div><div class="kpi-change up">↑ +18 this month</div></div>
      <div class="kpi-card gold"><div class="kpi-icon">⚙️</div><div class="kpi-value">$247K</div><div class="kpi-label">Commission Revenue (1%)</div><div class="kpi-change up">↑ On track</div></div>
      <div class="kpi-card red"><div class="kpi-icon">👥</div><div class="kpi-value">1,842</div><div class="kpi-label">Active Users</div><div class="kpi-change up">↑ +234 this month</div></div>
    </div>
    <div class="chart-grid">
      <div class="card"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">📈 Investment Volume</div><span class="badge badge-teal">Monthly</span></div><canvas id="invest-chart" height="200"></canvas></div>
      <div class="card"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">🥧 Startups by Industry</div></div><canvas id="industry-chart" height="200"></canvas></div>
    </div>
    <div class="chart-grid">
      <div class="card"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">👥 User Growth</div><span class="badge badge-navy">Last 6 Months</span></div><canvas id="users-chart" height="180"></canvas></div>
      <div class="card"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">💎 Commission Revenue</div></div><canvas id="commission-chart" height="180"></canvas></div>
    </div>`;
  setTimeout(drawAdminCharts, 50);
}

function drawAdminCharts() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.4)';

  function drawBar(id, labels, data, fill, stroke) {
    const canvas = document.getElementById(id); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 400; const H = canvas.offsetHeight || 200;
    canvas.width = W; canvas.height = H; ctx.clearRect(0,0,W,H);
    const pad = {t:20,r:20,b:40,l:40}, cw=W-pad.l-pad.r, ch=H-pad.t-pad.b;
    const max = Math.max(...data)*1.2, gap=cw/labels.length, bw=gap*0.6;
    ctx.strokeStyle=gridColor; ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();ctx.fillStyle=labelColor;ctx.font='10px Plus Jakarta Sans';ctx.textAlign='right';ctx.fillText((max/4*i).toFixed(1)+'M',pad.l-5,y+4);}
    data.forEach((v,i)=>{const x=pad.l+gap*i+(gap-bw)/2,bh=(v/max)*ch,y=pad.t+ch-bh;const g=ctx.createLinearGradient(0,y,0,y+bh);g.addColorStop(0,stroke);g.addColorStop(1,fill);ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,bw,bh,4);ctx.fill();ctx.fillStyle=labelColor;ctx.textAlign='center';ctx.font='11px Plus Jakarta Sans';ctx.fillText(labels[i],pad.l+gap*i+gap/2,H-pad.b+16);});
  }
  function drawLine(id, labels, data, color) {
    const canvas = document.getElementById(id); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 400; const H = canvas.offsetHeight || 180;
    canvas.width = W; canvas.height = H; ctx.clearRect(0,0,W,H);
    const pad={t:20,r:20,b:35,l:50}, cw=W-pad.l-pad.r, ch=H-pad.t-pad.b;
    const max=Math.max(...data)*1.1, min=Math.min(...data)*0.9;
    const pts=data.map((v,i)=>({x:pad.l+(i/(labels.length-1))*cw,y:pad.t+ch-((v-min)/(max-min))*ch}));
    const g=ctx.createLinearGradient(0,pad.t,0,pad.t+ch);g.addColorStop(0,color+'44');g.addColorStop(1,color+'00');
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,pad.t+ch);ctx.lineTo(pts[0].x,pad.t+ch);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke();
    pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=isDark?'#1C2128':'#fff';ctx.lineWidth=2;ctx.stroke();});
    ctx.fillStyle=labelColor;ctx.font='11px Plus Jakarta Sans';ctx.textAlign='center';labels.forEach((l,i)=>ctx.fillText(l,pts[i].x,H-5));
  }
  function drawDoughnut(id, labels, data, colors) {
    const canvas=document.getElementById(id);if(!canvas)return;
    const ctx=canvas.getContext('2d');const W=canvas.offsetWidth||400,H=canvas.offsetHeight||200;
    canvas.width=W;canvas.height=H;const cx=W*0.38,cy=H/2,r=Math.min(cx,cy)-16,ir=r*0.55,total=data.reduce((a,b)=>a+b,0);
    let ang=-Math.PI/2;
    data.forEach((v,i)=>{const sl=(v/total)*2*Math.PI;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ang,ang+sl);ctx.fillStyle=colors[i];ctx.fill();ctx.beginPath();ctx.arc(cx,cy,ir,0,Math.PI*2);ctx.fillStyle=isDark?'#1C2128':'#fff';ctx.fill();ang+=sl;});
    const lx=W*0.68,ly=H/2-(labels.length*18)/2;
    labels.forEach((l,i)=>{ctx.fillStyle=colors[i];ctx.fillRect(lx,ly+i*20,10,10);ctx.fillStyle=isDark?'rgba(255,255,255,0.7)':'rgba(15,23,42,0.7)';ctx.font='11px Plus Jakarta Sans';ctx.textAlign='left';ctx.fillText(l+' ('+data[i]+'%)',lx+15,ly+i*20+9);});
  }
  drawBar('invest-chart',     ['Jan','Feb','Mar','Apr','May','Jun'], [1.8,2.4,1.9,3.2,2.8,4.1], 'rgba(0,194,168,0.7)',   '#00c2a8');
  drawDoughnut('industry-chart', ['FinTech','EdTech','HealthTech','CleanTech','Logistics','CyberSec'],[28,22,18,14,11,7],['#00c2a8','#10b981','#6366f1','#f59e0b','#8b5cf6','#ef4444']);
  drawLine('users-chart',     ['Sep','Oct','Nov','Dec','Jan','Feb'], [980,1120,1280,1450,1608,1842], '#10b981');
  drawBar('commission-chart', ['Sep','Oct','Nov','Dec','Jan','Feb'], [18,24,19,32,28,41],           'rgba(245,158,11,0.7)', '#f59e0b');
}

// ─── PAGE INIT ─────────────────────────────────────
function onPageLoad(pageId) {
  if (pageId === 'discovery')     { renderDiscovery(); }
  if (pageId === 'kpi')           { renderKPI(); }
  if (pageId === 'portfolio')     { renderPortfolio(); }
  if (pageId === 'registry')      { renderRegistry(); }
  if (pageId === 'users')         { renderUsers(); }
  if (pageId === 'audit')         { renderAudit(); }
  if (pageId === 'hackathon')     { renderHackathon(); }
  if (pageId === 'investor-dash') { renderInvestorDash(); }
  if (pageId === 'ai-examiner')   { renderAIExaminer(); }
}

function statCard(label, value, badge) {
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${badge ? `<span class="badge badge-green badge-xs" style="margin-top:6px">${badge}</span>` : ''}</div>`;
}

// ─── PORTFOLIO ─────────────────────────────────────
function renderPortfolio() {
  const stats = document.getElementById('portfolio-stats');
  const tbody = document.getElementById('portfolio-table');
  if (stats) stats.innerHTML =
    statCard('Total Invested', '$2.4M', '↑ 12%') +
    statCard('Current Value',  '$3.1M', '↑ 29%') +
    statCard('Active Deals',   '6')               +
    statCard('Avg ROI',        '28.4%', '↑ 4.2%');

  const rows = [
    { name: 'NovaMed AI',  invested: '$500K', value: '$720K', roi: '+44%',  status: 'Active'  },
    { name: 'FinFlow',     invested: '$300K', value: '$410K', roi: '+37%',  status: 'Active'  },
    { name: 'GreenGrid',   invested: '$250K', value: '$190K', roi: '-24%',  status: 'Watch'   },
    { name: 'EduVerse',    invested: '$400K', value: '$520K', roi: '+30%',  status: 'Active'  },
    { name: 'SecureNet',   invested: '$600K', value: '$820K', roi: '+37%',  status: 'Active'  },
    { name: 'LogiTrack',   invested: '$350K', value: '$440K', roi: '+26%',  status: 'Active'  },
  ];
  if (tbody) tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.name}</strong></td>
      <td>${r.invested}</td>
      <td>${r.value}</td>
      <td style="color:${r.roi.startsWith('-') ? '#EF4444' : '#10B981'}">${r.roi}</td>
      <td><span class="badge ${r.status === 'Active' ? 'badge-green' : 'badge-blue'} badge-xs">${r.status}</span></td>
    </tr>`).join('');
}

// ─── REGISTRY ──────────────────────────────────────
let PENDING_STARTUPS = [
  { name: 'AgroBot',       industry: 'AgriTech',  stage: 'Seed',     date: '2025-02-19', status: 'pending'  },
  { name: 'TravelAI',      industry: 'Travel',    stage: 'Pre-Seed', date: '2025-02-18', status: 'pending'  },
  { name: 'LegalTech Pro', industry: 'LegalTech', stage: 'Series A', date: '2025-02-17', status: 'approved' },
];

function renderRegistry() {
  const main = document.getElementById('page-content');
  if (!main) return;
  const pending = PENDING_STARTUPS.filter(s => s.status === 'pending').length;
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Registry &amp; Approvals</h1><p class="page-sub">Manage startup applications and programs</p></div>
    </div>
    <div style="display:grid;gap:20px;">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">�� Startup Applications</div>
          <span class="badge badge-gold">${pending} Pending</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Startup Name</th><th>Industry</th><th>Stage</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${PENDING_STARTUPS.map((s,i) => `
                <tr>
                  <td class="td-primary"><strong>${s.name}</strong></td>
                  <td>${s.industry}</td>
                  <td><span class="badge badge-navy">${s.stage}</span></td>
                  <td>${s.date}</td>
                  <td><span class="badge ${s.status === 'approved' ? 'badge-emerald' : 'badge-gold'}">${s.status === 'approved' ? '✅ Approved' : '⏳ Pending'}</span></td>
                  <td style="display:flex;gap:6px;">
                    <button type="button" class="btn-approve" onclick="approveStartupApp(${i})">Approve</button>
                    <button type="button" class="btn-reject" onclick="rejectStartupApp(${i})">Reject</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">🎓 Incubation / Acceleration Programs</div>
          <button type="button" class="btn-ghost btn-sm" onclick="showToastMsg('✅','New program created!')">+ New Program</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Program</th><th>Cohort</th><th>Startups</th><th>Start Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${[['SES Accelerate','2025 Q1',12,'2025-01-15','Active'],['GreenTech Incubator','2024 Q4',8,'2024-10-01','Completed'],['FinTech Fast Track','2025 Q2',0,'2025-04-01','Recruiting']].map(([n,c,s,d,st])=>`
                <tr>
                  <td class="td-primary"><strong>${n}</strong></td><td>${c}</td><td>${s} startups</td><td>${d}</td>
                  <td><span class="badge ${st==='Active'?'badge-emerald':st==='Completed'?'badge-navy':'badge-gold'}">● ${st}</span></td>
                  <td><button type="button" class="btn-ghost btn-sm" onclick="showToastMsg('✅','Opening program…')">Manage</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

window.approveStartupApp = function(i) {
  PENDING_STARTUPS[i].status = 'approved';
  renderRegistry();
  showToastMsg('✅', PENDING_STARTUPS[i].name + ' approved!');
};
window.rejectStartupApp = function(i) {
  const name = PENDING_STARTUPS[i].name;
  PENDING_STARTUPS.splice(i, 1);
  renderRegistry();
  showToastMsg('🗑️', name + ' application rejected.');
};
function showToastMsg(icon, msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:14px 20px;border-radius:12px;font-size:14px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);display:flex;gap:8px;align-items:center;';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── USERS ─────────────────────────────────────────
let USERS_DATA = [
  { name: 'Sarah Chen',     email: 'sarah@fintechpro.io',   role: 'Startup',  joined: '2024-01-15', status: 'Active'    },
  { name: 'Alex Morgan',    email: 'alex@meridian.vc',       role: 'Investor', joined: '2024-02-20', status: 'Active'    },
  { name: 'Omar Al-Rashid', email: 'omar@ses.com',           role: 'Compliance Officer', joined: '2023-11-08', status: 'Active'    },
  { name: 'Priya Sharma',   email: 'priya@greenai.tech',     role: 'Startup',  joined: '2024-03-12', status: 'Active'    },
  { name: 'Unknown User',   email: 'suspicious@domain.io',   role: 'Startup',  joined: '2025-02-20', status: 'Suspended' },
  { name: 'EduQuest Team',  email: 'team@eduquest.me',       role: 'Startup',  joined: '2024-05-11', status: 'Active'    },
  { name: 'James Wu',       email: 'james@tigercapital.com', role: 'Investor', joined: '2024-07-03', status: 'Active'    },
  { name: 'Fatima Al-Zahra',email: 'fatima@ses.com',         role: 'Compliance Officer', joined: '2023-09-01', status: 'Active'    },
];

function renderUsers() {
  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">User Management</h1><p class="page-sub">All registered platform users</p></div>
      <button type="button" class="btn-ghost btn-sm" onclick="showToastMsg('✅','Invite sent!')">+ Invite User</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="users-tbody">
            ${_renderUsersRows()}
          </tbody>
        </table>
      </div>
    </div>`;
}

function _renderUsersRows() {
  return USERS_DATA.map((u, i) => {
    const isAdmin = u.role === 'Compliance Officer';
    const isSuspended = u.status === 'Suspended';
    const roleColor = isAdmin ? '#6366f1' : u.role === 'Investor' ? '#00c2a8' : '#10b981';
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;">
          <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${roleColor},${roleColor}99);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">${u.name.charAt(0)}</div>
          <div>
            <div class="td-primary">${u.name}</div>
            ${isAdmin ? '<div style="font-size:10px;color:#6366f1;font-weight:600;">COMPLIANCE</div>' : ''}
          </div>
        </div></td>
        <td style="color:var(--text-muted);font-size:13px;">${u.email}</td>
        <td><span class="badge" style="background:${roleColor}15;color:${roleColor};border:1px solid ${roleColor}30;">${u.role}</span></td>
        <td style="font-size:13px;">${u.joined}</td>
        <td><span class="badge ${isSuspended ? 'badge-red' : 'badge-emerald'}">● ${u.status}</span></td>
        <td style="display:flex;gap:6px;align-items:center;">
          <button type="button" class="btn-ghost btn-sm" onclick="showToastMsg('✅','User updated!')">Edit</button>
          <button type="button" class="${isSuspended ? 'btn-approve' : 'btn-reject'}" style="font-family:inherit;cursor:pointer;" onclick="toggleUserStatus(${i})">${isSuspended ? 'Activate' : 'Suspend'}</button>
          ${isAdmin ? `<button type="button" class="btn-reject" style="font-family:inherit;cursor:pointer;background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);color:#6366f1;" onclick="toggleUserStatus(${i})">${isSuspended ? '↑ Restore Officer' : '🔒 Suspend Officer'}</button>` : ''}
        </td>
      </tr>`;
  }).join('');
}

window.toggleUserStatus = function(i) {
  USERS_DATA[i].status = USERS_DATA[i].status === 'Active' ? 'Suspended' : 'Active';
  const tbody = document.getElementById('users-tbody');
  if (tbody) tbody.innerHTML = _renderUsersRows();
  const name = USERS_DATA[i].name;
  const newStatus = USERS_DATA[i].status;
  showToastMsg(newStatus === 'Suspended' ? '🔒' : '✅', `${name} is now ${newStatus}.`);
};

// ─── AUDIT ─────────────────────────────────────────
const AUDIT_LOGS = [
  { ts: '2025-02-21 09:14:32', user: 'compliance@ses.com',  action: 'Approved startup: MedVault',       ip: '10.0.1.12',   level: 'INFO'  },
  { ts: '2025-02-21 08:45:19', user: 'ecosystem@ses.com',   action: 'Updated commission rate to 1%',    ip: '10.0.1.1',    level: 'WARN'  },
  { ts: '2025-02-21 08:12:07', user: 'investor@ses.com',   action: 'Investment $50,000 → EduQuest',    ip: '172.16.0.45', level: 'INFO'  },
  { ts: '2025-02-20 18:30:55', user: 'unknown',            action: 'Failed login attempt (x3)',         ip: '185.23.44.1', level: 'ALERT' },
  { ts: '2025-02-20 15:09:41', user: 'startup@ses.com',    action: 'Profile updated: FinTechPro',       ip: '10.0.2.88',   level: 'INFO'  },
];

function renderAudit() {
  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Security &amp; Audit</h1><p class="page-sub">Compliance and incident management</p></div>
    </div>
    <div style="display:grid;gap:20px;">
      <div class="kpi-grid" style="margin-bottom:0;">
        <div class="kpi-card emerald"><div class="kpi-icon">✅</div><div class="kpi-value">99.8%</div><div class="kpi-label">Platform Uptime</div></div>
        <div class="kpi-card gold"><div class="kpi-icon">⚠️</div><div class="kpi-value">1</div><div class="kpi-label">Active Alerts</div></div>
        <div class="kpi-card teal"><div class="kpi-icon">🔐</div><div class="kpi-value">Encrypted</div><div class="kpi-label">Data Status</div></div>
        <div class="kpi-card red"><div class="kpi-icon">🚨</div><div class="kpi-value">3</div><div class="kpi-label">Failed Login Attempts</div></div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">🔐 Audit Logs</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Real-time security event monitoring</div>
          </div>
          <div style="display:flex;gap:6px;">
            <span class="badge badge-emerald">🟢 System Normal</span>
            <button type="button" class="btn-ghost btn-sm" onclick="showToastMsg('📥','Exporting logs…')">Export CSV</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>IP Address</th><th>Level</th></tr></thead>
            <tbody>
              ${AUDIT_LOGS.map(l => `
                <tr>
                  <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${l.ts}</td>
                  <td>${l.user}</td><td>${l.action}</td>
                  <td style="font-family:monospace;font-size:12px;">${l.ip}</td>
                  <td><span class="badge ${l.level==='INFO'?'badge-navy':l.level==='WARN'?'badge-gold':'badge-red'}">${l.level}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">🚨 Incident Management</div>
          <button type="button" class="btn-ghost btn-sm" onclick="showToastMsg('✅','Incident created!')">+ New Incident</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Incident ID</th><th>Description</th><th>Severity</th><th>Assigned To</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td><code>#INC-2025-044</code></td><td>Brute force login attempt from 185.23.44.1</td><td><span class="badge badge-red">HIGH</span></td><td>Security Team</td><td><span class="badge badge-gold">⚠️ Investigating</span></td></tr>
              <tr><td><code>#INC-2025-041</code></td><td>Unusual API call volume at 3AM</td><td><span class="badge badge-gold">MEDIUM</span></td><td>DevOps</td><td><span class="badge badge-emerald">✅ Resolved</span></td></tr>
              <tr><td><code>#INC-2025-038</code></td><td>SSL certificate expiry warning</td><td><span class="badge badge-navy">LOW</span></td><td>Compliance Officer</td><td><span class="badge badge-emerald">✅ Resolved</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ─── HACKATHON MANAGEMENT ─────────────────────────
const HACKATHON_EVENTS = [
  {
    id: 1, name: 'SES Startup Hackathon 2026', theme: 'AI for Social Good',
    date: '2026-03-15', endDate: '2026-03-17', location: 'Dubai, UAE',
    prize: '$50,000', spots: 200, registered: 143,
    status: 'open', tags: ['AI','Impact','HealthTech'],
    desc: 'Build AI-powered solutions tackling the MENA region\'s most pressing social challenges. 48-hour sprint with mentors from top VC firms.',
    color: '#00c2a8', icon: '🤖'
  },
  {
    id: 2, name: 'FinTech Innovation Cup', theme: 'Future of Payments',
    date: '2026-04-05', endDate: '2026-04-06', location: 'Abu Dhabi, UAE',
    prize: '$30,000', spots: 120, registered: 87,
    status: 'open', tags: ['FinTech','Blockchain','Payments'],
    desc: 'Reimagine the future of cross-border payments and digital finance. Sponsored by regional banks and fintech investors.',
    color: '#6366f1', icon: '💳'
  },
  {
    id: 3, name: 'GreenTech Challenge', theme: 'CleanTech Solutions',
    date: '2026-05-20', endDate: '2026-05-22', location: 'Riyadh, KSA',
    prize: '$40,000', spots: 150, registered: 61,
    status: 'open', tags: ['CleanTech','Sustainability','IoT'],
    desc: 'Build the next generation of climate and sustainability tech for the Gulf region. Partner with government and enterprise stakeholders.',
    color: '#10b981', icon: '🌱'
  },
  {
    id: 4, name: 'HealthTech Hackathon MENA', theme: 'Digital Health Innovation',
    date: '2026-06-10', endDate: '2026-06-12', location: 'Cairo, Egypt',
    prize: '$25,000', spots: 100, registered: 100,
    status: 'full', tags: ['HealthTech','AI','MedTech'],
    desc: 'Solve critical healthcare delivery challenges across MENA using digital tools, AI diagnostics, and telemedicine innovations.',
    color: '#ef4444', icon: '🏥'
  },
];

let HACK_TEAMS = [
  {
    id: 1, hackId: 1, name: 'NeuralNomads', tagline: 'AI for mental health access',
    members: [{name:'Amir K.',role:'CEO',avatar:'AK'},{name:'Sara M.',role:'ML',avatar:'SM'},{name:'James L.',role:'FE',avatar:'JL'}],
    maxMembers: 5, lookingFor: ['Backend Dev','UX Designer'],
    color: '#00c2a8'
  },
  {
    id: 2, hackId: 1, name: 'DataForge', tagline: 'Open datasets for NGOs',
    members: [{name:'Layla H.',role:'CTO',avatar:'LH'},{name:'Omar S.',role:'Data',avatar:'OS'}],
    maxMembers: 4, lookingFor: ['Full Stack Dev','Business Analyst','Designer'],
    color: '#6366f1'
  },
  {
    id: 3, hackId: 2, name: 'CryptoPay', tagline: 'Zero-fee cross-border rails',
    members: [{name:'Rania A.',role:'CEO',avatar:'RA'},{name:'Zaid T.',role:'Blockchain',avatar:'ZT'},{name:'Nour F.',role:'BE',avatar:'NF'},{name:'Ali M.',role:'FE',avatar:'AM'}],
    maxMembers: 5, lookingFor: ['Product Manager'],
    color: '#f59e0b'
  },
  {
    id: 4, hackId: 2, name: 'FlowLedger', tagline: 'Real-time settlement protocol',
    members: [{name:'Hana K.',role:'CTO',avatar:'HK'}],
    maxMembers: 4, lookingFor: ['Backend Dev','Blockchain Dev','Designer'],
    color: '#8b5cf6'
  },
  {
    id: 5, hackId: 3, name: 'SolarGrid', tagline: 'P2P energy trading for MENA',
    members: [{name:'Tariq N.',role:'CEO',avatar:'TN'},{name:'Dina W.',role:'IoT',avatar:'DW'},{name:'Karim B.',role:'ML',avatar:'KB'}],
    maxMembers: 5, lookingFor: ['Frontend Dev','Go-to-Market'],
    color: '#10b981'
  },
  {
    id: 6, hackId: 1, name: 'MindBridge', tagline: 'AI counseling for universities',
    members: [{name:'Yasmin R.',role:'CEO',avatar:'YR'},{name:'Faisal Q.',role:'AI',avatar:'FQ'}],
    maxMembers: 5, lookingFor: ['Backend Dev','UX Designer','Psychiatry Advisor'],
    color: '#ef4444'
  },
];

let hackActiveTab = 'events';
let hackFilterId  = 'all';

function _hackCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return '<span style="color:var(--text-muted);">Ended</span>';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `<span style="color:#f59e0b;font-weight:700;">${d}d ${h}h</span> remaining`;
  return `<span style="color:#ef4444;font-weight:700;">${h}h</span> remaining`;
}

function _renderHackEvents() {
  return HACKATHON_EVENTS.map(e => {
    const isFull = e.status === 'full';
    const pct    = Math.round((e.registered / e.spots) * 100);
    return `
    <div class="hack-event-card">
      <div class="hack-event-top" style="background:linear-gradient(135deg,${e.color}22,${e.color}08);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="hack-event-icon" style="background:${e.color}22;color:${e.color};">${e.icon}</div>
            <div>
              <div class="hack-event-name">${e.name}</div>
              <div class="hack-event-theme">🎯 ${e.theme}</div>
            </div>
          </div>
          <span class="hack-status-badge ${isFull ? 'hack-full' : 'hack-open'}">${isFull ? '🔒 Full' : '✅ Open'}</span>
        </div>
        <p class="hack-event-desc">${e.desc}</p>
        <div class="hack-event-meta">
          <span>📅 ${new Date(e.date).toLocaleDateString('en',{month:'short',day:'numeric'})}–${new Date(e.endDate).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</span>
          <span>📍 ${e.location}</span>
          <span>🏆 Prize: <strong style="color:${e.color};">${e.prize}</strong></span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          ${e.tags.map(t=>`<span class="hack-tag" style="background:${e.color}18;color:${e.color};border-color:${e.color}40;">${t}</span>`).join('')}
        </div>
      </div>
      <div class="hack-event-bottom">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px;">
            <span>⏱ ${_hackCountdown(e.date)}</span>
            <span>${e.registered}/${e.spots} spots</span>
          </div>
          <div class="hack-progress-track"><div class="hack-progress-fill" style="width:${pct}%;background:${e.color};"></div></div>
        </div>
        <button type="button" class="btn-primary" style="padding:8px 20px;font-size:13px;${isFull?'opacity:0.45;cursor:not-allowed;':''}" ${isFull?'disabled':''} onclick="hackRegister(${e.id})">${isFull ? 'Registration Closed' : '→ Register Now'}</button>
      </div>
    </div>`;
  }).join('');
}

function _renderHackTeams() {
  const filtered = hackFilterId === 'all' ? HACK_TEAMS : HACK_TEAMS.filter(t => t.hackId === Number(hackFilterId));
  if (!filtered.length) return `<div style="color:var(--text-muted);padding:40px;text-align:center;grid-column:1/-1;">No teams found for this hackathon.</div>`;
  return filtered.map((t, idx) => {
    const event = HACKATHON_EVENTS.find(e => e.id === t.hackId);
    const slotsLeft = t.maxMembers - t.members.length;
    return `
    <div class="hack-team-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div class="hack-team-avatar" style="background:${t.color}22;color:${t.color};">${t.name.charAt(0)}</div>
        <div>
          <div class="hack-team-name">${t.name}</div>
          <div class="hack-team-tagline">${t.tagline}</div>
        </div>
        <span style="margin-left:auto;font-size:10px;padding:3px 8px;border-radius:20px;background:${event?.color||'#6366f1'}18;color:${event?.color||'#6366f1'};border:1px solid ${event?.color||'#6366f1'}40;">${event?.icon||'🏆'} ${event?.name?.split(' ').slice(0,2).join(' ')||'Hackathon'}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        ${t.members.map(m=>`<div class="hack-member-chip" title="${m.name} · ${m.role}">${m.avatar}</div>`).join('')}
        ${Array(slotsLeft).fill(0).map(()=>`<div class="hack-member-chip hack-slot-empty">+</div>`).join('')}
      </div>
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px;">Looking For</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${t.lookingFor.map(r=>`<span class="hack-role-needed">${r}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn-primary" style="flex:1;padding:7px;font-size:12px;" onclick="hackJoinTeam(${idx})">Join Team</button>
        <button type="button" class="btn-ghost" style="padding:7px 12px;font-size:12px;" onclick="hackViewTeam(${idx})">View</button>
      </div>
    </div>`;
  }).join('');
}

window.renderHackathon = function() {
  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">🏆 Hackathon Hub</h1><p class="page-sub">Discover events, form teams, and build something great</p></div>
      <button type="button" class="btn-primary" style="padding:9px 20px;" onclick="openCreateTeamModal()">＋ Create Team</button>
    </div>
    <div class="hack-tab-bar">
      <button type="button" class="hack-tab ${hackActiveTab==='events'?'active':''}" onclick="hackSwitchTab('events')">🗓 Upcoming Events <span class="hack-tab-count">${HACKATHON_EVENTS.length}</span></button>
      <button type="button" class="hack-tab ${hackActiveTab==='teams'?'active':''}" onclick="hackSwitchTab('teams')">👥 Teams <span class="hack-tab-count">${HACK_TEAMS.length}</span></button>
    </div>
    <div id="hack-events-panel" style="${hackActiveTab==='events'?'':'display:none'}">
      <div class="hack-events-grid" id="hack-events-grid">${_renderHackEvents()}</div>
    </div>
    <div id="hack-teams-panel" style="${hackActiveTab==='teams'?'':'display:none'}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">
        <span style="font-size:13px;color:var(--text-muted);">Filter by hackathon:</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="hack-filter-btn ${hackFilterId==='all'?'active':''}" onclick="hackFilterTeams('all')">All Events</button>
          ${HACKATHON_EVENTS.map(e=>`<button type="button" class="hack-filter-btn ${hackFilterId==e.id?'active':''}" onclick="hackFilterTeams(${e.id})">${e.icon} ${e.name.split(' ').slice(0,2).join(' ')}</button>`).join('')}
        </div>
      </div>
      <div class="hack-teams-grid" id="hack-teams-grid">${_renderHackTeams()}</div>
    </div>`;
};

window.hackSwitchTab = function(tab) {
  hackActiveTab = tab;
  document.getElementById('hack-events-panel').style.display = tab === 'events' ? '' : 'none';
  document.getElementById('hack-teams-panel').style.display  = tab === 'teams'  ? '' : 'none';
  document.querySelectorAll('.hack-tab').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(tab === 'events' ? '🗓' : '👥')));
};

window.hackFilterTeams = function(id) {
  hackFilterId = id;
  const grid = document.getElementById('hack-teams-grid');
  if (grid) grid.innerHTML = _renderHackTeams();
  document.querySelectorAll('.hack-filter-btn').forEach(b => {
    b.classList.toggle('active', id === 'all' ? b.textContent.trim() === 'All Events' : b.onclick?.toString().includes(`(${id})`));
  });
};

window.hackRegister = function(id) {
  const e = HACKATHON_EVENTS.find(ev => ev.id === id);
  if (!e) return;
  showToastMsg(`✅ Registered for ${e.name}! Check your email for confirmation.`);
  e.registered = Math.min(e.registered + 1, e.spots);
  if (e.registered >= e.spots) e.status = 'full';
  const grid = document.getElementById('hack-events-grid');
  if (grid) grid.innerHTML = _renderHackEvents();
};

window.hackJoinTeam = function(idx) {
  const visibleTeams = hackFilterId === 'all' ? HACK_TEAMS : HACK_TEAMS.filter(t => t.hackId === Number(hackFilterId));
  const team = visibleTeams[idx];
  if (!team) return;
  const currentUser = window._sesCurrentUser || { name: 'You', role: 'Member' };
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  if (team.members.length >= team.maxMembers) { showToastMsg('⚠️ This team is already full.'); return; }
  team.members.push({ name: currentUser.name, role: 'Member', avatar: initials });
  const grid = document.getElementById('hack-teams-grid');
  if (grid) grid.innerHTML = _renderHackTeams();
  showToastMsg(`🎉 Joined team "${team.name}"! The team has been notified.`);
};

window.hackViewTeam = function(idx) {
  const visibleTeams = hackFilterId === 'all' ? HACK_TEAMS : HACK_TEAMS.filter(t => t.hackId === Number(hackFilterId));
  const team = visibleTeams[idx];
  if (!team) return;
  const event = HACKATHON_EVENTS.find(e => e.id === team.hackId);
  showToastMsg(`👀 ${team.name}: ${team.members.length}/${team.maxMembers} members · ${event?.name || ''}`);
};

window.openCreateTeamModal = function() {
  const m = document.getElementById('create-team-modal');
  if (m) { m.classList.remove('hidden'); document.body.style.overflow='hidden'; }
};
window.closeCreateTeamModal = function() {
  const m = document.getElementById('create-team-modal');
  if (m) { m.classList.add('hidden'); document.body.style.overflow=''; }
  const form = document.getElementById('create-team-form');
  if (form) form.reset();
};
window.submitCreateTeam = function() {
  const name     = document.getElementById('ct-name')?.value.trim();
  const tagline  = document.getElementById('ct-tagline')?.value.trim();
  const hackId   = Number(document.getElementById('ct-hackathon')?.value);
  const roles    = [...document.querySelectorAll('.ct-role:checked')].map(c => c.value);
  const maxM     = Number(document.getElementById('ct-maxmembers')?.value) || 5;
  if (!name) { showToastMsg('⚠️ Team name is required.'); return; }
  if (!hackId) { showToastMsg('⚠️ Please select a hackathon.'); return; }
  const colors = ['#00c2a8','#6366f1','#10b981','#f59e0b','#8b5cf6','#ef4444'];
  const currentUser = window._sesCurrentUser || { name: 'You', role: 'Founder' };
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const newTeam = {
    id: HACK_TEAMS.length + 1,
    hackId,
    name,
    tagline: tagline || 'Building something great',
    members: [{ name: currentUser.name, role: 'Founder', avatar: initials }],
    maxMembers: maxM,
    lookingFor: roles.length ? roles : ['Team Members'],
    color: colors[HACK_TEAMS.length % colors.length]
  };
  HACK_TEAMS.push(newTeam);
  closeCreateTeamModal();
  hackActiveTab = 'teams';
  hackFilterId = 'all';
  renderHackathon();
  showToastMsg(`🚀 Team "${name}" created! Start recruiting members.`);
};

// ─── INVESTOR DASHBOARD ────────────────────────────
async function renderInvestorDash() {
  // Stats
  const statsEl = document.getElementById('inv-stats');
  if (statsEl) statsEl.innerHTML =
    statCard('Portfolio Value', '$3.1M',  '↑ 29%') +
    statCard('Active Deals',    '6',      '↑ 2 new') +
    statCard('Startups Reviewed','47') +
    statCard('Avg ROI',         '28.4%',  '↑ 4.2%');

  // Featured startups
  const featuredEl = document.getElementById('inv-featured');
  if (featuredEl) {
    let startups = DEMO_STARTUPS;
    try {
      const res = await fetch(`${API_URL}/startups`, {
        headers: APP.token ? { 'Authorization': `Bearer ${APP.token}` } : {}
      });
      if (res.ok) { const d = await res.json(); if (d.length) startups = d; }
    } catch {}

    featuredEl.innerHTML = startups.slice(0, 4).map(s => {
      const grad  = INDUSTRY_COLORS[s.industry] || 'linear-gradient(135deg,#6366F1,#0EA5E9)';
      const icon  = INDUSTRY_ICONS[s.industry]  || '🚀';
      const roiMap= { 'NovaMed AI':'+44%','FinFlow':'+37%','GreenGrid':'-24%','EduVerse':'+30%','SecureNet':'+37%','LogiTrack':'+26%' };
      const roi   = roiMap[s.companyName] || '+22%';
      const roiColor = roi.startsWith('-') ? '#EF4444' : '#10B981';
      return `
        <div class="inv-startup-row" onclick="navigateTo('discovery')">
          <div class="inv-s-avatar" style="background:${grad}">${icon}</div>
          <div>
            <div class="inv-s-name">${s.companyName}</div>
            <div class="inv-s-meta">${s.industry} · ${s.stage || 'Seed'}</div>
          </div>
          <div class="inv-s-right">
            <div class="inv-s-roi" style="color:${roiColor}">${roi}</div>
            <div style="font-size:11px;color:var(--text-muted)">${s.status === 'approved' ? '✓ Verified' : 'Pending'}</div>
          </div>
        </div>`;
    }).join('');
  }

  // AI Chat seed message
  const msgsEl = document.getElementById('inv-ai-msgs');
  if (msgsEl && !msgsEl.children.length) {
    const div = document.createElement('div');
    div.className = 'inv-chat-bubble ai';
    div.textContent = "👋 Hello! I'm your AI investment advisor. Ask me about deal flow, market trends, or startup risk analysis.";
    msgsEl.appendChild(div);
  }

  // Recent activity
  const actEl = document.getElementById('inv-activity');
  if (actEl) {
    const events = [
      { color:'#10B981', text:'<strong>NovaMed AI</strong> uploaded a new pitch deck',            time:'2h ago' },
      { color:'#6366F1', text:'<strong>FinFlow</strong> hit $1M ARR milestone',                   time:'5h ago' },
      { color:'#F59E0B', text:'New startup <strong>BioSync</strong> matches your preferences',    time:'1d ago' },
      { color:'#0EA5E9', text:'AI analysis ready for <strong>SecureNet</strong> due diligence',   time:'1d ago' },
      { color:'#10B981', text:'Portfolio value increased <strong>+3.2%</strong> this week',        time:'2d ago' },
    ];
    actEl.innerHTML = events.map(e => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${e.color}"></div>
        <div class="activity-text">${e.text}</div>
        <div class="activity-time">${e.time}</div>
      </div>`).join('');
  }
}

// Investor mini chat
window.sendInvChat = async function() {
  const input  = document.getElementById('inv-ai-input');
  const msgsEl = document.getElementById('inv-ai-msgs');
  const text   = input?.value.trim();
  if (!text || !msgsEl) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'inv-chat-bubble user';
  userBubble.textContent = text;
  msgsEl.appendChild(userBubble);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  input.value = '';

  try {
    const res  = await fetch(`${API_URL}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    const aiBubble = document.createElement('div');
    aiBubble.className = 'inv-chat-bubble ai';
    aiBubble.textContent = data.reply || data.error || 'Something went wrong.';
    msgsEl.appendChild(aiBubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch {
    const aiBubble = document.createElement('div');
    aiBubble.className = 'inv-chat-bubble ai';
    aiBubble.textContent = 'Could not reach AI. Check backend server.';
    msgsEl.appendChild(aiBubble);
  }
};
