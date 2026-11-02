# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| Google Fonts | CSS/font CDN | Load Outfit / Be Vietnam Pro (requested in `fontGate`) | none | low | `index.html` preconnect; `js/app.js` `document.fonts.load` |
| Browser localStorage | Web storage | Persist couple settings, playlist, photos | origin-scoped | high | `js/state.js` |
| HTMLAudioElement | Browser media | Play `assets/music/*.mp3` or user URLs | none | high | `js/vinyl.js` |
| Media Session API | Browser media overlay | Override OS now-playing title/artist | none | med | `js/vinyl.js` `navigator.mediaSession` |

No `fetch(` / `axios` / WebSocket usage in `js/` (grep). User-supplied MP3 URLs in settings would be third-party HTTP if entered (`js/settings.js` prompt for URL).

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| localStorage `celestial_romance_v1` | Source of truth after first load | `js/state.js` | Quota; JSON parse failure falls back to defaults | `loadState` / `saveState` |

### 3) Secrets and Credentials Handling

- Credential sources: PIN in `DEFAULT_CONFIG.pin` and stored state (`js/config.js`, `js/settings.js`)
- Hardcoding checks: default PIN `'0214'` is in source
- Rotation or lifecycle notes: user can set 4-digit PIN in settings; not hashed

### 4) Reliability and Failure Behavior

- Retry/backoff behavior: vinyl no longer auto-skips on `error` (avoids jumping tracks); settings import reloads page on success
- Timeout policy: font gate 2500ms (`js/app.js` `FONT_TIMEOUT`); welcome auto-dismiss 15000ms
- Circuit-breaker or fallback behavior: invalid localStorage → defaults; quota → slim payload without `data:` audio (`js/state.js`)

### 5) Observability for Integrations

- Logging around external calls: `console.warn` / `console.error` in state and vinyl
- Metrics/tracing coverage: none
- Missing visibility gaps: no analytics; audio errors only in console

### 6) Evidence

- `index.html`
- `js/app.js`
- `js/state.js`
- `js/vinyl.js`
- `js/settings.js`
