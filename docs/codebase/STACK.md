# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | JavaScript (ES modules) | `index.html` (`<script type="module" src="js/app.js">`), `js/*.js` |
| Runtime + version | Browser app; Node.js runs Vite for development/build | `package.json`, `index.html` |
| Package manager | npm | `package.json`, `package-lock.json` |
| Module/build system | Vite + native ES modules | `package.json`, `js/app.js` |

### 2) Production Frameworks and Dependencies

The UI remains vanilla JS + CSS. Vite and Supabase JS provide development/build and browser Auth/Data access.

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `@supabase/supabase-js` | `^2.118.0` | Browser Auth, Postgres API, private Storage | `package.json`, `js/supabase-client.js` |
| `vite` | `^7.3.7` | Local dev server and static build | `package.json` |
| Google Fonts (runtime CSS) | n/a | Fonts loaded from Google | `index.html` preconnect to `fonts.googleapis.com` / `fonts.gstatic.com` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| None configured | No eslint/prettier/jest/ci | Scan: "No linting and formatting config"; "No CI/CD pipelines" |

### 4) Key Commands

```bash
npm install
npm run dev
```

### 5) Environment and Config

- Config sources: `js/config.js` (`DEFAULT_CONFIG`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Local env file: `.env.local` (ignored); `.env.example` lists required names
- Deployment/runtime constraints: Vercel static hosting; Supabase RLS is authorization boundary; autoplay gated by welcome click in `js/app.js`

### 6) Evidence

- `docs/codebase/.codebase-scan.txt`
- `index.html`
- `js/app.js`
- `js/config.js`
- `js/state.js`
