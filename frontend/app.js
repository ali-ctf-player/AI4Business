'use strict';

// Auto-detect host so the app works from localhost AND from phone on same WiFi
const _HOST = window.location.hostname;
const API_URL = _HOST.includes('vercel.app') 
  ? 'https://ai4business-9z7o.onrender.com/api' // <-- PASTE YOUR RENDER URL HERE
  : `http://${_HOST}:5000/api`;
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
  
  // 1. Setup Landing Page Scroll Animations
  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, observerOptions);

  document.querySelectorAll('.scroll-reveal').forEach(el => {
    scrollObserver.observe(el);
  });

  // ─── SMART NAVBAR (Hide on Scroll Down) ──────────────────
  let lastScrollY = window.scrollY;
  const navBar = document.querySelector('.premium-nav');

  window.addEventListener('scroll', () => {
    if (!navBar) return;
    
    const currentScrollY = window.scrollY;
    
    // If scrolling down AND we are past the very top of the page
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      navBar.classList.add('nav-hidden');
    } else {
      // If scrolling up, bring it back
      navBar.classList.remove('nav-hidden');
    }
    
    lastScrollY = currentScrollY;
  }, { passive: true }); // passive: true makes the scrolling extremely smooth

  // 2. Pick up OAuth token from redirect query params
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
      
      // Instantly hide public pages before triggering the login logic
      document.getElementById('landing-page')?.classList.add('hidden');
      document.getElementById('auth-screen')?.classList.add('hidden');
      loginAs(user.role);
      return;
    } catch(e) {}
  }
  
  if (authError) {
    window.history.replaceState({}, '', window.location.pathname);
    showToastMsg(`❌ ${authError.charAt(0).toUpperCase()+authError.slice(1)} login failed. Try again.`);
  }
  
  // 3. Check if user is already logged in from a previous session
  if (APP.token && APP.userData) {
    APP.role = APP.userData.role;
    
    // INSTANTLY hide the landing page and auth screens (no animations)
    document.getElementById('landing-page')?.classList.add('hidden');
    document.getElementById('auth-screen')?.classList.add('hidden');
    document.getElementById('hackathon-auth-screen')?.classList.add('hidden');
    
    // Instantly show the dashboard
    document.getElementById('app-shell')?.classList.remove('hidden');
    document.getElementById('chat-toggle-btn')?.classList.remove('hidden');
    
    updateUserUI();
    buildSidebarNav(APP.role);
    initSocket();
    
    const defaultPages = { investor:'investor-dash', startup:'profile', admin:'kpi', superadmin:'kpi', organizer:'hackathon', mentor:'discovery', judge:'hackathon' };
    navigateTo(defaultPages[APP.role] || 'discovery');
    
  } else {
    // 4. NOT logged in: Show landing page and trigger the hero animation
    document.getElementById('app-shell')?.classList.add('hidden'); // Ensure dashboard is hidden
    document.querySelector('.hero-section')?.classList.add('is-visible', 'scroll-reveal');
  }
});

// ─── MFA AUTO-ADVANCE LOGIC ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const mfaInputs = document.querySelectorAll('.mfa-digit');
  
  mfaInputs.forEach((input, index) => {
    input.addEventListener('keyup', (e) => {
      // If the user typed a number
      if (e.key >= '0' && e.key <= '9') {
        // Move to the next input if it exists
        if (index < mfaInputs.length - 1) {
          mfaInputs[index + 1].focus();
        } else {
          // If it's the last box, automatically trigger the verification!
          verifyMFA(); 
        }
      } 
      // If the user pressed Backspace
      else if (e.key === 'Backspace') {
        // Move to the previous input if it exists
        if (index > 0) {
          mfaInputs[index - 1].focus();
        }
      }
    });
  });
});

// ─── NATIVE VIEW TRANSITIONS (Zero Flash Motion) ─────────────────────────
function switchTemplate(currentId, nextId, callback = null) {
  const currentScreen = document.getElementById(currentId);
  const nextScreen = document.getElementById(nextId);

  if (!currentScreen || !nextScreen) return;

  // Check if browser supports the modern View Transitions API
  if (!document.startViewTransition) {
    // Fallback for older browsers: instant switch without flashes
    currentScreen.classList.add('hidden');
    nextScreen.classList.remove('hidden');
    if (callback) callback();
    return;
  }

  // The Magic: The browser freezes the screen, lets you update the DOM, 
  // and then morphs them together. No white gaps allowed.
  document.startViewTransition(() => {
    currentScreen.classList.add('hidden');
    nextScreen.classList.remove('hidden');
    if (callback) callback();
  });
}

// ─── LANDING PAGE NAVIGATION ─────────────────────────
window.goToLogin = function(tab) {
  // Smoothly transition from Landing Page to Auth Screen
  switchTemplate('landing-page', 'auth-screen', () => {
    // If you have a specific tab to switch to (login vs register), do it here
    if (typeof switchTab === 'function') {
      switchTab(tab); 
    }
  });
};

// ─── AUTHENTICATION ───────────────────────────────────
let authMode = 'login';
let selectedRole = 'startup';

// ─── SOCIAL LOGIN ──────────────────────────────────────
const OAUTH_BASE = `http://${_HOST}:5000/api/auth`;

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

window.openOthersModal = function() {
  document.getElementById('others-login-modal')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};
window.closeOthersModal = function() {
  document.getElementById('others-login-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
};

function openGovLoginModal(type) {
  const labels = {
    mygov:      { title: '🏛️ myGov Azerbaijan',               desc: 'Enter your FIN code (Fərdi İdentifikasiya Nömrəsi) to login via myGov portal.',         placeholder: 'FIN Code (e.g. 5XY3B4Z)' },
    asanimza:   { title: '🔏 Asan Signature',                  desc: 'Enter your Asan İmza PIN to authenticate with your digital signature certificate.',      placeholder: 'Asan İmza PIN (e.g. A1234567)' },
    sima:       { title: 'SİMA Signature',                     desc: 'Enter your SİMA credentials to authenticate.',                                            placeholder: 'SİMA ID' },
    'sima-token':{ title: 'SİMA Token (Electronic Signature)', desc: 'Insert your SİMA Token and enter your PIN.',                                              placeholder: 'Token PIN' },
    fin:        { title: '🪪 Identification Number',           desc: 'Enter your national identification number to log in.',                                    placeholder: 'ID Number' },
    bsxm:       { title: 'BSXM Electronic Signature',          desc: 'Authenticate using your BSXM Electronic Signature.',                                     placeholder: 'BSXM Certificate PIN' },
  };
  const cfg = labels[type] || labels['mygov'];
  const modal = document.getElementById('gov-login-modal');
  const title = document.getElementById('gov-modal-title');
  const desc  = document.getElementById('gov-modal-desc');
  const input = document.getElementById('gov-modal-input');
  if (!modal) return;
  title.textContent = cfg.title;
  desc.textContent  = cfg.desc;
  input.placeholder = cfg.placeholder;
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
  if (!value) { showToastMsg('⚠️', 'Please enter your ' + (provider === 'asanimza' ? 'PIN' : 'FIN code')); return; }
  closeGovModal();
  showToastMsg('🔄', 'Verifying with government portal…');
  // Demo: simulate verification delay then login as investor
  setTimeout(() => {
    const demoUser = { id: 'gov_' + Date.now(), role: 'investor', fullName: provider === 'asanimza' ? 'Aşan İmza User' : 'myGov User' };
    localStorage.setItem('userData', JSON.stringify(demoUser));
    APP.userData = demoUser; APP.role = demoUser.role;
    showToastMsg('✅', 'Government authentication successful!');
    loginAs(demoUser.role);
  }, 1500);
};

// ─── HACKATHON AUTH PAGE ────────────────────────────────
window.openHackathonAuth = function(tab = 'login') {
  // Smoothly transition from main auth to hackathon auth
  switchTemplate('auth-screen', 'hackathon-auth-screen', () => {
    switchHackTab(tab);
  });
};

window.closeHackathonAuth = function() {
  // Smoothly transition from hackathon auth back to main auth
  switchTemplate('hackathon-auth-screen', 'auth-screen');
};

window.switchHackTab = function(tab) {
  document.querySelectorAll('#hack-auth-tabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('hack-login-form').classList.toggle('hidden', tab !== 'hack-login');
  document.getElementById('hack-register-form').classList.toggle('hidden', tab !== 'hack-register');
  document.getElementById('hack-auth-heading').innerHTML = tab === 'hack-login' ? 'Hackathon<br/>Sign In' : 'Hackathon<br/>Registration';
};

window.submitHackLogin = async function() {
  const email = document.getElementById('hack-login-email').value.trim();
  const password = document.getElementById('hack-login-password').value.trim();
  if (!email || !password) { showToastMsg('⚠️', 'Please fill in all fields'); return; }
  const btn = document.querySelector('#hack-login-form .btn-primary');
  btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      APP.token = data.token; APP.userData = data.user; APP.role = data.user.role;
      localStorage.setItem('token', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      document.getElementById('hackathon-auth-screen')?.classList.add('hidden');
      loginAs(data.user.role);
      setTimeout(() => navigateTo('hackathon'), 80);
    } else {
      showToastMsg('❌', data.message || 'Login failed');
    }
  } catch { showToastMsg('❌', 'Cannot reach server'); }
  btn.disabled = false; btn.textContent = '🏆 Sign In to Hackathon';
};

window.submitHackRegister = async function() {
  const fullName   = document.getElementById('hack-reg-name').value.trim();
  const email      = document.getElementById('hack-reg-email').value.trim();
  const password   = document.getElementById('hack-reg-password').value.trim();
  const skills     = document.getElementById('hack-reg-skills').value.trim();
  const teamStatus = document.getElementById('hack-reg-team-status').value;
  if (!fullName || !email || !password) { showToastMsg('⚠️', 'Please fill in required fields'); return; }
  const btn = document.querySelector('#hack-register-form .btn-primary');
  btn.disabled = true; btn.textContent = 'Registering...';
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, role: 'startup', skills, teamStatus })
    });
    const data = await res.json();
    if (res.ok) {
      showToastMsg('✅', 'Registered! Please sign in.');
      switchHackTab('hack-login');
      document.getElementById('hack-login-email').value = email;
    } else {
      showToastMsg('❌', data.message || 'Registration failed');
    }
  } catch { showToastMsg('❌', 'Cannot reach server'); }
  btn.disabled = false; btn.textContent = '🚀 Register for Hackathon';
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

// Role selector buttons
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRole = btn.dataset.role;
  });
});

window.handleAuthStep = async function() {
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  const nameEl = document.getElementById('register-name');
  const btn = document.getElementById('btn-continue');

  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value.trim();
  const fullName = nameEl ? nameEl.value.trim() : "";

  if (!email || !password) {
    // 🎨 Swapped alert for Toast
    showToastMsg('⚠️', "Zəhmət olmasa email və şifrəni daxil edin.");
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
        if (!data.token || !data.user || !data.user.role) {
          // 🎨 Swapped alert for Toast
          showToastMsg('❌', "Giriş uğursuz oldu: server cavabı düzgün deyil.");
          return;
        }
        if (data.user.isVerified === false) {
          // 🎨 Swapped alert for Toast
          showToastMsg('⚠️', "E-poçt ünvanınız təsdiqlənməyib. Zəhmət olmasa gələn qutuyu yoxlayın və doğrulama linkini izləyin.");
          return;
        }
        APP.token = data.token;
        APP.userData = data.user;
        APP.role = data.user.role;
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        switchTemplate('step-credentials', 'step-mfa');
      } else {
        // 🎨 Swapped alert for Toast
        showToastMsg('✅', "Qeydiyyat uğurludur! Giriş edin.");
        // We add a 1.5 second delay before reloading so the user has time to read the beautiful success message!
        setTimeout(() => location.reload(), 1500);
      }
    } else {
      // 🎨 Swapped alert for Toast
      showToastMsg('❌', data.message || "Xəta!");
    }
  } catch (err) {
    // 🎨 Swapped alert for Toast
    showToastMsg('❌', "Backend serverə qoşulmaq mümkün deyil!");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue →';
  }
};

window.verifyMFA = function() {
  loginAs(APP.role);
};

window.loginAs = async function(role) {
  // If Quick Demo button was clicked, hit the backend to get a valid token
  if (!APP.token || !APP.userData) {
    try {
      const res = await fetch(`${API_URL}/auth/quick-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleSlug: role })
      });
      const data = await res.json();
      if (res.ok) {
        APP.token = data.token;
        APP.userData = data.user;
        APP.role = data.user.role;
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
      }
    } catch(e) {
      console.warn("Could not setup demo token", e);
    }
  }

  APP.role = role;
  localStorage.setItem('userRole', role);
  const isHackathonHidden = document.getElementById('hackathon-auth-screen')?.classList.contains('hidden');
  const activeAuthId = isHackathonHidden ? 'auth-screen' : 'hackathon-auth-screen';
  
  // Trigger the seamless morph transition
  switchTemplate(activeAuthId, 'app-shell', () => {
    
    // Everything in here happens instantly behind the scenes
    document.getElementById('chat-toggle-btn')?.classList.remove('hidden');
    updateUserUI();
    buildSidebarNav(role);
    initSocket();
    
    const defaultPages = { 
      investor: 'investor-dash', startup: 'profile', admin: 'kpi', 
      superadmin: 'kpi', organizer: 'hackathon', mentor: 'discovery', judge: 'hackathon' 
    };
    
    navigateTo(defaultPages[role] || 'discovery');
  });
};

function updateUserUI() {
  const roleLabels = { investor:'INVESTOR', startup:'STARTUP', admin:'COMPLIANCE OFFICER', superadmin:'ECOSYSTEM MANAGER', organizer:'ORGANIZER', mentor:'MENTOR', judge:'JUDGE' };
  const sidebarUser = document.getElementById('sidebar-user');
  if (sidebarUser && APP.userData) {
    sidebarUser.innerHTML = `
      <div class="user-card">
        <div class="user-row">
          <div class="user-avatar">${APP.userData.fullName ? APP.userData.fullName[0] : '?'}</div>
          <div>
            <div class="user-name">${APP.userData.fullName || 'User'}</div>
            <div class="user-email">${roleLabels[APP.role] || APP.role.toUpperCase()} ACCOUNT</div>
          </div>
        </div>
      </div>`;
  }
}

// ─── NAVIGATION & PAGES ────────────────────────────────
const SELF_RENDER_PAGES = ['kpi','registry','users','audit','ai-examiner','hackathon','ai-hub','reports'];

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

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  onPageLoad(pageId);
};

window.saveProfile = function() {
  showToastMsg('✅', "Profil məlumatları yadda saxlanıldı!");
};

window.signOut = function() {
  localStorage.clear();
  location.reload();
};

function showToastMsg(icon, msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:14px 20px;border-radius:12px;font-size:14px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);display:flex;gap:8px;align-items:center;';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

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
    { page: 'ai-hub',        icon: '✨', label: 'AI Features' },
  ],
  startup:    [
    { page: 'profile',     icon: '🚀', label: 'My Profile' },
    { page: 'funding',     icon: '💰', label: 'Funding Tracker' },
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'chat',        icon: '💬', label: 'Messages' },
    { page: 'ai-examiner', icon: '🤖', label: 'AI Examiner' },
    { page: 'ai-hub',      icon: '✨', label: 'AI Features' },
  ],
  admin:      [
    { page: 'kpi',         icon: '📈', label: 'KPI Dashboard' },
    { page: 'registry',    icon: '📋', label: 'Registry' },
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'users',       icon: '👥', label: 'Users' },
    { page: 'reports',     icon: '📊', label: 'Reports' },
    { page: 'audit',       icon: '🔒', label: 'Audit Log' },
    { page: 'ai-examiner', icon: '🤖', label: 'AI Examiner' },
    { page: 'ai-hub',      icon: '✨', label: 'AI Features' },
  ],
  superadmin: [
    { page: 'kpi',         icon: '📈', label: 'KPI Dashboard' },
    { page: 'registry',    icon: '📋', label: 'Registry' },
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'users',       icon: '👥', label: 'Users' },
    { page: 'reports',     icon: '📊', label: 'Reports' },
    { page: 'audit',       icon: '🔒', label: 'Audit Log' },
    { page: 'ai-examiner', icon: '🤖', label: 'AI Examiner' },
    { page: 'ai-hub',      icon: '✨', label: 'AI Features' },
  ],
  organizer: [
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'users',       icon: '👥', label: 'Participants' },
    { page: 'kpi',         icon: '📈', label: 'Overview' },
    { page: 'chat',        icon: '💬', label: 'Messages' },
    { page: 'ai-hub',      icon: '✨', label: 'AI Features' },
  ],
  mentor: [
    { page: 'discovery',   icon: '🔍', label: 'Discover Startups' },
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'chat',        icon: '💬', label: 'Messages' },
    { page: 'ai-examiner', icon: '🤖', label: 'AI Examiner' },
    { page: 'ai-hub',      icon: '✨', label: 'AI Features' },
  ],
  judge: [
    { page: 'hackathon',   icon: '🏆', label: 'Hackathons' },
    { page: 'discovery',   icon: '🔍', label: 'Discover Startups' },
    { page: 'chat',        icon: '💬', label: 'Messages' },
    { page: 'ai-examiner', icon: '🤖', label: 'AI Examiner' },
    { page: 'ai-hub',      icon: '✨', label: 'AI Features' },
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

window.toggleSidebar = function() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('hidden');
};

window.closeModal = function() {
  document.getElementById('modal-overlay')?.classList.add('hidden');
  const hdModal = document.getElementById('hackathon-detail-modal');
  if (hdModal) hdModal.style.display = 'none';
};

// ─── SOCKET.IO CHAT ────────────────────────────────
let socket = null;

function initSocket() {
  if (socket || !APP.userData?.id) return;
  try {
    socket = io(`http://${_HOST}:5000`);
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
  }
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
  const filtered = DEMO_STARTUPS.filter(s => (!ind || s.industry === ind) && (!stage || s.stage === stage) && (!risk || s.risk === risk));
  const grid = document.getElementById('startup-grid');
  if (!grid) return;
  const countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = `${filtered.length} startups`;

  grid.innerHTML = filtered.map(s => {
    const pct = Math.round(s.raised / s.goal * 100);
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
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
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

  document.getElementById('modal-ai-content').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Click "Run AI Analysis" to generate risk & reward assessment</div>';
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
  } else { fb.style.display = 'none'; }
};

window.confirmInvest = function() {
  const amt = parseFloat(document.getElementById('invest-amount').value) || 0;
  if (amt <= 0) { alert('Please enter a valid amount.'); return; }
  closeInvestModal();
  showToastMsg('✅', `Investment of $${amt.toLocaleString()} in ${selectedStartup.companyName} confirmed!`);
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

// ─── HACKATHON MANAGEMENT (DYNAMIC FETCH + MODAL) ──────────
let HACKATHON_EVENTS = [];

let HACK_TEAMS = [
  {
    id: 1, hackId: 1, name: 'NeuralNomads', tagline: 'AI for mental health access',
    members: [{name:'Amir K.',role:'CEO',avatar:'AK'},{name:'Sara M.',role:'ML',avatar:'SM'}],
    maxMembers: 5, lookingFor: ['Backend Dev','UX Designer'],
    color: '#00c2a8'
  }
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

window.openHackathonDetailModal = function(id) {
  const e = HACKATHON_EVENTS.find(ev => String(ev.id) === String(id));
  if (!e) return;

  let modal = document.getElementById('hackathon-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hackathon-detail-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title" id="hd-modal-title"></h2>
          <button type="button" class="modal-close" onclick="document.getElementById('hackathon-detail-modal').style.display='none'">✕</button>
        </div>
        <div id="hd-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const title = document.getElementById('hd-modal-title');
  const body = document.getElementById('hd-modal-body');

  title.innerHTML = `<span style="background:${e.color}22;color:${e.color};padding:6px;border-radius:8px;font-size:20px;margin-right:8px;">${e.icon}</span> ${e.name}`;
  
  const isFull = e.status === 'full';
  const spots = e.spots || 100;
  const registered = e.registered || 0;

  body.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;">
      <span class="badge badge-blue">🎯 ${e.theme}</span>
      <span class="badge ${isFull ? 'badge-red' : 'badge-emerald'}">${isFull ? '🔒 Full' : '✅ Open'}</span>
      ${(e.tags || []).map(t => `<span class="badge badge-navy">#${t}</span>`).join('')}
    </div>
    
    <div style="font-size:15px;color:var(--text-secondary);line-height:1.6;margin-bottom:24px;max-height:250px;overflow-y:auto;white-space:pre-wrap;">${e.desc}</div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">📅 Start Date</div>
        <div style="font-weight:600;color:var(--text-primary);font-size:14px;">${new Date(e.date).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>
      </div>
      <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">📍 Location</div>
        <div style="font-weight:600;color:var(--text-primary);font-size:14px;">${e.location}</div>
      </div>
      <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">🏆 Prize Pool</div>
        <div style="font-weight:600;color:${e.color};font-size:14px;">${e.prize}</div>
      </div>
      <div style="padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">👥 Registration</div>
        <div style="font-weight:600;color:var(--text-primary);font-size:14px;">${registered} / ${spots} spots</div>
      </div>
    </div>
    
    <div style="display:flex;gap:10px;">
      <button type="button" class="btn-ghost" style="flex:1;" onclick="document.getElementById('hackathon-detail-modal').style.display='none'">Close</button>
      <button type="button" class="btn-primary" style="flex:2;" ${isFull ? 'disabled' : ''} onclick="document.getElementById('hackathon-detail-modal').style.display='none'; hackRegister('${e.id}')">
        ${isFull ? 'Registration Closed' : 'Register Now'}
      </button>
    </div>
  `;

  modal.style.display = 'flex';
};

function _renderHackEvents() {
  if (HACKATHON_EVENTS.length === 0) {
      return `<div style="text-align:center; padding: 40px; grid-column: 1/-1; color: var(--text-muted);">No hackathons found. Make sure backend is running and data is synced.</div>`;
  }

  return HACKATHON_EVENTS.map(e => {
    const isFull = e.status === 'full';
    const spots = e.spots || 100;
    const registered = e.registered || Math.floor(Math.random() * 50);
    const pct = Math.round((registered / spots) * 100);

    return `
    <div class="hack-event-card" style="cursor:pointer;" onclick="openHackathonDetailModal('${e.id}')">
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
        
        <p class="hack-event-desc" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${e.desc}</p>
        
        <div class="hack-event-meta">
          <span>📅 ${new Date(e.date).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</span>
          <span>📍 ${e.location}</span>
          <span>🏆 Prize: <strong style="color:${e.color};">${e.prize}</strong></span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          ${(e.tags || ['Innovation']).map(t=>`<span class="hack-tag" style="background:${e.color}18;color:${e.color};border-color:${e.color}40;">${t}</span>`).join('')}
        </div>
      </div>
      
      <div class="hack-event-bottom" onclick="event.stopPropagation()">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px;">
            <span>⏱ ${_hackCountdown(e.date)}</span>
            <span>${registered}/${spots} spots</span>
          </div>
          <div class="hack-progress-track"><div class="hack-progress-fill" style="width:${pct}%;background:${e.color};"></div></div>
        </div>
        <button type="button" class="btn-primary" style="padding:8px 20px;font-size:13px;${isFull?'opacity:0.45;cursor:not-allowed;':''}" ${isFull?'disabled':''} onclick="hackRegister('${e.id}')">${isFull ? 'Registration Closed' : '→ Register Now'}</button>
      </div>
    </div>`;
  }).join('');
}

function _renderHackTeams() {
  const filtered = hackFilterId === 'all' ? HACK_TEAMS : HACK_TEAMS.filter(t => String(t.hackId) === String(hackFilterId));
  if (!filtered.length) return `<div style="color:var(--text-muted);padding:40px;text-align:center;grid-column:1/-1;">No teams found for this hackathon.</div>`;
  
  return filtered.map((t, idx) => {
    const event = HACKATHON_EVENTS.find(e => String(e.id) === String(t.hackId));
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
        ${Array(Math.max(0, slotsLeft)).fill(0).map(()=>`<div class="hack-member-chip hack-slot-empty">+</div>`).join('')}
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

window.renderHackathon = async function() {
  const main = document.getElementById('page-content');
  if (!main) return;
  const canCreate = ['organizer','judge','admin','superadmin'].includes(APP.role);
  
  main.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">🏆 Hackathon Hub</h1><p class="page-sub">Discover events, form teams, and build something great</p></div>
    </div>
    <div style="text-align:center; padding: 40px; color: var(--text-muted);">
      <span class="spinner"></span> Fetching live hackathons from database...
    </div>`;

  try {
      const res = await fetch(`${API_URL}/hackathons`);
      if (res.ok) {
          const dbHackathons = await res.json();
          HACKATHON_EVENTS = dbHackathons.map(h => ({
              id: h.id || h._id,
              name: h.title || h.name || 'Unnamed Hackathon',
              theme: h.theme || 'Innovation',
              date: h.startDate || h.date || new Date().toISOString(),
              endDate: h.endDate || new Date().toISOString(),
              location: h.address || 'Online',
              prize: h.prize || 'TBA',
              desc: h.description || h.desc || 'Join our amazing hackathon!',
              tags: h.tags && h.tags.length ? h.tags : ['Tech'],
              color: h.color || '#3B82F6',
              icon: h.icon || '🏆',
              status: h.status === 'upcoming' ? 'open' : (h.status || 'open'),
              spots: h.spots || 100,
              registered: h.registered || 0
          }));
      } else { showToastMsg('❌', 'Failed to fetch hackathons'); }
  } catch (err) { showToastMsg('❌', 'Cannot connect to backend server'); }

  main.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">🏆 Hackathon Hub</h1><p class="page-sub">Discover events, form teams, and build something great</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${canCreate ? `<button type="button" class="btn-primary" style="padding:9px 20px;background:linear-gradient(135deg,#f59e0b,#ef4444);border:none;" onclick="openCreateHackathonModal()">＋ Create Hackathon</button>` : ''}
        <button type="button" class="btn-primary" style="padding:9px 20px;" onclick="openCreateTeamModal()">＋ Create Team</button>
      </div>
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
          ${HACKATHON_EVENTS.map(e=>`<button type="button" class="hack-filter-btn ${hackFilterId==e.id?'active':''}" onclick="hackFilterTeams('${e.id}')">${e.icon} ${e.name.split(' ').slice(0,2).join(' ')}</button>`).join('')}
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
    b.classList.toggle('active', id === 'all' ? b.textContent.trim() === 'All Events' : b.onclick?.toString().includes(`('${id}')`));
  });
};

window.hackRegister = function(id) {
  const e = HACKATHON_EVENTS.find(ev => String(ev.id) === String(id));
  if (!e) return;
  showToastMsg('✅', `Registered for ${e.name}!`);
};

window.hackJoinTeam = function(idx) {
  showToastMsg('🎉', `Joined team!`);
};

window.hackViewTeam = function(idx) {
  showToastMsg('👀', `Viewing team details`);
};

window.openCreateHackathonModal = function() {
  document.getElementById('create-hackathon-modal')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};
window.closeCreateHackathonModal = function() {
  document.getElementById('create-hackathon-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
};
window.submitCreateHackathon = async function() {
  showToastMsg('✅', 'Hackathon creation submitted!');
  closeCreateHackathonModal();
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
  showToastMsg('🚀', 'Team created successfully!');
  closeCreateTeamModal();
};


// ─── ADMIN KPI DASHBOARD ───────────────────
function statCard(label, value, badge) {
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${badge ? `<span class="badge badge-green badge-xs" style="margin-top:6px">${badge}</span>` : ''}</div>`;
}

window.renderKPI = function() {
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
  setTimeout(window.drawAdminCharts, 50);
}

window.drawAdminCharts = function() {
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
    for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();ctx.fillStyle=labelColor;ctx.font='10px Inter';ctx.textAlign='right';ctx.fillText((max/4*i).toFixed(1)+'M',pad.l-5,y+4);}
    data.forEach((v,i)=>{const x=pad.l+gap*i+(gap-bw)/2,bh=(v/max)*ch,y=pad.t+ch-bh;const g=ctx.createLinearGradient(0,y,0,y+bh);g.addColorStop(0,stroke);g.addColorStop(1,fill);ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,bw,bh,4);ctx.fill();ctx.fillStyle=labelColor;ctx.textAlign='center';ctx.font='11px Inter';ctx.fillText(labels[i],pad.l+gap*i+gap/2,H-pad.b+16);});
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
    ctx.fillStyle=labelColor;ctx.font='11px Inter';ctx.textAlign='center';labels.forEach((l,i)=>ctx.fillText(l,pts[i].x,H-5));
  }
  function drawDoughnut(id, labels, data, colors) {
    const canvas=document.getElementById(id);if(!canvas)return;
    const ctx=canvas.getContext('2d');const W=canvas.offsetWidth||400,H=canvas.offsetHeight||200;
    canvas.width=W;canvas.height=H;const cx=W*0.38,cy=H/2,r=Math.min(cx,cy)-16,ir=r*0.55,total=data.reduce((a,b)=>a+b,0);
    let ang=-Math.PI/2;
    data.forEach((v,i)=>{const sl=(v/total)*2*Math.PI;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ang,ang+sl);ctx.fillStyle=colors[i];ctx.fill();ctx.beginPath();ctx.arc(cx,cy,ir,0,Math.PI*2);ctx.fillStyle=isDark?'#1C2128':'#fff';ctx.fill();ang+=sl;});
    const lx=W*0.68,ly=H/2-(labels.length*18)/2;
    labels.forEach((l,i)=>{ctx.fillStyle=colors[i];ctx.fillRect(lx,ly+i*20,10,10);ctx.fillStyle=isDark?'rgba(255,255,255,0.7)':'rgba(15,23,42,0.7)';ctx.font='11px Inter';ctx.textAlign='left';ctx.fillText(l+' ('+data[i]+'%)',lx+15,ly+i*20+9);});
  }
  
  drawBar('invest-chart',     ['Jan','Feb','Mar','Apr','May','Jun'], [1.8,2.4,1.9,3.2,2.8,4.1], 'rgba(0,194,168,0.7)',   '#00c2a8');
  drawDoughnut('industry-chart', ['FinTech','EdTech','HealthTech','CleanTech','Logistics','CyberSec'],[28,22,18,14,11,7],['#00c2a8','#10b981','#6366f1','#f59e0b','#8b5cf6','#ef4444']);
  drawLine('users-chart',     ['Sep','Oct','Nov','Dec','Jan','Feb'], [980,1120,1280,1450,1608,1842], '#10b981');
  drawBar('commission-chart', ['Sep','Oct','Nov','Dec','Jan','Feb'], [18,24,19,32,28,41],           'rgba(245,158,11,0.7)', '#f59e0b');
}

// ─── ADMIN USERS TABLE ─────────────────────────────
let USERS_DATA = [];

window.renderUsers = async function() {
  const main = document.getElementById('page-content');
  if (!main) return;
  
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">User Management</h1><p class="page-sub">All registered platform users</p></div>
    </div>
    <div class="card">
      <div style="text-align:center; padding: 40px; color: var(--text-muted);">
        <span class="spinner"></span> Loading users from database...
      </div>
    </div>`;

  try {
    const res = await fetch(`${API_URL}/auth/users`, {
      headers: APP.token ? { 'Authorization': `Bearer ${APP.token}` } : {}
    });
    if (res.ok) {
      const dbUsers = await res.json();
      USERS_DATA = dbUsers.map(u => {
        const roleLabels = { admin: 'Compliance Officer', superadmin: 'Ecosystem Manager', startup: 'Startup', investor: 'Investor', organizer: 'Organizer', mentor: 'Mentor', judge: 'Judge' };
        return {
          id: u._id,
          name: u.fullName || 'Unknown User',
          email: u.email,
          role: roleLabels[u.role] || (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'User'),
          joined: new Date(u.createdAt || Date.now()).toISOString().slice(0, 10),
          status: u.isDeleted ? 'Suspended' : (u.isVerified ? 'Active' : 'Pending')
        };
      });
    } else { showToastMsg('❌', 'Failed to fetch users from DB'); }
  } catch (err) { showToastMsg('❌', 'Cannot connect to backend server'); }

  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">User Management</h1><p class="page-sub">All registered platform users</p></div>
      ${['superadmin', 'admin'].includes(APP.role) ? '<button type="button" class="btn-primary btn-sm" onclick="openAddUserModal()">+ Add User</button>' : ''}
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
    </div>

    <div id="add-user-modal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;align-items:center;justify-content:center;">
      <div class="modal-box" style="max-width:460px;background:var(--bg-card);padding:24px;border-radius:16px;">
        <div class="modal-header" style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <h2 class="modal-title" style="font-size:18px;">➕ Add New User</h2>
          <button type="button" class="modal-close" style="background:none;border:none;font-size:20px;cursor:pointer;" onclick="closeAddUserModal()">✕</button>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Full Name</label>
          <input id="add-user-name" type="text" class="form-input w-full" placeholder="e.g. John Smith">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Email</label>
          <input id="add-user-email" type="email" class="form-input w-full" placeholder="user@example.com">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Password</label>
          <input id="add-user-password" type="password" class="form-input w-full" placeholder="Minimum 6 characters">
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">Role</label>
          <select id="add-user-role" class="form-input w-full">
            <option value="startup">Startup</option>
            <option value="investor">Investor</option>
            <option value="organizer">Organizer</option>
            <option value="mentor">Mentor</option>
            <option value="judge">Judge</option>
            <option value="admin">Compliance Officer</option>
            <option value="superadmin">Ecosystem Manager</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button type="button" class="btn-ghost flex-1" onclick="closeAddUserModal()">Cancel</button>
          <button type="button" id="add-user-submit-btn" class="btn-primary" style="flex:2;" onclick="submitAddUser()">Create User</button>
        </div>
      </div>
    </div>`;
};

window.openAddUserModal = function() { const m = document.getElementById('add-user-modal'); if (m) m.style.display = 'flex'; };
window.closeAddUserModal = function() { const m = document.getElementById('add-user-modal'); if (m) m.style.display = 'none'; };
window.submitAddUser = async function() {
  const fullName = document.getElementById('add-user-name')?.value.trim();
  const email    = document.getElementById('add-user-email')?.value.trim();
  const password = document.getElementById('add-user-password')?.value.trim();
  const role     = document.getElementById('add-user-role')?.value;
  if (!fullName || !email || !password) { showToastMsg('⚠️', 'Please fill in all fields.'); return; }
  const btn = document.getElementById('add-user-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName, email, password, role }) });
    const data = await res.json();
    if (res.ok) { showToastMsg('✅', 'User created successfully!'); closeAddUserModal(); renderUsers(); } else { showToastMsg('❌', data.message || 'Failed to create user.'); }
  } catch { showToastMsg('❌', 'Cannot reach server.'); }
  btn.disabled = false; btn.textContent = 'Create User';
};

function _renderUsersRows() {
  if (USERS_DATA.length === 0) return `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No users found.</td></tr>`;
  return USERS_DATA.map((u, i) => {
    const isAdmin = ['Compliance Officer', 'Ecosystem Manager'].includes(u.role);
    const isSuspended = u.status === 'Suspended';
    const roleColor = isAdmin ? '#6366f1' : u.role === 'Investor' ? '#00c2a8' : '#10b981';
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;">
          <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${roleColor},${roleColor}99);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">${u.name.charAt(0)}</div>
          <div><div class="td-primary">${u.name}</div>${isAdmin ? '<div style="font-size:10px;color:#6366f1;font-weight:600;">ADMIN</div>' : ''}</div>
        </div></td>
        <td style="color:var(--text-muted);font-size:13px;">${u.email}</td>
        <td><span class="badge" style="background:${roleColor}15;color:${roleColor};border:1px solid ${roleColor}30;">${u.role}</span></td>
        <td style="font-size:13px;">${u.joined}</td>
        <td><span class="badge ${isSuspended ? 'badge-red' : (u.status === 'Pending' ? 'badge-gold' : 'badge-emerald')}">● ${u.status}</span></td>
        <td style="display:flex;gap:6px;align-items:center;">
          <button type="button" class="${isSuspended ? 'btn-approve' : 'btn-reject'}" style="font-family:inherit;cursor:pointer;" onclick="toggleUserStatus(${i})">${isSuspended ? 'Activate' : 'Suspend'}</button>
        </td>
      </tr>`;
  }).join('');
}

window.toggleUserStatus = async function(i) {
  const user = USERS_DATA[i];
  if (!user.id) return showToastMsg('⚠️', 'Cannot modify local-only user');
  try {
    const res = await fetch(`${API_URL}/auth/users/${user.id}/toggle`, { method: 'PUT' });
    if (res.ok) {
      user.status = user.status === 'Active' ? 'Suspended' : 'Active';
      const tbody = document.getElementById('users-tbody');
      if (tbody) tbody.innerHTML = _renderUsersRows();
      showToastMsg(user.status === 'Suspended' ? '🔒' : '✅', `${user.name} is now ${user.status}.`);
    } else { showToastMsg('❌', 'Failed to update user on server.'); }
  } catch (err) { showToastMsg('❌', 'Cannot reach backend server.'); }
};

// ─── ADMIN REGISTRY ─────────────────────────────
let PENDING_STARTUPS = [
  { name: 'AgroBot',       industry: 'AgriTech',  stage: 'Seed',     date: '2025-02-19', status: 'pending'  },
  { name: 'TravelAI',      industry: 'Travel',    stage: 'Pre-Seed', date: '2025-02-18', status: 'pending'  },
  { name: 'LegalTech Pro', industry: 'LegalTech', stage: 'Series A', date: '2025-02-17', status: 'approved' },
];

window.renderRegistry = function() {
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
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);"> Startup Applications</div>
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

window.approveStartupApp = function(i) { PENDING_STARTUPS[i].status = 'approved'; renderRegistry(); showToastMsg('✅', PENDING_STARTUPS[i].name + ' approved!'); };
window.rejectStartupApp = function(i) { const n = PENDING_STARTUPS[i].name; PENDING_STARTUPS.splice(i, 1); renderRegistry(); showToastMsg('🗑️', n + ' application rejected.'); };


// ─── AUDIT LOGS ─────────────────────────────
const AUDIT_LOGS = [
  { ts: '2025-02-21 09:14:32', user: 'compliance@ses.com',  action: 'Approved startup: MedVault',       ip: '10.0.1.12',   level: 'INFO'  },
  { ts: '2025-02-21 08:45:19', user: 'ecosystem@ses.com',   action: 'Updated commission rate to 1%',    ip: '10.0.1.1',    level: 'WARN'  },
  { ts: '2025-02-21 08:12:07', user: 'investor@ses.com',   action: 'Investment $50,000 → EduQuest',    ip: '172.16.0.45', level: 'INFO'  },
  { ts: '2025-02-20 18:30:55', user: 'unknown',            action: 'Failed login attempt (x3)',         ip: '185.23.44.1', level: 'ALERT' },
];

window.renderAudit = function() {
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
    </div>`;
}

// ─── AI EXAMINER ─────────────────────────────
let aiExaminerMessages = [];
window.renderAIExaminer = function() {
  aiExaminerMessages = [{
    from: 'assistant',
    text: '👋 Hello! I\'m your AI Product Examiner powered by Gemini. Share your pitch, product details, or any specific aspect you\'d like me to analyze — I\'ll give you instant feedback, market analysis, and improvement tips.'
  }];
  const main = document.getElementById('page-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">AI Product Examiner</h1><p class="page-sub">Gemini powered pitch analysis &amp; feedback</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start;" class="ai-examiner-layout">
      <div class="ai-chat-box">
        <div class="ai-chat-header">
          <div class="ai-badge"><div class="ai-dot"></div> AI Product Examiner</div>
        </div>
        <div class="ai-messages" id="ai-messages-area">${_renderAIExaminerMsgs()}</div>
      <div class="ai-input-row">
          <textarea class="form-input" id="ai-examiner-input" placeholder="Describe your product, pitch, or ask for feedback…" rows="2" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAIExaminerMsg();}" style="flex:1;margin-bottom:0;resize:none;line-height:1.5;"></textarea>
          <button type="button" class="btn-primary" style="padding:9px 16px;white-space:nowrap;align-self:flex-end;" onclick="sendAIExaminerMsg()">▶ Send</button>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:14px;">💡 Quick Prompts</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${["Analyze my pitch deck for investors","Review my go-to-market strategy","What are my biggest risks?"].map(q => `
              <button type="button" style="text-align:left;padding:9px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text-secondary);cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor=\'#00c2a8\';this.style.color=\'#00c2a8\'" onmouseout="this.style.borderColor=\'\';this.style.color=\'\';" onclick="quickExaminerPrompt(\'${q.replace(/'/g,"\\'")}\')"> ${q}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
};
function _renderAIExaminerMsgs() { return aiExaminerMessages.map(m => `<div class="ai-msg ${m.from}" style="border-radius:10px;padding:10px 14px;font-size:13px;line-height:1.6;${m.from==='user'?'align-self:flex-end;max-width:80%;':'align-self:flex-start;max-width:90%;'}">${m.text}</div>`).join(''); }
window.quickExaminerPrompt = function(q) { const input = document.getElementById('ai-examiner-input'); if (input) { input.value = q; sendAIExaminerMsg(); } };
window.sendAIExaminerMsg = async function() {
  const input = document.getElementById('ai-examiner-input');
  if (!input) return; const text = input.value.trim(); if (!text) return;
  input.value = ''; aiExaminerMessages.push({ from: 'user', text });
  const area = document.getElementById('ai-messages-area');
  if (!area) return;
  area.innerHTML = _renderAIExaminerMsgs() + '<div style="display:flex;gap:4px;align-items:center;padding:10px 14px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;align-self:flex-start;"><span style="width:6px;height:6px;background:#00c2a8;border-radius:50%;animation:pulse 1.4s ease infinite;display:inline-block;"></span></div>';
  area.scrollTop = area.scrollHeight;
  try {
    const res = await fetch(`${API_URL}/ai/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
    const data = await res.json();
    aiExaminerMessages.push({ from: 'assistant', text: data.reply || 'Unable to analyse at this time.' });
  } catch {
    aiExaminerMessages.push({ from: 'assistant', text: 'AI service unavailable.' });
  }
  area.innerHTML = _renderAIExaminerMsgs();
  area.scrollTop = area.scrollHeight;
};

// ─── AI HUB ─────────────────────────────
window.renderAIHub = function() {
  const main = document.getElementById('page-content');
  if (!main) return;

  const features = [
    { icon: '🤖', title: 'AI Product Examiner', badge: 'Gemini Powered', desc: 'Get instant AI feedback on your startup pitch.', action: "navigateTo('ai-examiner')", btn: 'Open AI Examiner', color: '#00c2a8' },
    { icon: '✨', title: 'AI Ecosystem Advisor', badge: 'Live Chat', desc: 'Chat with an AI advisor anytime.', action: "document.getElementById('chat-toggle-btn').click()", btn: 'Open AI Chat', color: '#3B82F6' },
    { icon: '🏆', title: 'AI Team Matcher', badge: 'Hackathon AI', desc: 'AI-powered team recommendations for hackathons.', action: "window.hackAIMatch()", btn: 'Find My Team', color: '#f59e0b' },
  ];

  main.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">✨ AI Features</h1>
        <p class="page-sub">All AI-powered tools in one place — powered by Gemini</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:32px;">
      ${features.map(f => `
        <div class="card ai-hub-card" style="border-top:3px solid ${f.color};position:relative;overflow:hidden;">
          <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">
            <div style="font-size:28px;line-height:1;">${f.icon}</div>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text-primary);">${f.title}</div>
              </div>
            </div>
          </div>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;">${f.desc}</p>
          <button type="button" onclick="${f.action}" style="padding:9px 18px;background:${f.color};border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">${f.btn} →</button>
        </div>`).join('')}
    </div>`;
};

// ─── AI TEAM MATCHMAKER MODAL LOGIC ─────────────────────

window.hackAIMatch = function() {
  const modal = document.getElementById('find-team-modal');
  if (!modal) return console.error("Find Team Modal HTML is missing!");
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Reset the UI states every time it opens
  document.getElementById('ai-team-prompt').value = '';
  document.getElementById('ai-team-loading').classList.add('hidden');
  document.getElementById('ai-team-results').classList.add('hidden');
  document.getElementById('ai-team-prompt').parentElement.classList.remove('hidden');
};

window.closeFindTeamModal = function() {
  document.getElementById('find-team-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
};

window.runTeamMatch = async function() {
  const promptInput = document.getElementById('ai-team-prompt');
  const text = promptInput?.value.trim();

  if (!text) {
    showToastMsg('⚠️', 'Please describe your skills and what you are looking for!');
    return;
  }

  // Hide the text box and show the cool loading animation
  promptInput.parentElement.classList.add('hidden');
  document.getElementById('ai-team-loading').classList.remove('hidden');
  document.getElementById('ai-team-results').classList.add('hidden');

  const btn = document.getElementById('btn-run-matchmaker');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Scanning Ecosystem...';
  }

  try {
    // Call your newly secured backend API
    const res = await fetch(`${API_URL}/ai/match-team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APP.token}`
      },
      body: JSON.stringify({ prompt: text })
    });

    const data = await res.json();

    if (res.ok) {
      // Hide loading, show results
      document.getElementById('ai-team-loading').classList.add('hidden');
      const resultsDiv = document.getElementById('ai-team-results');
      resultsDiv.classList.remove('hidden');
      
      // Render the AI response
      resultsDiv.innerHTML = `
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;">✨ Match Recommendations</div>
        <div style="font-size:14px;color:var(--text-primary);line-height:1.6;white-space:pre-wrap;">${data.result || data.reply || data.message || "Match found!"}</div>
        <button type="button" class="btn-primary" style="margin-top:16px;width:100%;" onclick="closeFindTeamModal(); navigateTo('hackathon'); hackSwitchTab('teams');">Browse Hackathon Teams</button>
      `;
      showToastMsg('✅', 'AI found your matches!');
    } else {
      throw new Error(data.message || 'Matchmaking failed');
    }
  } catch (err) {
    showToastMsg('❌', err.message || 'AI service unavailable');
    // If it fails, bring the text box back so they can try again
    promptInput.parentElement.classList.remove('hidden');
    document.getElementById('ai-team-loading').classList.add('hidden');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✨ Find My Team';
    }
  }
};

// ─── SCROLL REVEAL OBSERVER ───────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15 // Triggers when 15% of the element is visible
  };

  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, observerOptions);

  // Attach observer to all elements with the 'scroll-reveal' class
  document.querySelectorAll('.scroll-reveal').forEach(el => {
    scrollObserver.observe(el);
  });
  
  // Immediately trigger the hero section so it pops in on load
  document.querySelector('.hero-section')?.classList.add('is-visible', 'scroll-reveal');
});

// ─── REPORTS ─────────────────────────────
const REPORT_DATA = {
  userGrowth:    [12, 19, 28, 35, 42, 58, 74, 89, 103, 118, 134, 151],
  startupReg:    [3, 5, 4, 8, 6, 11, 9, 14, 12, 17, 15, 20],
  investments:   [0, 2, 1, 4, 3, 7, 6, 9, 8, 12, 10, 14],
  hackathons:    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
};

let activeReportTab = 'overview';

window.renderReports = function() {
  const main = document.getElementById('page-content');
  if (!main) return;
  const isSuperadmin = APP.role === 'superadmin';

  main.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div><h1 class="page-title">📊 Reports</h1><p class="page-sub">Platform analytics, activity summaries and exportable reports</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" class="btn-primary" style="padding:9px 18px;" onclick="exportReport('csv')">⬇ Export CSV</button>
      </div>
    </div>
    <div class="hack-tab-bar" style="margin-bottom:24px;">
      <button type="button" class="hack-tab ${activeReportTab==='overview'?'active':''}" onclick="switchReportTab('overview')">📋 Overview</button>
      <button type="button" class="hack-tab ${activeReportTab==='users'?'active':''}" onclick="switchReportTab('users')">👥 Users</button>
    </div>
    <div id="report-tab-content">${_renderReportTab(activeReportTab, isSuperadmin)}</div>`;
  setTimeout(() => _drawReportCharts(activeReportTab), 50);
};

window.switchReportTab = function(tab) { activeReportTab = tab; renderReports(); };

function _renderReportTab(tab, isSuperadmin) {
  if (tab === 'overview') return `
    <div class="stats-row" style="margin-bottom:24px;">
      ${[
        { label:'Total Users',       value:'151',   delta:'+13%', icon:'👥', color:'#3B82F6' },
        { label:'Active Startups',   value:'38',    delta:'+8%',  icon:'🚀', color:'#10b981' },
      ].map(k => `
        <div class="kpi-card" style="border-top:3px solid ${k.color};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>
            <div style="font-size:28px;">${k.icon}</div>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#10b981;font-weight:600;">${k.delta} vs last period</div>
        </div>`).join('')}
    </div>
    <div class="charts-grid" style="margin-bottom:24px;">
      <div class="card"><div style="font-family:var(--font-display);font-size:14px;font-weight:700;margin-bottom:14px;">📈 User Growth (Monthly)</div><canvas id="rpt-user-chart" height="200"></canvas></div>
    </div>`;
  if (tab === 'users') return `
    <div class="card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;">
        <div style="font-family:var(--font-display);font-size:14px;font-weight:700;margin-bottom:14px;align-self:flex-start;">🥧 Role Distribution</div>
        <canvas id="rpt-role-chart" height="200" style="max-width:240px;"></canvas>
    </div>`;
  return '';
}

function _drawReportCharts(tab) {
  const months = REPORT_DATA.months;
  const chartDefaults = { responsive:true, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ display:false } }, y:{ grid:{ color:'rgba(0,0,0,0.05)' } } } };

  if (tab === 'overview' || tab === 'users') {
    const uc = document.getElementById('rpt-user-chart');
    if (uc) new Chart(uc, { type:'line', data:{ labels:months, datasets:[{ data:REPORT_DATA.userGrowth, borderColor:'#3B82F6', backgroundColor:'rgba(59,130,246,0.08)', fill:true, tension:0.4, pointRadius:3 }] }, options:chartDefaults });
  }
  if (tab === 'users') {
    const rc = document.getElementById('rpt-role-chart');
    if (rc) new Chart(rc, { type:'doughnut', data:{ labels:['Investor','Startup','Organizer','IT Co','Officer','Other'], datasets:[{ data:[62,38,7,4,3,37], backgroundColor:['#3B82F6','#10b981','#f59e0b','#8B5CF6','#06B6D4','#94a3b8'] }] }, options:{ responsive:true, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 } } } }, cutout:'60%' } });
  }
}

window.exportReport = function(type) { showToastMsg('✅', 'CSV exported!'); };

// Main routing hook
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
  if (pageId === 'ai-hub')        { renderAIHub(); }
  if (pageId === 'reports')       { renderReports(); }
}
