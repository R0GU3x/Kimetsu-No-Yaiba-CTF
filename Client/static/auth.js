/* ═══════════════════════════════════════════
   AUTH MODULE — KimetsuCTF (Single-Player)
   No teams · No passwords · Username only
═══════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Storage keys ── */
  const USERNAME_KEY = 'kimetsu_username';
  const SOLVED_KEY   = 'kimetsu_solved';
  const SCORE_KEY    = 'kimetsu_score';

  /* ── State ── */
  let username = localStorage.getItem(USERNAME_KEY) || null;

  /* ── Helpers ── */
  function saveUsername(name) {
    username = name;
    localStorage.setItem(USERNAME_KEY, name);
  }

  function clearAll() {
    username = null;
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(SOLVED_KEY);
    localStorage.removeItem(SCORE_KEY);
  }

  /* ── Wisteria corners (shared UI) ── */
  function wisteriaCorners() {
    return `
      <div class="wisteria-corner tl"><svg viewBox="0 0 60 60" fill="none"><path d="M0 0 L60 0 L0 60 Z" fill="rgba(200,146,42,0.8)"/><line x1="0" y1="20" x2="20" y2="0" stroke="rgba(200,146,42,0.5)" stroke-width="1"/></svg></div>`;
  }

  /* ─────────────────────────────────────────
     USERNAME PROMPT OVERLAY
  ───────────────────────────────────────── */
  function buildUsernameOverlay() {
    const ov = document.createElement('div');
    ov.id = 'username-overlay';
    ov.className = 'auth-overlay is-active';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Enter your slayer handle');

    ov.innerHTML = `
      <div class="auth-backdrop"></div>
      <div class="auth-card">
        ${wisteriaCorners()}
        <div class="auth-header">
          <div class="auth-title-block">
            <span class="auth-kanji">入</span>
            <span class="auth-title-en">ENTER THE CORPS</span>
            <span class="auth-subtitle">// LOCAL SINGLE-PLAYER MODE</span>
          </div>
        </div>
        <div class="auth-divider"></div>
        <div class="auth-feedback" id="un-feedback"></div>
        <div class="auth-field">
          <div class="auth-field-label">Your Slayer Handle</div>
          <input
            type="text"
            class="auth-input"
            id="un-input"
            placeholder="e.g. TanjiroKamado"
            autocomplete="off"
            maxlength="32"
            spellcheck="false"
          />
          <div class="auth-field-error" id="un-error"></div>
        </div>
        <button class="auth-btn" id="un-submit">BEGIN MISSION</button>
        <div class="auth-switch" style="opacity:0.5;font-size:11px;margin-top:12px;">Progress is stored locally in your browser.</div>
      </div>
    `;

    document.body.appendChild(ov);

    const input  = ov.querySelector('#un-input');
    const btn    = ov.querySelector('#un-submit');
    const fb     = ov.querySelector('#un-feedback');
    const errEl  = ov.querySelector('#un-error');

    function submit() {
      const val = input.value.trim();
      if (!val || val.length < 2) {
        errEl.textContent = 'Handle must be at least 2 characters.';
        errEl.className = 'auth-field-error is-visible';
        input.classList.add('is-error');
        return;
      }
      saveUsername(val);
      ov.classList.remove('is-active');
      setTimeout(() => ov.remove(), 400);
      document.body.style.overflow = '';
      refreshNavBtn();
      // Notify rest of app
      document.dispatchEvent(new CustomEvent('kimetsu:login', { detail: { username: val } }));
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    input.addEventListener('input',   () => {
      input.classList.remove('is-error');
      errEl.className = 'auth-field-error';
      errEl.textContent = '';
    });

    // Cursor events
    [btn, input].forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 80);
  }

  /* ─────────────────────────────────────────
     LOGOUT CONFIRMATION DIALOG
  ───────────────────────────────────────── */
  function showLogoutConfirm() {
    const existing = document.getElementById('logout-confirm-overlay');
    if (existing) existing.remove();

    const ov = document.createElement('div');
    ov.id = 'logout-confirm-overlay';
    ov.className = 'auth-overlay is-active';
    ov.setAttribute('role', 'alertdialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Confirm logout');

    ov.innerHTML = `
      <div class="auth-backdrop"></div>
      <div class="auth-card" style="max-width:420px;text-align:center;">
        ${wisteriaCorners()}
        <div class="auth-header" style="justify-content:center;">
          <div class="auth-title-block">
            <span class="auth-kanji" style="color:var(--blood-bright)">退</span>
            <span class="auth-title-en">ABANDON MISSION?</span>
            <span class="auth-subtitle">// THIS WILL ERASE ALL PROGRESS</span>
          </div>
        </div>
        <div class="auth-divider"></div>
        <p style="font-family:var(--font-mono);font-size:12px;letter-spacing:0.15em;color:var(--white-dim);opacity:0.75;line-height:1.7;margin:16px 0 24px;">
          Are you sure you want to logout? This will remove your local progress — solved challenges and score will be permanently deleted from this browser.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="auth-btn" id="logout-cancel" style="background:transparent;border:1px solid rgba(200,146,42,0.35);">STAY</button>
          <button class="auth-btn" id="logout-confirm" style="background:rgba(180,40,40,0.18);border-color:var(--blood-bright);color:var(--blood-bright);">RETREAT</button>
        </div>
      </div>
    `;

    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    ov.querySelector('#logout-cancel').addEventListener('click', () => {
      ov.classList.remove('is-active');
      setTimeout(() => ov.remove(), 300);
      document.body.style.overflow = '';
    });

    ov.querySelector('#logout-confirm').addEventListener('click', () => {
      clearAll();
      ov.classList.remove('is-active');
      setTimeout(() => {
        ov.remove();
        document.body.style.overflow = '';
        // Close account panel if open
        const acct = document.getElementById('account-panel-overlay');
        if (acct) acct.remove();
        refreshNavBtn();
        // Reset UI scores
        document.dispatchEvent(new CustomEvent('kimetsu:logout'));
        buildUsernameOverlay();
      }, 300);
    });

    [ov.querySelector('#logout-cancel'), ov.querySelector('#logout-confirm')].forEach(btn => {
      btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    ov.querySelector('#logout-confirm').focus();
  }

  /* ─────────────────────────────────────────
     ACCOUNT PANEL (minimal single-player)
  ───────────────────────────────────────── */
  function openAccount() {
    const existing = document.getElementById('account-panel-overlay');
    if (existing) { existing.remove(); return; }

    const solved  = JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]');
    const score   = parseInt(localStorage.getItem(SCORE_KEY) || '0', 10);

    const ov = document.createElement('div');
    ov.id = 'account-panel-overlay';
    ov.className = 'auth-overlay is-active';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');

    ov.innerHTML = `
      <div class="auth-backdrop"></div>
      <div class="auth-card" style="max-width:480px;">
        ${wisteriaCorners()}
        <div class="auth-header">
          <div class="auth-title-block">
            <span class="auth-kanji">者</span>
            <span class="auth-title-en">${username || 'SLAYER'}</span>
            <span class="auth-subtitle">// SLAYER PROFILE</span>
          </div>
          <button class="auth-close-btn" id="acct-close" aria-label="Close profile">✕</button>
        </div>
        <div class="auth-divider"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
          <div class="account-stat-cell" style="background:rgba(200,146,42,0.06);border:1px solid rgba(200,146,42,0.12);border-radius:6px;padding:16px;text-align:center;">
            <div class="account-stat-val" style="font-size:28px;font-family:var(--font-display);color:var(--gold-bright);">${score.toLocaleString()}</div>
            <div class="account-stat-key" style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.25em;opacity:0.6;margin-top:4px;">SCORE</div>
          </div>
          <div class="account-stat-cell" style="background:rgba(200,146,42,0.06);border:1px solid rgba(200,146,42,0.12);border-radius:6px;padding:16px;text-align:center;">
            <div class="account-stat-val" style="font-size:28px;font-family:var(--font-display);color:var(--gold-bright);">${solved.length}</div>
            <div class="account-stat-key" style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.25em;opacity:0.6;margin-top:4px;">SOLVES</div>
          </div>
        </div>

        <div class="account-actions" style="margin-top:8px;">
          <button class="auth-btn" id="acct-logout" style="background:rgba(180,40,40,0.12);border-color:var(--blood-bright);color:var(--blood-bright);width:100%;">⟵ RETREAT / LOGOUT</button>
        </div>
      </div>
    `;

    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    ov.querySelector('#acct-close').addEventListener('click', () => {
      ov.classList.remove('is-active');
      setTimeout(() => { ov.remove(); document.body.style.overflow = ''; }, 300);
    });
    ov.querySelector('.auth-backdrop').addEventListener('click', () => {
      ov.classList.remove('is-active');
      setTimeout(() => { ov.remove(); document.body.style.overflow = ''; }, 300);
    });
    ov.querySelector('#acct-logout').addEventListener('click', () => {
      ov.remove();
      document.body.style.overflow = '';
      showLogoutConfirm();
    });

    [ov.querySelector('#acct-close'), ov.querySelector('#acct-logout')].forEach(btn => {
      btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }

  /* ─────────────────────────────────────────
     NAV BUTTON
  ───────────────────────────────────────── */
  function injectNavAccountBtn() {
    const btn = document.getElementById('nav-account-btn');
    if (!btn) return;

    btn.style.display = '';
    btn.textContent = username || 'ENLIST';
    btn.className = 'nav-account-btn' + (username ? ' is-logged-in' : '');

    btn.addEventListener('click', () => {
      if (username) openAccount();
      else buildUsernameOverlay();
    });
    btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  }

  function refreshNavBtn() {
    const btn = document.getElementById('nav-account-btn');
    if (btn) {
      btn.style.display = '';
      btn.textContent = username || 'ENLIST';
      btn.classList.toggle('is-logged-in', !!username);
    }
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) logoutBtn.style.display = username ? '' : 'none';
  }

  /* ─────────────────────────────────────────
     LOGOUT event — reset score displays
  ───────────────────────────────────────── */
  document.addEventListener('kimetsu:logout', () => {
    const scoreEl  = document.getElementById('nav-score-value');
    const solvesEl = document.getElementById('hero-solves');
    if (scoreEl)  scoreEl.textContent  = '0';
    if (solvesEl) solvesEl.textContent = '0';
    // Reset challenge cards
    document.querySelectorAll('.challenge-card.solved').forEach(c => c.classList.remove('solved'));
    // Also reset internal state if script.js exposes it
    if (window.KimetsuState) {
      window.KimetsuState.reset();
    }
  });

  /* Escape key to close overlays */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['account-panel-overlay', 'logout-confirm-overlay'].forEach(id => {
      const ov = document.getElementById(id);
      if (ov) {
        ov.classList.remove('is-active');
        setTimeout(() => { ov.remove(); document.body.style.overflow = ''; }, 300);
      }
    });
  });

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    injectNavAccountBtn();

    // Wire dedicated nav logout button
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', showLogoutConfirm);
      logoutBtn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      logoutBtn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
      logoutBtn.style.display = username ? '' : 'none';
    }

    if (!username) {
      buildUsernameOverlay();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Public API */
  window.KimetsuAuth = {
    getUsername:       () => username,
    openAccount,
    showLogoutConfirm,
  };
})();
