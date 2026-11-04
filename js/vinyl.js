/**
 * VINYL PLAYER MODULE
 * Turntable mechanics: spinning disc, tonearm pivot, playlist control.
 * Handles browser autoplay policy via welcome screen gate.
 */

import store from './state.js';
import { getAudio } from './media-store.js';
import { safeMediaUrl } from './media-url.js';

// ── DOM REFS ──
const discWrapper = document.getElementById('vinyl-disc-wrapper');
const tonearmWrap = document.getElementById('vinyl-tonearm');
const vinylLabel = document.getElementById('vinyl-label-img');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const progressFill = document.getElementById('progress-fill');
const progressTrack = document.getElementById('progress-track');
const timeCurrentEl = document.getElementById('time-current');
const timeTotalEl = document.getElementById('time-total');
const trackTitleEl = document.getElementById('now-playing-title');
const trackArtistEl = document.getElementById('now-playing-artist');
const volumeSlider = document.getElementById('volume-slider');
const playlistEl = document.getElementById('playlist-mini');

// SVG icon paths
const ICON_PLAY = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const ICON_PAUSE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>`;
const ICON_PLAY_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const ICON_PAUSE_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>`;

// ── STATE ──
let audio = null;
let isPlaying = false;
let currentIdx = 0;
let playlist = [];
let loadGen = 0;
let eventsBound = false;
let playlistBound = false;

// track id → blob: object URL, so loadTrack can stay synchronous
const objectUrls = new Map();

export async function primeLocalAudio() {
  const list = store.get('playlist') || [];
  const keep = new Set();
  await Promise.all(list.map(async (track) => {
    if (track.source !== 'local' || track.src) return;
    keep.add(track.id);
    if (objectUrls.has(track.id)) return;
    try {
      const blob = await getAudio(track.id);
      if (blob) objectUrls.set(track.id, URL.createObjectURL(blob));
    } catch (e) {
      console.warn('[Vinyl] Could not read audio for', track.title, e);
    }
  }));
  // drop URLs for tracks that were removed
  for (const [id, url] of objectUrls) {
    if (!keep.has(id)) {
      URL.revokeObjectURL(url);
      objectUrls.delete(id);
    }
  }
}

// ── FORMAT TIME ──
const fmtTime = (s) => {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

function resolveSrc(src) {
  const safeSrc = safeMediaUrl(src, 'audio');
  if (!safeSrc || safeSrc.startsWith('data:') || safeSrc.startsWith('blob:')) return safeSrc;
  const url = new URL(safeSrc, window.location.href);
  url.searchParams.set('v', 'playlist2');
  return url.href;
}

function updateNowPlaying(track) {
  if (!track) return;
  if (trackTitleEl) trackTitleEl.textContent = track.title || 'Chọn một bài hát';
  if (trackArtistEl) trackArtistEl.textContent = track.artist || '—';
  const miniTitle = document.getElementById('mini-track-title');
  const miniArtist = document.getElementById('mini-track-artist');
  if (miniTitle) miniTitle.textContent = track.title || '';
  if (miniArtist) miniArtist.textContent = track.artist || '';
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || '',
        artist: track.artist || '',
        album: 'Playlist của chúng mình'
      });
    } catch (_) { /* MediaMetadata not supported */ }
  }
}

// ── RENDER PLAYLIST UI ──
function renderPlaylist() {
  if (!playlistEl) return;
  playlistEl.innerHTML = '';
  if (!playlist.length) {
    if (trackTitleEl) trackTitleEl.textContent = 'Chưa có bài hát';
    if (trackArtistEl) trackArtistEl.textContent = 'Thêm nhạc trong Cài đặt';
    const empty = document.createElement('li');
    empty.className = 'playlist-empty';
    empty.textContent = 'Danh sách phát đang trống';
    playlistEl.appendChild(empty);
    return;
  }

  playlist.forEach((track, i) => {
    const li = document.createElement('li');
    li.className = `playlist-item${i === currentIdx ? ' active' : ''}`;
    li.dataset.index = String(i);
    li.setAttribute('role', 'button');
    li.tabIndex = 0;
    const number = document.createElement('span');
    number.className = 'playlist-item-num';
    number.textContent = String(i + 1);
    const info = document.createElement('div');
    info.className = 'playlist-item-info';
    const title = document.createElement('div');
    title.className = 'playlist-item-name';
    title.textContent = track.title || '';
    const artist = document.createElement('div');
    artist.className = 'playlist-item-artist';
    artist.textContent = track.artist || '';
    info.append(title, artist);
    li.append(number, info);

    if (i === currentIdx && isPlaying) {
      const bars = document.createElement('div');
      bars.className = 'playing-bars';
      for (let bar = 0; bar < 3; bar += 1) {
        const item = document.createElement('div');
        item.className = 'playing-bar';
        bars.appendChild(item);
      }
      li.appendChild(bars);
    } else {
      const duration = document.createElement('span');
      duration.className = 'playlist-item-dur';
      duration.textContent = track.duration || '';
      li.appendChild(duration);
    }
    playlistEl.appendChild(li);
  });
}

function bindPlaylistClicks() {
  if (!playlistEl || playlistBound) return;
  playlistBound = true;
  playlistEl.addEventListener('click', (e) => {
    const li = e.target.closest('.playlist-item');
    if (!li) return;
    const idx = Number(li.dataset.index);
    if (Number.isNaN(idx)) return;

    // Always get fresh playlist from store to avoid stale state
    const freshPlaylist = store.get('playlist') || [];
    if (idx >= freshPlaylist.length) {
      console.warn('[Vinyl] Clicked index out of bounds:', idx, freshPlaylist.length);
      return;
    }

    if (idx === currentIdx && audio && audio.src) {
      togglePlay();
      return;
    }
    loadTrack(idx, true);
  });
  playlistEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.playlist-item');
    if (!li) return;
    e.preventDefault();
    const idx = Number(li.dataset.index);
    if (Number.isNaN(idx)) return;

    const freshPlaylist = store.get('playlist') || [];
    if (idx >= freshPlaylist.length) return;

    loadTrack(idx, true);
  });
}

// ── LOAD TRACK ──
export function loadTrack(idx, autoplay = false) {
  playlist = store.get('playlist') || [];
  if (!playlist.length) {
    renderPlaylist();
    return;
  }

  const gen = ++loadGen;
  currentIdx = ((idx % playlist.length) + playlist.length) % playlist.length;
  const track = playlist[currentIdx];
  if (!track) return;

  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.7;
    bindAudioEvents();
  }

  audio.pause();
  try { audio.currentTime = 0; } catch (_) { /* ignore if not ready */ }

  const src = track.source === 'local' && !track.src ? (objectUrls.get(track.id) || '') : resolveSrc(track.src);
  updateNowPlaying(track);
  if (progressFill) progressFill.style.width = '0%';
  if (timeCurrentEl) timeCurrentEl.textContent = '0:00';
  if (timeTotalEl) timeTotalEl.textContent = track.duration || '—';
  renderPlaylist();

  if (!src) {
    setPlaying(false);
    return;
  }

  audio.src = src;
  audio.load();

  if (autoplay) {
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        if (gen !== loadGen) return;
        setPlaying(true);
      }).catch(e => {
        if (gen !== loadGen) return;
        console.warn('[Vinyl] Autoplay prevented by browser:', e);
        setPlaying(false);
      });
    }
  } else {
    setPlaying(false);
  }
}

// ── PLAY / PAUSE ──
function setPlaying(state) {
  isPlaying = state;
  if (discWrapper) discWrapper.classList.toggle('playing', state);
  if (tonearmWrap) {
    tonearmWrap.classList.toggle('playing', state);
    tonearmWrap.classList.toggle('paused', !state);
  }
  if (btnPlay) btnPlay.innerHTML = state ? ICON_PAUSE : ICON_PLAY;

  const miniPill = document.getElementById('mini-player-pill');
  if (miniPill) {
    miniPill.classList.toggle('playing', state);
    const miniBtn = document.getElementById('mini-btn-play');
    if (miniBtn) miniBtn.innerHTML = state ? ICON_PAUSE_SM : ICON_PLAY_SM;
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state ? 'playing' : 'paused';
  }

  renderPlaylist();
}

export function togglePlay() {
  if (!audio || !audio.src) { loadTrack(currentIdx, true); return; }
  if (isPlaying) {
    audio.pause();
    setPlaying(false);
  } else {
    const gen = loadGen;
    audio.play().then(() => {
      if (gen !== loadGen) return;
      setPlaying(true);
    }).catch(e => {
      console.warn('[Vinyl] Play error:', e);
    });
  }
}

// ── START MUSIC (called when opening site) ──
export function startMusic() {
  if (!audio || !audio.src) {
    loadTrack(currentIdx, true);
  } else if (!isPlaying) {
    const gen = loadGen;
    audio.play().then(() => {
      if (gen !== loadGen) return;
      setPlaying(true);
    }).catch(e => {
      console.warn('[Vinyl] Autoplay error:', e);
    });
  }
}

// ── AUDIO EVENTS ──
function bindAudioEvents() {
  if (!audio || eventsBound) return;
  eventsBound = true;
  const genAtEvent = () => loadGen;

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressTrack) {
      progressTrack.setAttribute('aria-valuenow', String(Math.round(pct)));
      progressTrack.setAttribute('aria-valuetext', `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`);
    }
    if (timeCurrentEl) timeCurrentEl.textContent = fmtTime(audio.currentTime);
  });

  audio.addEventListener('ended', () => {
    if (!playlist.length) return;
    loadTrack(currentIdx + 1, true);
  });

  audio.addEventListener('loadedmetadata', () => {
    if (timeTotalEl) timeTotalEl.textContent = fmtTime(audio.duration);
    const track = playlist[currentIdx];
    if (track && audio.duration && isFinite(audio.duration)) {
      track.duration = fmtTime(audio.duration);
    }
  });

  audio.addEventListener('error', () => {
    const track = playlist[currentIdx];
    console.warn('[Vinyl] Audio file failed to load:', track?.src);
    setPlaying(false);
    // Do not auto-skip: that was jumping to the wrong title/file.
  });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', () => loadTrack(currentIdx - 1, true));
    navigator.mediaSession.setActionHandler('nexttrack', () => loadTrack(currentIdx + 1, true));
    navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
  }

  void genAtEvent;
}

// ── PROGRESS SEEK ──
function bindSeek() {
  if (!progressTrack) return;
  progressTrack.addEventListener('click', (e) => {
    if (!audio || !audio.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.min(1, Math.max(0, pct)) * audio.duration;
  });
  progressTrack.addEventListener('keydown', (e) => {
    if (!audio || !audio.duration) return;
    const currentPct = (audio.currentTime / audio.duration) * 100;
    let nextPct = currentPct;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nextPct -= 5;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nextPct += 5;
    else if (e.key === 'Home') nextPct = 0;
    else if (e.key === 'End') nextPct = 100;
    else return;
    e.preventDefault();
    audio.currentTime = Math.min(100, Math.max(0, nextPct)) * audio.duration / 100;
  });
}

// ── VOLUME ──
function bindVolume() {
  if (!volumeSlider) return;
  volumeSlider.value = 0.7;
  volumeSlider.addEventListener('input', () => {
    if (audio) audio.volume = parseFloat(volumeSlider.value);
  });
}

// ── UPDATE VINYL LABEL ──
function updateVinylLabel() {
  if (!vinylLabel) return;
  const avatarA = store.get('avatarA');
  const avatarB = store.get('avatarB');
  const src = safeMediaUrl(avatarA || avatarB, 'image');
  if (!src) return;
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Ảnh đôi';
  Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' });
  vinylLabel.replaceChildren(img);
}

// ── MINI PLAYER SETUP ──
function initMiniPlayer() {
  const miniPill = document.getElementById('mini-player-pill');
  if (!miniPill) return;

  const heroSection = document.getElementById('hero');
  window.addEventListener('scroll', () => {
    if (!heroSection) return;
    const rect = heroSection.getBoundingClientRect();
    const isPastHero = rect.bottom < 150;
    miniPill.classList.toggle('visible', isPastHero);
  }, { passive: true });

  const miniBtn = document.getElementById('mini-btn-play');
  if (miniBtn) {
    miniBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });
  }

  miniPill.addEventListener('click', () => {
    heroSection?.scrollIntoView({ behavior: 'smooth' });
  });
}

// ── INIT ──
export function initVinyl() {
  playlist = store.get('playlist') || [];
  renderPlaylist();

  if (btnPlay) btnPlay.addEventListener('click', togglePlay);
  if (btnPrev) btnPrev.addEventListener('click', () => loadTrack(currentIdx - 1, isPlaying));
  if (btnNext) btnNext.addEventListener('click', () => loadTrack(currentIdx + 1, isPlaying));

  bindSeek();
  bindVolume();
  bindPlaylistClicks();
  updateVinylLabel();
  initMiniPlayer();

  if (tonearmWrap) {
    tonearmWrap.classList.add('paused');
    tonearmWrap.classList.remove('playing');
  }

  primeLocalAudio().then(() => loadTrack(currentIdx, false));

  store.on('playlist', async (newPlaylist) => {
    playlist = newPlaylist || [];
    for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    objectUrls.clear();
    if (!playlist.length) {
      if (audio) { audio.pause(); audio.removeAttribute('src'); }
      currentIdx = 0;
      setPlaying(false);
      if (trackTitleEl) trackTitleEl.textContent = 'Chưa có bài hát';
      if (trackArtistEl) trackArtistEl.textContent = '—';
      renderPlaylist();
      return;
    }
    if (currentIdx >= playlist.length) currentIdx = 0;
    renderPlaylist();
    const wasPlaying = isPlaying;
    await primeLocalAudio();
    if (playlist[currentIdx]) loadTrack(currentIdx, wasPlaying);
  });
  store.on('avatarA', updateVinylLabel);
  store.on('avatarB', updateVinylLabel);
  store.on('*', (key) => {
    if (key === 'import' || key === 'reset') {
      playlist = store.get('playlist') || [];
      currentIdx = 0;
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
      objectUrls.clear();
      primeLocalAudio().then(() => loadTrack(0, false));
      updateVinylLabel();
    }
  });
}

export function unlockAudio() {
  startMusic();
}

export { togglePlay as playVinyl };
