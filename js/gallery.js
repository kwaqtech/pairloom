/**
 * GALLERY MODULE
 * Renders Polaroid grid from store.photos, handles lightbox open/close.
 * Exposed as window.renderGallery() so settings.js can call it after uploads.
 */

import store from './state.js';

const gridEl = document.getElementById('polaroid-grid');
const lightbox = document.getElementById('lightbox');
const lbPhoto = document.getElementById('lightbox-img');
const lbCaption = document.getElementById('lightbox-caption');
const lbClose = document.getElementById('lightbox-close');
const lbBackdrop = document.getElementById('lightbox-backdrop');

// ── ICONS (inline SVG) ──
const ICON_ADD = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_IMG = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

// ── OPEN LIGHTBOX ──
function openLightbox(src, caption) {
  if (!lightbox) return;
  if (lbPhoto) lbPhoto.src = src;
  if (lbCaption) lbCaption.textContent = caption || '';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { if (lbPhoto) lbPhoto.src = ''; }, 400);
}

// ── RENDER ──
function renderGallery() {
  if (!gridEl) return;
  const photos = store.get('photos') || [];
  gridEl.innerHTML = '';

  photos.forEach((photo, i) => {
    const card = document.createElement('div');
    card.className = 'polaroid appear';
    card.style.setProperty('--index', i);
    card.innerHTML = `
      <div class="polaroid-photo">
        <img src="${photo.src}" alt="${photo.caption || 'Ảnh kỷ niệm'}" loading="lazy" decoding="async">
      </div>
      <div class="polaroid-caption">
        <p class="polaroid-caption-text">${photo.caption || 'Kỷ niệm đẹp'}</p>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(photo.src, photo.caption));
    gridEl.appendChild(card);

    // Staggered appear-on-scroll
    requestAnimationFrame(() => {
      setTimeout(() => card.classList.add('visible'), i * 80);
    });
  });

  // "Add photo" tile (only visible in settings — clicking opens photo upload)
  const addCard = document.createElement('div');
  addCard.className = 'polaroid polaroid-add';
  addCard.innerHTML = `
    <div class="polaroid-add-icon">${ICON_ADD}</div>
    <span class="polaroid-add-text">Thêm ảnh<br>kỷ niệm</span>
  `;
  addCard.addEventListener('click', () => {
    const inp = document.getElementById('photo-upload-input');
    if (inp) inp.click();
    else document.getElementById('btn-settings-header')?.click();
  });
  gridEl.appendChild(addCard);

  // Empty state
  if (photos.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      padding: var(--space-10) 0;
      color: var(--color-text-light);
      font-size: var(--text-sm);
    `;
    emptyMsg.innerHTML = `
      <div style="margin-bottom:var(--space-3)">${ICON_IMG}</div>
      Chưa có ảnh kỷ niệm nào — hãy thêm vào qua bảng Cài đặt
    `;
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
    if (e.key === 'Escape' && lightbox?.classList.contains('open')) closeLightbox();
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
