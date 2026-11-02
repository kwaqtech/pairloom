/**
 * MEDIA STORE
 * Audio blobs live in IndexedDB instead of localStorage:
 * - no base64 bloat (~33% larger)
 * - hundreds of MB instead of ~4MB before QuotaExceededError
 * - localStorage stays small metadata only, so saveState never wipes the playlist
 */

const DB_NAME = 'celestial_romance_media';
const STORE = 'audio';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export function putAudio(id, blob) {
  return run('readwrite', (s) => s.put(blob, id));
}

export function getAudio(id) {
  return run('readonly', (s) => new Promise((resolve) => {
    const r = s.get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  }));
}

export function deleteAudio(id) {
  return run('readwrite', (s) => s.delete(id));
}

export function clearAudio() {
  return run('readwrite', (s) => s.clear());
}

// ── LEGACY MIGRATION ──
// Older builds stored the whole MP3 as a base64 data URL in localStorage.
// Move those into IndexedDB once, then drop the src from storage.
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'audio/mpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function migrateLegacyAudio(playlist) {
  let changed = false;
  const next = [];
  for (const track of playlist || []) {
    if (typeof track.src === 'string' && track.src.startsWith('data:audio')) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await putAudio(track.id, dataUrlToBlob(track.src));
        const { src, ...rest } = track;
        next.push({ ...rest, source: 'local' });
        changed = true;
        continue;
      } catch (e) {
        console.warn('[Media] Legacy migration failed for', track.title, e);
      }
    }
    next.push(track);
  }
  return changed ? next : null;
}
