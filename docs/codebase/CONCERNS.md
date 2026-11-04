# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| high | Playlist MP3s were duplicate files; four copies were Ed Sheeran “Perfect” ID3 | file hashes + ID3 in `assets/music/` | Wrong song title in OS/media UI; clicking list did not change audio | Replace with unique files; Media Session title from playlist; no auto-skip on error |
| high | Settings save failed when localStorage quota exceeded | `js/state.js` original `saveState` returned false; `js/settings.js` toast | Names/date not persisted | Slim save without `data:` audio; always patch names |
| med | `new Date('YYYY-MM-DD')` is UTC | previous `js/counter.js` | Off-by-one day vs Vietnam calendar | `parseLocalDate` |
| high | App still persists user data in browser only | `js/state.js`, `js/media-store.js` | Data is not shared or protected by server authorization | Complete Supabase Auth/RLS integration before public app deployment |
| low | No tests / CI | scan | Regressions only caught manually | [ASK USER] whether tests are desired |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Uploaded MP3 as data URL | Settings “tải từ máy” | `js/settings.js` `readAsDataURL` | Quota, save failures | IndexedDB for blobs |
| Hours used wall-clock time | `now.getHours()` in old counter | `js/counter.js` (fixed to elapsed remainder) | Misleading timer | keep elapsed remainder |
| Duplicate placeholder music | assets copied | `assets/music/` | Same audio under many titles | unique files per title |
| Gallery HTML string interpolation | captions in innerHTML | `js/gallery.js` | XSS if caption hostile | textContent |

### 3) Security Concerns

| Risk | OWASP category (if applicable) | Evidence | Current mitigation | Gap |
|------|--------------------------------|----------|--------------------|-----|
| Shared user text rendered in HTML | A03 Injection | `js/counter.js`, `js/settings.js`, `js/vinyl.js`, `js/timeline.js` | Dynamic text now uses text nodes; remaining HTML strings are static icons | Validate imported records and media sources before remote sync |
| Local-only state | A01 Broken Access Control | `js/state.js`, `js/media-store.js` | No server authorization yet | Do not deploy as a private multi-pair app until RLS and Auth are connected |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Base64 photos in localStorage | `js/settings.js` `compressImage` still data URL | quota errors | few dozen photos | IndexedDB |
| Large MP3 in `assets/music` | scan CODE METRICS ~8–10MB each | slow first play | many tracks | streaming / smaller encodes |
| Sky canvas full-window rAF | `js/sky-canvas.js` | extra GPU on mobile | low | pause when tab hidden [TODO] |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `js/vinyl.js` | audio events, playlist index, autoplay | scan: no git history | generation token on load; do not skip on error |
| `js/state.js` | merge vs defaults | no git | explicit migrations |
| `index.html` | large single template | largest text file in scan | keep ids stable |

Scan: "No commits found" / "HIGH-CHURN FILES: None found".

### 6) Decisions

Private multi-pair decisions and implementation slices are recorded in `docs/PRIVATE_SPACES_MIGRATION.md`.

### 7) Evidence

- `docs/codebase/.codebase-scan.txt`
- `js/vinyl.js`
- `js/state.js`
- `js/counter.js`
- `js/settings.js`
- `assets/music/` hashes (pre-fix: two MD5 groups)
