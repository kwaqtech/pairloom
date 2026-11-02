/**
 * LOVE COUNTER MODULE
 * Real-time countdown: Years, Months, Days, Hours, Minutes, Seconds.
 * Next milestone detection, progress bar, and yearly special days.
 */

import store from './state.js';

const elDays = document.getElementById('counter-days');
const elYears = document.getElementById('time-years');
const elMonths = document.getElementById('time-months');
const elDaysU = document.getElementById('time-days');
const elHours = document.getElementById('time-hours');
const elMinutes = document.getElementById('time-minutes');
const elSeconds = document.getElementById('time-seconds');
const elSummary = document.getElementById('counter-summary');
const elEvents = document.getElementById('special-days-list');

const elNameA = document.getElementById('counter-name-a');
const elNameB = document.getElementById('counter-name-b');
const elAvatarA = document.getElementById('avatar-a');
const elAvatarB = document.getElementById('avatar-b');

let tickInterval = null;

const pad = (n) => String(Math.floor(n)).padStart(2, '0');

function parseLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function fmtViDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function dateDiff(start, now) {
  const diffMs = now - start;
  if (diffMs < 0) return { negative: true };

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { years, months, days, hours, minutes, seconds, totalDays, negative: false };
}

function daysUntil(from, month, day) {
  let target = new Date(from.getFullYear(), month - 1, day, 0, 0, 0, 0);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (target < today) {
    target = new Date(from.getFullYear() + 1, month - 1, day, 0, 0, 0, 0);
  }
  return Math.round((target - today) / 86400000);
}

function renderSpecialDays(now) {
  if (!elEvents) return;
  const list = store.get('specialDays') || [];
  const ranked = list
    .map((ev) => ({ ...ev, remain: daysUntil(now, ev.month, ev.day) }))
    .sort((a, b) => a.remain - b.remain);

  elEvents.innerHTML = ranked.map((ev, i) => {
    const when = ev.remain === 0 ? 'Hôm nay' : `Còn ${ev.remain} ngày`;
    return `<li class="special-day-item${i === 0 ? ' next' : ''}">
      <span class="special-day-name">${ev.label}</span>
      <span class="special-day-meta">${pad(ev.day)}/${pad(ev.month)} · ${when}</span>
    </li>`;
  }).join('');
}

// ── ANNIVERSARIES ──
// Yearly: same month/day as startDate, next occurrence.
// Monthly: same day-of-month, next month, clamped to short months (31 → 28/30).
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

function makeAnniversary(year, month, startDay) {
  return new Date(year, month, Math.min(startDay, daysInMonth(year, month)));
}

function cycleInfo(target, prev, today) {
  const daysLeft = Math.round((target - today) / 86400000);
  const span = target - prev;
  const progress = span > 0 ? Math.min(100, Math.max(0, ((today - prev) / span) * 100)) : 100;
  return { daysLeft, progress };
}

function nextYearAnniversary(start, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = today.getFullYear();
  let target = makeAnniversary(year, start.getMonth(), start.getDate());
  if (target < today) target = makeAnniversary(year + 1, start.getMonth(), start.getDate());
  const prev = makeAnniversary(target.getFullYear() - 1, start.getMonth(), start.getDate());
  const count = target.getFullYear() - start.getFullYear();
  return { ...cycleInfo(target, prev, today), target, count };
}

function nextMonthAnniversary(start, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const m = today.getMonth();
  let target = makeAnniversary(y, m, start.getDate());
  if (target < today) target = makeAnniversary(y, m + 1, start.getDate());
  const prevMonth = makeAnniversary(target.getMonth() === 0 ? target.getFullYear() - 1 : target.getFullYear(), (target.getMonth() + 11) % 12, start.getDate());
  const count = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
  return { ...cycleInfo(target, prevMonth, today), target, count };
}

function renderAnniversary(prefix, info) {
  const daysEl = document.getElementById(`milestone-${prefix}-days`);
  const unitEl = document.getElementById(`milestone-${prefix}-unit`);
  const labelEl = document.getElementById(`milestone-${prefix}-label`);
  const dateEl = document.getElementById(`milestone-${prefix}-date`);
  const fillEl = document.getElementById(`milestone-${prefix}-progress`);

  if (!info) {
    if (daysEl) daysEl.textContent = '—';
    if (unitEl) unitEl.textContent = 'ngày nữa';
    if (dateEl) dateEl.textContent = '';
    if (fillEl) fillEl.style.width = '0%';
    return;
  }

  const { daysLeft, progress, target, count } = info;
  const unit = prefix === 'year' ? 'năm' : 'tháng';
  const isToday = daysLeft === 0;

  if (labelEl) labelEl.textContent = `Kỷ niệm ${count} ${unit}`;
  if (daysEl) daysEl.textContent = isToday ? 'Hôm nay' : String(daysLeft);
  if (unitEl) unitEl.textContent = isToday ? `tròn ${count} ${unit}` : 'ngày nữa';
  if (dateEl) dateEl.textContent = target.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  if (fillEl) fillEl.style.width = `${progress}%`;
}

function renderMeta() {
  const nameA = store.get('nameA') || 'Kwaq';
  const nameB = store.get('nameB') || 'Cún';
  const avatarA = store.get('avatarA') || '';
  const avatarB = store.get('avatarB') || '';

  if (elNameA) elNameA.textContent = nameA;
  if (elNameB) elNameB.textContent = nameB;

  if (elAvatarA) {
    if (avatarA) {
      elAvatarA.innerHTML = `<img src="${avatarA}" alt="${nameA}">`;
    } else {
      elAvatarA.textContent = nameA.charAt(0).toUpperCase();
    }
  }
  if (elAvatarB) {
    if (avatarB) {
      elAvatarB.innerHTML = `<img src="${avatarB}" alt="${nameB}">`;
    } else {
      elAvatarB.textContent = nameB.charAt(0).toUpperCase();
    }
  }
}

function tick() {
  const startDateStr = store.get('startDate');
  if (!startDateStr) return;

  const start = parseLocalDate(startDateStr);
  const now = new Date();
  if (!start) return;
  const diff = dateDiff(start, now);

  if (diff.negative) {
    if (elDays) elDays.textContent = '0';
    if (elSummary) {
      elSummary.textContent = `Ngày bắt đầu là ${fmtViDate(start)} — đếm ngược sẽ hiện khi tới ngày đó.`;
    }
    renderAnniversary('year', null);
    renderAnniversary('month', null);
    renderSpecialDays(now);
    return;
  }

  if (elDays) elDays.textContent = diff.totalDays.toLocaleString('vi-VN');
  if (elYears) elYears.textContent = pad(diff.years);
  if (elMonths) elMonths.textContent = pad(diff.months);
  if (elDaysU) elDaysU.textContent = pad(diff.days);
  if (elHours) elHours.textContent = pad(diff.hours);
  if (elMinutes) elMinutes.textContent = pad(diff.minutes);
  if (elSeconds) elSeconds.textContent = pad(diff.seconds);

  renderAnniversary('year', nextYearAnniversary(start, now));
  renderAnniversary('month', nextMonthAnniversary(start, now));

  renderSpecialDays(now);
}

export function initCounter() {
  renderMeta();
  tick();
  tickInterval = setInterval(tick, 1000);

  store.on('startDate', () => tick());
  store.on('nameA', () => renderMeta());
  store.on('nameB', () => renderMeta());
  store.on('avatarA', () => renderMeta());
  store.on('avatarB', () => renderMeta());
  store.on('specialDays', () => tick());
  store.on('*', (key) => {
    if (key === 'import' || key === 'reset') { renderMeta(); tick(); }
  });
}

export function destroyCounter() {
  if (tickInterval) clearInterval(tickInterval);
}
