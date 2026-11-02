# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: single-page vanilla JS, feature modules around a reactive in-memory store
- Why this classification: `app.js` initializes independent modules that all `import store from './state.js'`
- Primary constraints: no backend; persistence is `localStorage`; music autoplay requires a user gesture (`initWelcome` → `startMusic`)

### 2) System Flow

```text
index.html
  -> js/app.js main()
  -> initTheme / initSkyCanvas / initCounter / initVinyl / initTimeline / initGallery / initSettings
  -> store.get / store.set / store.patch
  -> localStorage celestial_romance_v1
  -> DOM updates (counter, playlist, gallery, timeline)
```

1. Browser loads `index.html` and `js/app.js`.
2. `StateStore` constructor loads JSON from `localStorage` merged with `DEFAULT_CONFIG`.
3. Feature `init*` functions bind DOM and subscribe via `store.on`.
4. Welcome overlay click calls `startMusic()` so audio can play.
5. Settings save calls `store.patch`; listeners refresh names, date, playlist.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| `js/state.js` | Persistence, merge, playlist/photo helpers | DOM ids | `StateStore` |
| `js/config.js` | Seed content | Saving | `DEFAULT_CONFIG` |
| Feature modules | UI for one region | Cross-feature DOM except documented hooks | `window.renderGallery` comment in `gallery.js` |
| `css/` | Presentation | Behavior | component CSS files |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Singleton store | `js/state.js` `export default store` | One settings document |
| Pub/sub `store.on(key)` | counter, vinyl, app theme | Refresh UI after save |
| Init functions | `export function initX` | Boot from `app.js` |
| Welcome gesture gate | `js/app.js` `initWelcome` | Browser autoplay policy |

### 5) Known Architectural Risks

- Entire app state (including base64 photos and data-URL audio) in one `localStorage` key can exceed quota (`js/state.js` `QuotaExceededError`).
- Default config vs stored JSON: first visit writes defaults; later `config.js` edits do not apply unless migration runs (`DEFAULTS_MIGRATION_KEY` in `js/state.js`).
- No server-side auth: PIN only hides the settings drawer (`js/settings.js`).

### 6) Evidence

- `js/app.js`
- `js/state.js`
- `js/config.js`
- `index.html`
