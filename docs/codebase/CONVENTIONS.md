# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | kebab-case for CSS and multi-word JS | `sky-canvas.js`, `vinyl.css` | `js/`, `css/components/` |
| Functions/methods | camelCase | `loadTrack`, `saveAll` | `js/vinyl.js`, `js/settings.js` |
| Types/interfaces | None (no TypeScript) | n/a | no `.ts` in scan |
| Constants/env vars | UPPER_SNAKE for module constants | `STORAGE_KEY`, `ICON_PLAY` | `js/state.js`, `js/vinyl.js` |
| DOM ids | kebab-case | `counter-name-a`, `playlist-mini` | `index.html` |
| Private store fields | underscore prefix | `_state`, `_listeners`, `_emit` | `js/state.js` |

### 2) Formatting and Linting

- Formatter: none configured
- Linter: none configured
- Most relevant enforced rules: [TODO] informal only (section comments `── TITLE ──`)
- Run commands: none

### 3) Import and Module Conventions

- Import grouping/order: local `./` modules; `app.js` groups feature inits
- Alias vs relative import policy: relative only
- Public exports/barrel policy: no barrels; each file exports `initX` / default store / default config

### 4) Error and Logging Conventions

- Error strategy by layer: `try/catch` on storage and FileReader; vinyl logs `console.warn('[Vinyl] ...')`; settings shows `showToast`
- Logging style and required context fields: prefix `[State]` / `[Vinyl]`
- Sensitive-data redaction rules: [TODO] PIN stored in localStorage in plaintext (`js/config.js` `pin`, `js/state.js`)

### 5) Testing Conventions

- Test file naming/location rule: no tests in repo (scan + glob)
- Mocking strategy norm: n/a
- Coverage expectation: none

### 6) Evidence

- `js/app.js`
- `js/state.js`
- `js/vinyl.js`
- `js/settings.js`
- `docs/codebase/.codebase-scan.txt`
