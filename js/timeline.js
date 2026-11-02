/**
 * TIMELINE MODULE
 * Renders the Love Journey zigzag timeline from store.timeline.
 */

import store from './state.js';

const timelineWrap = document.getElementById('timeline-wrap');

// ── ICON MAP ──
const ICONS = {
  star: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  heart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  map: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  cake: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 1.5-1 2-1"/><path d="M2 21h20"/><path d="M7 8v2"/><path d="M12 8v2"/><path d="M17 8v2"/><path d="M7 4h0"/><path d="M12 4h0"/><path d="M17 4h0"/></svg>`,
  gift: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  music: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  camera: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
};

const DEFAULT_ICON = ICONS.star;

// ── FORMAT DATE ──
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── TAG COLOR ──
function tagColor(tag) {
  const map = {
    'Duyên khởi': 'var(--sky-100)',
    'Kỷ niệm': 'var(--rose-50)',
    'Phiêu lưu': 'rgba(200, 240, 220, 0.8)',
    'Mốc son': 'rgba(255, 235, 180, 0.8)',
  };
  return map[tag] || 'var(--sky-100)';
}

function tagTextColor(tag) {
  const map = {
    'Duyên khởi': 'var(--sky-600)',
    'Kỷ niệm': 'var(--rose-500)',
    'Phiêu lưu': '#2d7a50',
    'Mốc son': '#a06010',
  };
  return map[tag] || 'var(--sky-600)';
}

// ── ESCAPE ──
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── RENDER ──
function renderTimeline() {
  if (!timelineWrap) return;
  const timeline = store.get('timeline') || [];
  timelineWrap.innerHTML = '';

  timeline.forEach((event, i) => {
    const item = document.createElement('div');
    item.className = 'timeline-item appear';

    const icon = ICONS[event.icon] || DEFAULT_ICON;
    const dateStr = fmtDate(event.date);
    const isOdd = i % 2 === 0;

    const cardHTML = `
      <div class="timeline-card glass-card">
        <span class="timeline-date">${esc(dateStr)}</span>
        <h3 class="timeline-event-title">${esc(event.title)}</h3>
        <p class="timeline-desc">${esc(event.description)}</p>
        ${event.tag ? `<span class="timeline-tag" style="background:${tagColor(event.tag)};color:${tagTextColor(event.tag)}">${esc(event.tag)}</span>` : ''}
      </div>
    `;

    const nodeHTML = `
      <div class="timeline-node">
        <div class="node-circle">${icon}</div>
      </div>
    `;

    const emptyHTML = `<div class="timeline-empty"></div>`;

    if (isOdd) {
      item.innerHTML = cardHTML + nodeHTML + emptyHTML;
    } else {
      item.innerHTML = emptyHTML + nodeHTML + cardHTML;
    }

    timelineWrap.appendChild(item);
  });

  // Empty state
  if (timeline.length === 0) {
    timelineWrap.innerHTML = `
      <p style="text-align:center;color:var(--color-text-light);padding:var(--space-10) 0;font-size:var(--text-sm);">
        Chưa có mốc kỷ niệm — hãy thêm vào trong bảng Cài đặt
      </p>
    `;
  }

  // Trigger intersection observer for new elements
  initAppear();
}

// ── APPEAR OBSERVER ──
function initAppear() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.appear:not(.visible)').forEach(el => obs.observe(el));
}

// ── INIT ──
export function initTimeline() {
  renderTimeline();
  store.on('timeline', renderTimeline);
  store.on('*', (key) => {
    if (key === 'import' || key === 'reset') renderTimeline();
  });
}
