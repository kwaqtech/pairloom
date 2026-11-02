# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| high | Playlist MP3s were duplicate files; four copies were Ed Sheeran “Perfect” ID3 | file hashes + ID3 in `assets/music/` | Wrong song title in OS/media UI; clicking list did not change audio | Replace with unique files; Media Session title from playlist; no auto-skip on error |
| high | Settings save failed when localStorage quota exceeded | `js/state.js` original `saveState` returned false; `js/settings.js` toast | Names/date not persisted | Slim save without `data:` audio; always patch names |
| med | `new Date('YYYY-MM-DD')` is UTC | previous `js/counter.js` | Off-by-one day vs Vietnam calendar | `parseLocalDate` |
| med | PIN is client-side only | `js/settings.js`, `js/config.js` | Anyone can read storage | Treat as UX lock, not security |
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
| Client-only PIN | A07 Identification | `js/settings.js` `store.get('pin')` | Hides drawer | Not authentication |
| innerHTML of titles/captions | A03 Injection | `js/vinyl.js`, `js/gallery.js` | local-only site | No sanitization |
| Default PIN in source | N/A | `js/config.js` `pin: '0214'` | Hint in UI | Public default |

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

### 6) `[ASK USER]` Questions

1. [ASK USER] Playlist files were placeholders (duplicate Perfect / SoundHelix). Should the on-site titles stay Vietnamese song names while audio is royalty-free instrumentals, or will you drop in the real licensed MP3s later?
2. [ASK USER] Special-days list currently: Năm mới, Valentine, Quốc tế Phụ nữ, White Day, Quốc tế Thiếu nhi, Phụ nữ Việt Nam, Quốc tế Đàn ông, Giáng sinh. Add/remove any?
3. [ASK USER] Default PIN remains `0214` in config. Change it to `0805` (08/05 start date)?
4. [ASK USER] Is this site only opened locally, or will it be hosted publicly (affects PIN/XSS priority)?

### 7) Evidence

- `docs/codebase/.codebase-scan.txt`
- `js/vinyl.js`
- `js/state.js`
- `js/counter.js`
- `js/settings.js`
- `assets/music/` hashes (pre-fix: two MD5 groups)
