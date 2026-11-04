/**
 * APP — Entry point
 * Font loading gate, welcome splash, module initialization, IntersectionObserver, toast system.
 */

import store from './state.js';
import { initSkyCanvas }  from './sky-canvas.js';
import { initCounter }    from './counter.js';
import { initVinyl, unlockAudio, startMusic } from './vinyl.js';
import { initGallery }    from './gallery.js';
import { initTimeline }   from './timeline.js';
import { initSettings }   from './settings.js';
import { migrateLegacyAudio } from './media-store.js';
import { initAuthGate } from './auth.js';

// ── TOAST SYSTEM ──
const toastContainer = document.getElementById('toast-container');

export function showToast(message, type = 'info', duration = 3000) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ── THEME INITIALIZATION ──
function initTheme() {
  const currentTheme = store.get('theme') || 'deep-blue';
  document.documentElement.setAttribute('data-theme', currentTheme);

  store.on('theme', (val) => {
    document.documentElement.setAttribute('data-theme', val || 'deep-blue');
  });
}

// ── INTERACTIVE HEART BURST (Click/tap anywhere) ──
function initHeartBurst() {
  const heartIcons = ['💖', '💕', '✨', '🌸', '💙', '🤍', '⭐'];

  window.addEventListener('click', (e) => {
    // Skip if clicking inputs, buttons, sliders, or links
    if (e.target.closest('button, input, textarea, a, .effect-option, .theme-option, .upload-zone')) return;
    spawnHeart(e.clientX, e.clientY);
  });

  function spawnHeart(x, y) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    el.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    const dx = (Math.random() - 0.5) * 70;
    const rot = (Math.random() - 0.5) * 50;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.fontSize = `${18 + Math.random() * 10}px`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
}

// ── FONT LOADING GATE ──
function fontGate() {
  const html = document.documentElement;
  html.classList.add('fonts-pending');

  const FONT_TIMEOUT = 2500;
  let resolved = false;

  function resolve() {
    if (resolved) return;
    resolved = true;
    html.classList.remove('fonts-pending');
    html.classList.add('fonts-ready');
  }

  // Try to preload critical fonts
  const fontLoadPromises = [
    document.fonts.load('700 1em "Outfit"'),
    document.fonts.load('400 1em "Be Vietnam Pro"'),
  ];

  Promise.allSettled(fontLoadPromises).then(resolve);
  setTimeout(resolve, FONT_TIMEOUT); // Safety fallback
}

// ── WELCOME SPLASH ──
function initWelcome() {
  const welcomeScreen = document.getElementById('welcome-screen');
  if (!welcomeScreen) return;

  function dismiss() {
    startMusic(); // Plays music on direct user gesture
    welcomeScreen.classList.add('hidden');
    setTimeout(() => welcomeScreen.remove(), 800);
  }

  welcomeScreen.addEventListener('click', dismiss);
  welcomeScreen.addEventListener('touchend', (e) => {
    e.preventDefault();
    dismiss();
  }, { passive: false });

  // Auto-dismiss after 15s if user doesn't interact
  setTimeout(dismiss, 15000);
}

// ── GLOBAL SCROLL APPEAR ──
function initGlobalAppear() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.appear').forEach(el => observer.observe(el));
}

// ── MAIN ──
export async function initApp() {
  // 0. Theme initialization first
  initTheme();

  // 1. Font gate first (avoids FOUT)
  fontGate();

  // 2. Background canvas (lowest layer)
  initSkyCanvas();

  // 3. Welcome screen interaction handler
  initWelcome();

  // 4. Core modules
  initCounter();
  try {
    const migrated = await migrateLegacyAudio(store.get('playlist'));
    if (migrated) store.set('playlist', migrated);
  } catch (e) {
    console.warn('[App] Audio migration skipped:', e);
  }
  initVinyl();
  initTimeline();
  initGallery();
  initSettings();

  // 5. Interactive micro-delights
  initHeartBurst();

  // 6. Scroll-reveal for static elements
  requestAnimationFrame(() => {
    setTimeout(initGlobalAppear, 100);
  });
}

let appStartPromise = null;

async function startAuthorizedApp() {
  if (!appStartPromise) appStartPromise = initApp();
  await appStartPromise;
}

function lockPrivateApp() {
  document.body.classList.add('auth-pending');
  store.clearPrivate();

  document.getElementById('settings-drawer')?.classList.remove('open');
  document.getElementById('settings-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  const accountEmail = document.getElementById('settings-account-email');
  if (accountEmail) accountEmail.textContent = '';
  ['inp-name-a', 'inp-name-b', 'inp-start-date'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  ['avatar-preview-a', 'avatar-preview-b'].forEach((id) => {
    document.getElementById(id)?.querySelector('img')?.remove();
  });

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('open');
    lightbox.inert = true;
    lightbox.setAttribute('aria-hidden', 'true');
  }
  const photo = document.getElementById('lightbox-img');
  if (photo) photo.src = '';
  const caption = document.getElementById('lightbox-caption');
  if (caption) caption.textContent = '';
}

// Auth gate verifies membership before starting the app; cloud data loading is not wired yet.
initAuthGate({ onActiveSpace: startAuthorizedApp, onLocked: lockPrivateApp }).catch(() => {
  lockPrivateApp();
  const status = document.getElementById('auth-status');
  const error = document.getElementById('auth-error');
  if (status) status.textContent = 'Không khởi tạo được đăng nhập.';
  if (error) {
    error.textContent = 'Tải lại trang rồi thử lại.';
    error.hidden = false;
  }
});
