/**
 * STATE MANAGEMENT
 * Merges default config with LocalStorage overrides.
 * Provides reactive save/load with JSON export-import.
 */

import DEFAULT_CONFIG from './config.js';

const STORAGE_KEY = 'celestial_romance_v1';
const DEFAULTS_MIGRATION_KEY = 'celestial_romance_defaults_v2';

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const CORE_KEYS = ['nameA', 'nameB', 'startDate', 'pin', 'theme', 'bgEffect', 'milestones', 'timeline', 'specialDays'];

function applyDefaultMigration(state) {
  if (localStorage.getItem(DEFAULTS_MIGRATION_KEY) === '2') return state;
  const next = { ...state };
  if (next.nameA === 'Anh') next.nameA = DEFAULT_CONFIG.nameA;
  if (next.nameB === 'Em') next.nameB = DEFAULT_CONFIG.nameB;
  if (next.startDate === '2024-02-14') next.startDate = DEFAULT_CONFIG.startDate;
  const oldPlaylistIds = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const ids = (next.playlist || []).map(t => t.id).join(',');
  if (ids === oldPlaylistIds.join(',')) {
    next.playlist = clone(DEFAULT_CONFIG.playlist);
  }
  if (!Array.isArray(next.specialDays) || !next.specialDays.length) {
    next.specialDays = clone(DEFAULT_CONFIG.specialDays);
  }
  try { localStorage.setItem(DEFAULTS_MIGRATION_KEY, '2'); } catch (_) { /* ignore */ }
  return next;
}

function slimForStorage(state) {
  return {
    ...state,
    playlist: (state.playlist || []).map((track) => ({
      ...track,
      src: typeof track.src === 'string' && track.src.startsWith('data:') ? '' : track.src
    }))
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_CONFIG);
    const stored = JSON.parse(raw);
    const merged = applyDefaultMigration(deepMerge(clone(DEFAULT_CONFIG), stored));
    return merged;
  } catch (e) {
    console.warn('[State] Failed to parse LocalStorage, using defaults.', e);
    return clone(DEFAULT_CONFIG);
  }
}

function saveState(state) {
  const write = (payload) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };
  try {
    write(state);
    return true;
  } catch (e) {
    if (e.name !== 'QuotaExceededError') {
      console.error('[State] Save failed:', e);
      return false;
    }
    console.error('[State] LocalStorage quota exceeded, saving without large embeds.');
    try {
      localStorage.removeItem(STORAGE_KEY);
      write(slimForStorage(state));
      return true;
    } catch (e2) {
      try {
        const core = {};
        CORE_KEYS.forEach((k) => { core[k] = state[k]; });
        core.playlist = (state.playlist || []).map(({ id, title, artist, src, duration }) => ({
          id, title, artist, duration,
          src: typeof src === 'string' && src.startsWith('data:') ? '' : src
        }));
        core.photos = [];
        localStorage.removeItem(STORAGE_KEY);
        write(core);
        return true;
      } catch (e3) {
        console.error('[State] Core save also failed:', e3);
        return false;
      }
    }
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

class StateStore {
  constructor() {
    this._state = loadState();
    this._listeners = new Map();
    saveState(this._state);
  }

  get(key) {
    return key ? this._state[key] : clone(this._state);
  }

  set(key, value) {
    this._state[key] = value;
    const saved = saveState(this._state);
    this._emit(key, value);
    return saved;
  }

  patch(updates) {
    for (const [k, v] of Object.entries(updates)) {
      this._state[k] = v;
    }
    const saved = saveState(this._state);
    for (const [k, v] of Object.entries(updates)) {
      this._emit(k, v);
    }
    return saved;
  }

  on(key, fn) {
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key).delete(fn);
  }

  _emit(key, value) {
    if (this._listeners.has(key)) {
      this._listeners.get(key).forEach(fn => fn(value));
    }
    if (this._listeners.has('*')) {
      this._listeners.get('*').forEach(fn => fn(key, value));
    }
  }

  export() {
    const data = clone(this._state);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `love-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          this._state = deepMerge(clone(DEFAULT_CONFIG), imported);
          saveState(this._state);
          this._emit('*', 'import');
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  addPhoto(src, caption) {
    const id = `photo_${Date.now()}`;
    const photos = this.get('photos') || [];
    photos.push({ id, src, caption });
    return this.set('photos', photos);
  }

  removePhoto(id) {
    const photos = (this.get('photos') || []).filter(p => p.id !== id);
    return this.set('photos', photos);
  }

  addTimelineEvent(event) {
    const timeline = this.get('timeline') || [];
    const id = `t_${Date.now()}`;
    timeline.push({ id, ...event });
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    return this.set('timeline', timeline);
  }

  updateTimelineEvent(id, patch) {
    const timeline = (this.get('timeline') || []).map(ev => ev.id === id ? { ...ev, ...patch } : ev);
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    return this.set('timeline', timeline);
  }

  removeTimelineEvent(id) {
    const timeline = (this.get('timeline') || []).filter(ev => ev.id !== id);
    return this.set('timeline', timeline);
  }

  addTrack(track) {
    const playlist = this.get('playlist') || [];
    const id = track.id || `track_${Date.now()}`;
    playlist.push({ ...track, id });
    return this.set('playlist', playlist);
  }

  removeTrack(id) {
    const playlist = (this.get('playlist') || []).filter(t => t.id !== id);
    return this.set('playlist', playlist);
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DEFAULTS_MIGRATION_KEY);
    this._state = clone(DEFAULT_CONFIG);
    this._emit('*', 'reset');
  }
}

const store = new StateStore();
export default store;
