/**
 * SETTINGS MODULE
 * Settings drawer UI, form bindings, photo upload with canvas compression,
 * timeline editor, playlist manager, export/import.
 */

import store from './state.js';
import { setEffect } from './sky-canvas.js';
import { showToast } from './app.js';
import { putAudio, deleteAudio, clearAudio } from './media-store.js';
import { safeMediaUrl } from './media-url.js';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav']);

// ── DOM REFS ──
const overlay = document.getElementById('settings-overlay');
const drawer = document.getElementById('settings-drawer');
const btnOpenSettings = document.querySelectorAll('.btn-settings');
const btnClose = document.getElementById('drawer-close');

// Settings form fields
const inpNameA = document.getElementById('inp-name-a');
const inpNameB = document.getElementById('inp-name-b');
const inpStartDate = document.getElementById('inp-start-date');
const avatarPickerA = document.getElementById('avatar-picker-a');
const avatarPickerB = document.getElementById('avatar-picker-b');
const avatarInputA = document.getElementById('avatar-input-a');
const avatarInputB = document.getElementById('avatar-input-b');
const effectOptions = document.querySelectorAll('.effect-option');

const photoUploadZone = document.getElementById('photo-upload-zone');
const photoUploadInput = document.getElementById('photo-upload-input');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importInput = document.getElementById('import-input');
const btnSave = document.getElementById('btn-save-settings');
const btnReset = document.getElementById('btn-reset');

// ── TABS ──
function activateTab(tabId) {
  document.querySelectorAll('.settings-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll('.settings-panel').forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });
}

function bindTabs() {
  const bar = document.querySelector('.settings-tabs');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.settings-tab');
    if (!btn) return;
    activateTab(btn.dataset.tab);
    const body = document.querySelector('.drawer-body');
    if (body) body.scrollTop = 0;
  });
}

// ── OPEN / CLOSE DRAWER ──
function openDrawer() {
  if (overlay) overlay.classList.add('open');
  if (drawer) drawer.classList.add('open');
  document.body.style.overflow = 'hidden';

  populateForm();
  closeTimelineForm();
}

function closeDrawer() {
  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
  document.body.style.overflow = '';
}

// ── POPULATE FORM ──
function populateForm() {
  if (inpNameA) inpNameA.value = store.get('nameA') || '';
  if (inpNameB) inpNameB.value = store.get('nameB') || '';
  if (inpStartDate) inpStartDate.value = store.get('startDate') || '';

  // Theme picker
  const currentTheme = store.get('theme') || 'deep-blue';
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === currentTheme);
  });

  // Effect picker
  const currentEffect = store.get('bgEffect') || 'hearts';
  effectOptions.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.effect === currentEffect);
  });

  // Playlist in settings
  renderSettingsPlaylist();

  // Timeline editor
  renderTimelineEditor();

  // Avatar previews
  const avA = store.get('avatarA');
  const avB = store.get('avatarB');
  const previewA = document.getElementById('avatar-preview-a');
  const previewB = document.getElementById('avatar-preview-b');
  const safeAvatarA = safeMediaUrl(avA, 'image');
  const safeAvatarB = safeMediaUrl(avB, 'image');
  if (previewA && safeAvatarA) {
    const img = document.createElement('img');
    img.src = safeAvatarA;
    img.alt = 'Avatar A';
    previewA.replaceChildren(img);
  }
  if (previewB && safeAvatarB) {
    const img = document.createElement('img');
    img.src = safeAvatarB;
    img.alt = 'Avatar B';
    previewB.replaceChildren(img);
  }
}

// ── SAVE ──
function saveAll() {
  const updates = {};
  if (inpNameA) updates.nameA = inpNameA.value.trim();
  if (inpNameB) updates.nameB = inpNameB.value.trim();
  if (inpStartDate?.value) updates.startDate = inpStartDate.value;

  const ok = store.patch(updates);
  if (ok) {
    showToast('Đã lưu thành công', 'success');
    closeDrawer();
  } else {
    showToast('Không thể lưu — bộ nhớ đầy', 'error');
  }
}

// ── IMAGE COMPRESSION ──
function compressImage(file, maxW = 800) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Unsupported image type or file too large'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const c = canvas.getContext('2d');
        c.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.80));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── AVATAR UPLOAD ──
function bindAvatarUpload(inputEl, storageKey, previewId) {
  if (!inputEl) return;
  inputEl.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file, 300);
      store.set(storageKey, b64);
      const preview = document.getElementById(previewId);
      if (preview) {
        const img = document.createElement('img');
        img.src = b64;
        img.alt = 'Avatar';
        preview.replaceChildren(img);
      }
      showToast('Đã cập nhật ảnh đại diện', 'success');
    } catch {
      showToast('Không thể đọc ảnh', 'error');
    }
    inputEl.value = '';
  });
}

// ── PHOTO UPLOAD ──
function bindPhotoUpload() {
  if (!photoUploadZone || !photoUploadInput) return;

  photoUploadZone.addEventListener('click', () => photoUploadInput.click());

  photoUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoUploadZone.style.borderColor = 'var(--rose-400)';
  });

  photoUploadZone.addEventListener('dragleave', () => {
    photoUploadZone.style.borderColor = '';
  });

  photoUploadZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    photoUploadZone.style.borderColor = '';
    const files = Array.from(e.dataTransfer.files).filter(f => ALLOWED_IMAGE_TYPES.has(f.type));
    for (const file of files) await uploadPhoto(file);
  });

  photoUploadInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) await uploadPhoto(file);
    e.target.value = '';
  });
}

async function uploadPhoto(file) {
  try {
    const b64 = await compressImage(file, 800);
    const caption = prompt('Ghi chú cho kỷ niệm này (có thể để trống):') || '';
    const ok = store.addPhoto(b64, caption);
    if (ok) {
      showToast('Đã thêm ảnh kỷ niệm', 'success');
      window.renderGallery?.();
    } else {
      showToast('Bộ nhớ đầy, hãy xóa bớt ảnh', 'error');
    }
  } catch {
    showToast('Không thể tải ảnh lên', 'error');
  }
}

// ── THEME PICKER ──
function bindThemePicker() {
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const theme = opt.dataset.theme;
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      store.set('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      showToast(`Đã áp dụng giao diện: ${opt.innerText.trim()}`, 'info', 2000);
    });
  });
}

// ── PLAYLIST MANAGER ──
function renderSettingsPlaylist() {
  const list = document.getElementById('settings-playlist-list');
  if (!list) return;
  const playlist = store.get('playlist') || [];
  list.innerHTML = '';
  if (!playlist.length) {
    const empty = document.createElement('li');
    empty.className = 'settings-playlist-empty';
    empty.textContent = 'Chưa có bài hát nào';
    list.appendChild(empty);
    return;
  }
  playlist.forEach((track, idx) => {
    const li = document.createElement('li');
    li.className = 'settings-playlist-item';
    const info = document.createElement('div');
    info.className = 'song-info';
    const title = document.createElement('span');
    title.className = 'song-title';
    title.textContent = `${idx + 1}. ${track.title || ''}`;
    const artist = document.createElement('span');
    artist.className = 'song-artist';
    artist.textContent = track.artist || '';
    info.append(title, artist);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn-remove-song';
    removeButton.title = 'Xóa bài hát';
    removeButton.setAttribute('aria-label', 'Xóa bài hát');
    removeButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    li.append(info, removeButton);
    removeButton.addEventListener('click', async () => {
      store.removeTrack(track.id);
      if (track.source === 'local') {
        try { await deleteAudio(track.id); } catch (e) { console.warn('[Settings] deleteAudio failed', e); }
      }
      showToast(`Đã xóa: ${track.title}`, 'info');
      renderSettingsPlaylist();
    });
    list.appendChild(li);
  });
}

const MAX_TRACK_BYTES = 30 * 1024 * 1024; // ponytail: 30MB/file ceiling, raise if anyone rips a full album side

function bindMusicManager() {
  const btnUploadMusic = document.getElementById('btn-upload-music');
  const musicUploadInput = document.getElementById('music-upload-input');

  if (btnUploadMusic && musicUploadInput) {
    btnUploadMusic.addEventListener('click', () => musicUploadInput.click());
    musicUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      musicUploadInput.value = '';
      if (!file) return;
      if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
        showToast('Định dạng nhạc không được hỗ trợ', 'error');
        return;
      }
      if (file.size > MAX_TRACK_BYTES) {
        showToast('File quá lớn (tối đa 30MB)', 'error');
        return;
      }
      const trackTitle = file.name.replace(/\.[^/.]+$/, '');
      const id = `track_${Date.now()}`;
      try {
        await putAudio(id, file);
      } catch (err) {
        console.error('[Settings] IndexedDB write failed', err);
        showToast('Không lưu được file nhạc', 'error');
        return;
      }
      store.addTrack({
        id,
        title: trackTitle,
        artist: 'Tải từ máy',
        src: '',
        duration: '—',
        source: 'local'
      });
      showToast(`Đã thêm bài hát: ${trackTitle}`, 'success');
      renderSettingsPlaylist();
    });
  }

  const btnClear = document.getElementById('btn-clear-playlist');
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      store.set('playlist', []);
      try { await clearAudio(); } catch (e) { console.warn('[Settings] clearAudio failed', e); }
      showToast('Đã xóa hết nhạc', 'info');
      renderSettingsPlaylist();
    });
  }
}

// ── TIMELINE EDITOR ──
let editingTimelineId = null;

function fmtTlDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d) ? dateStr : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderTimelineEditor() {
  const list = document.getElementById('timeline-editor-list');
  if (!list) return;
  const timeline = store.get('timeline') || [];
  list.innerHTML = '';

  if (!timeline.length) {
    const li = document.createElement('li');
    li.className = 'timeline-editor-empty';
    li.textContent = 'Chưa có mốc nào — bấm "Thêm mốc mới" để bắt đầu';
    list.appendChild(li);
    return;
  }

  timeline.forEach((ev) => {
    const li = document.createElement('li');
    li.className = 'timeline-editor-item' + (ev.id === editingTimelineId ? ' is-editing' : '');

    const info = document.createElement('div');
    info.className = 'tl-info';
    const title = document.createElement('span');
    title.className = 'tl-title';
    title.textContent = ev.title || '(chưa có tiêu đề)';
    const meta = document.createElement('span');
    meta.className = 'tl-meta';
    meta.textContent = [fmtTlDate(ev.date), ev.tag].filter(Boolean).join(' · ');
    info.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'tl-actions';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'tl-btn';
    btnEdit.setAttribute('aria-label', `Sửa mốc: ${ev.title || ''}`);
    btnEdit.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`;
    btnEdit.addEventListener('click', () => openTimelineForm(ev));

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'tl-btn is-danger';
    btnDel.setAttribute('aria-label', `Xóa mốc: ${ev.title || ''}`);
    btnDel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
    btnDel.addEventListener('click', () => {
      if (!confirm(`Xóa mốc "${ev.title}"?`)) return;
      if (editingTimelineId === ev.id) closeTimelineForm();
      store.removeTimelineEvent(ev.id);
      showToast('Đã xóa mốc', 'info');
      renderTimelineEditor();
    });

    actions.append(btnEdit, btnDel);
    li.append(info, actions);
    list.appendChild(li);
  });
}

function openTimelineForm(ev = null) {
  const form = document.getElementById('timeline-form');
  if (!form) return;
  editingTimelineId = ev?.id || null;

  form.hidden = false;
  document.getElementById('tl-date').value = ev?.date || '';
  document.getElementById('tl-icon').value = ev?.icon || 'star';
  document.getElementById('tl-title').value = ev?.title || '';
  document.getElementById('tl-desc').value = ev?.description || '';
  document.getElementById('tl-tag').value = ev?.tag || '';
  setTimelineError('');

  renderTimelineEditor();
  form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  document.getElementById('tl-title').focus();
}

function closeTimelineForm() {
  const form = document.getElementById('timeline-form');
  if (!form) return;
  form.hidden = true;
  form.reset();
  editingTimelineId = null;
  setTimelineError('');
  renderTimelineEditor();
}

function setTimelineError(msg) {
  const el = document.getElementById('tl-error');
  if (el) el.textContent = msg;
}

function saveTimelineForm() {
  const dateEl = document.getElementById('tl-date');
  const titleEl = document.getElementById('tl-title');
  const date = dateEl.value;
  const title = titleEl.value.trim();
  const description = document.getElementById('tl-desc').value.trim();
  const icon = document.getElementById('tl-icon').value;
  const tag = document.getElementById('tl-tag').value;

  if (!date) {
    setTimelineError('Chọn ngày cho mốc này');
    dateEl.focus();
    return;
  }
  if (!title) {
    setTimelineError('Nhập tiêu đề cho mốc này');
    titleEl.focus();
    return;
  }

  const payload = { date, title, description, icon, tag };
  const ok = editingTimelineId
    ? store.updateTimelineEvent(editingTimelineId, payload)
    : store.addTimelineEvent(payload);

  if (!ok) return setTimelineError('Không lưu được — bộ nhớ đầy');

  showToast(editingTimelineId ? 'Đã cập nhật mốc' : 'Đã thêm mốc mới', 'success');
  closeTimelineForm();
}

function bindTimelineEditor() {
  const btnAdd = document.getElementById('btn-add-timeline');
  const form = document.getElementById('timeline-form');
  if (btnAdd) btnAdd.addEventListener('click', () => openTimelineForm());
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveTimelineForm();
    });
  }
  const btnCancel = document.getElementById('tl-cancel');
  if (btnCancel) btnCancel.addEventListener('click', closeTimelineForm);
}

// ── EFFECT PICKER ──
function bindEffectPicker() {
  effectOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const effect = opt.dataset.effect;
      effectOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      store.set('bgEffect', effect);
      setEffect(effect);
    });
  });
}

// ── EXPORT / IMPORT ──
function bindExportImport() {
  if (btnExport) btnExport.addEventListener('click', () => {
    store.export();
    // ponytail: blobs stay out of the JSON backup; package them into a zip if that ever matters
    if ((store.get('playlist') || []).some((t) => t.source === 'local')) {
      showToast('Bản sao lưu không gồm file MP3 — cần thêm lại nhạc từ máy', 'info', 5000);
    }
  });
  if (btnImport) btnImport.addEventListener('click', () => importInput?.click());
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await store.import(file);
        showToast('Đã khôi phục dữ liệu thành công', 'success');
        closeDrawer();
        window.location.reload();
      } catch {
        showToast('File không hợp lệ', 'error');
      }
      importInput.value = '';
    });
  }
}

// ── INIT ──
export function initSettings() {
  // Open buttons
  btnOpenSettings.forEach(btn => btn.addEventListener('click', openDrawer));

  // Tabs
  bindTabs();

  // Close
  if (btnClose) btnClose.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);

  // Save & Reset
  if (btnSave) btnSave.addEventListener('click', saveAll);
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Đặt lại tất cả về mặc định? Hành động này không thể hoàn tác.')) {
        store.reset();
        clearAudio().catch((e) => console.warn('[Settings] clearAudio failed', e));
        showToast('Đã đặt lại', 'success');
        closeDrawer();
        window.location.reload();
      }
    });
  }

  // Avatar upload
  bindAvatarUpload(avatarInputA, 'avatarA', 'avatar-preview-a');
  bindAvatarUpload(avatarInputB, 'avatarB', 'avatar-preview-b');

  // Avatar picker click → trigger file input
  if (avatarPickerA) avatarPickerA.addEventListener('click', () => avatarInputA?.click());
  if (avatarPickerB) avatarPickerB.addEventListener('click', () => avatarInputB?.click());

  // Photo upload
  bindPhotoUpload();

  // Theme picker
  bindThemePicker();

  // Music manager
  bindMusicManager();

  // Effect picker
  bindEffectPicker();

  // Export/Import
  bindExportImport();

  // Timeline editor
  bindTimelineEditor();

  // Keyboard: Escape
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !drawer?.classList.contains('open')) return;
    const form = document.getElementById('timeline-form');
    if (form && !form.hidden) {
      closeTimelineForm();
      return;
    }
    closeDrawer();
  });
}
