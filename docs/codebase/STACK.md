# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | JavaScript (ES modules) | `index.html` (`<script type="module" src="js/app.js">`), `js/*.js` |
| Runtime + version | Browser only — no Node/Python app runtime in repo | `docs/codebase/.codebase-scan.txt` (no manifest); `index.html` |
| Package manager | None | Scan: "No recognized manifest files" |
| Module/build system | Native ESM, no bundler | `js/app.js` import map via relative `./` imports |

### 2) Production Frameworks and Dependencies

No npm/production package manifest exists. The UI is vanilla JS + CSS.

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| None (no package.json) | n/a | Static site | `.codebase-scan.txt` STACK DETECTION |
| Google Fonts (runtime CSS) | n/a | Fonts loaded from Google | `index.html` preconnect to `fonts.googleapis.com` / `fonts.gstatic.com` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| None configured | No eslint/prettier/jest/ci | Scan: "No linting and formatting config"; "No CI/CD pipelines" |

### 4) Key Commands

```bash
# No install/build/test/lint scripts exist.
# Serve the folder over HTTP so ES modules and audio load (file:// may block modules).
python -m http.server 8080
```

### 5) Environment and Config

- Config sources: `js/config.js` (`DEFAULT_CONFIG`), `localStorage` key `celestial_romance_v1` in `js/state.js`
- Required env vars: none ([TODO] no `.env.example`)
- Deployment/runtime constraints: static hosting; browser `localStorage` quota; autoplay gated by welcome click in `js/app.js`

### 6) Evidence

- `docs/codebase/.codebase-scan.txt`
- `index.html`
- `js/app.js`
- `js/config.js`
- `js/state.js`
