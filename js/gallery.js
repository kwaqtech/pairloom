/**
 * GALLERY MODULE
 * Renders Polaroid grid from store.photos, handles lightbox open/close.
 * Exposed as window.renderGallery() so settings.js can call it after uploads.
 */

import store from './state.js';
import { safeMediaUrl } from './media-url.js';

const gridEl = document.getElementById('polaroid-grid');
const lightbox = document.getElementById('lightbox');
const lbPhoto = document.getElementById('lightbox-img');
const lbCaption = document.getElementById('lightbox-caption');
const lbClose = document.getElementById('lightbox-close');
const lbBackdrop = document.getElementById('lightbox-backdrop');
let lastTrigger = null;

// ── ICONS (inline SVG) ──
const ICON_ADD = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_IMG = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

// ── OPEN LIGHTBOX ──
function openLightbox(src, caption, trigger) {
  if (!lightbox) return;
  lastTrigger = trigger;
  if (lbPhoto) lbPhoto.src = src;
  if (lbCaption) lbCaption.textContent = caption || '';
  lightbox.inert = false;
  lightbox.setAttribute('aria-hidden', 'false');
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  lbClose?.focus();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('open');
  lightbox.inert = true;
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  lastTrigger?.focus();
  lastTrigger = null;
  setTimeout(() => { if (lbPhoto) lbPhoto.src = ''; }, 400);
}

// ── RENDER ──
function renderGallery() {
  if (!gridEl) return;
  const photos = store.get('photos') || [];
  gridEl.innerHTML = '';

  photos.forEach((photo, i) => {
    const src = safeMediaUrl(photo.src, 'image');
    if (!src) return;
    const caption = typeof photo.caption === 'string' ? photo.caption.trim() : '';
    const label = caption || 'Ảnh kỷ niệm';
    const card = document.createElement('div');
    card.className = 'polaroid appear';
    card.style.setProperty('--index', i);
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Mở ảnh: ${label}`);
    card.tabIndex = 0;

    const photoFrame = document.createElement('div');
    photoFrame.className = 'polaroid-photo';
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    img.loading = 'lazy';
    img.decoding = 'async';
    photoFrame.appendChild(img);

    const captionFrame = document.createElement('div');
    captionFrame.className = 'polaroid-caption';
    const captionText = document.createElement('p');
    captionText.className = 'polaroid-caption-text';
    captionText.textContent = caption || 'Ảnh kỷ niệm';
    captionFrame.appendChild(captionText);

    card.append(photoFrame, captionFrame);
    card.addEventListener('click', () => openLightbox(src, caption, card));
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openLightbox(src, caption, card);
    });
    gridEl.appendChild(card);

    // Staggered appear-on-scroll
    requestAnimationFrame(() => {
      setTimeout(() => card.classList.add('visible'), i * 80);
    });
  });

  // "Add photo" tile (only visible in settings — clicking opens photo upload)
  const addCard = document.createElement('div');
  addCard.className = 'polaroid polaroid-add';
  addCard.setAttribute('role', 'button');
  addCard.setAttribute('aria-label', 'Thêm ảnh kỷ niệm');
  addCard.tabIndex = 0;
  addCard.innerHTML = `
    <div class="polaroid-add-icon">${ICON_ADD}</div>
    <span class="polaroid-add-text">Thêm ảnh<br>kỷ niệm</span>
  `;
  addCard.addEventListener('click', () => {
    const inp = document.getElementById('photo-upload-input');
    if (inp) inp.click();
    else document.getElementById('btn-settings-header')?.click();
  });
  addCard.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    addCard.click();
  });
  gridEl.appendChild(addCard);

  // Empty state
  if (photos.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'gallery-empty-state';
    emptyMsg.setAttribute('role', 'status');
    emptyMsg.innerHTML = `${ICON_IMG}<p class="gallery-empty-title">Album chưa có ảnh</p><p class="gallery-empty-text">Ảnh tải lên sẽ xuất hiện ở đây cùng chú thích của bạn.</p>`;
    gridEl.insertBefore(emptyMsg, addCard);
  }
}

// ── SCROLL APPEAR ──
function initScrollObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.appear').forEach(el => observer.observe(el));
}

// ── INIT ──
export function initGallery() {
  renderGallery();

  // Lightbox close
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'Tab') {
      e.preventDefault();
      lbClose?.focus();
    }
  });

  // Subscribe to photo changes
  store.on('photos', () => renderGallery());
  store.on('*', (key) => {
    if (key === 'import' || key === 'reset') renderGallery();
  });

  // Expose globally for settings.js
  window.renderGallery = renderGallery;

  initScrollObserver();
}
