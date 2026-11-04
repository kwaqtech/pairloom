# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| Google Fonts | CSS/font CDN | Load Outfit / Be Vietnam Pro (requested in `fontGate`) | none | low | `index.html` preconnect; `js/app.js` `document.fonts.load` |
| Supabase Auth | OAuth API | Google sign-in, invite/account session | PKCE; sessionStorage | high | `js/auth.js`, `js/supabase-client.js` |
| Supabase Postgres/Storage | Data API + object storage | Pair schema, RLS, private media | Publishable key + user JWT; RLS | high | `supabase/migrations/0001_private_pairs.sql` |
| Browser localStorage | Web storage | Legacy couple data awaiting import path | origin-scoped | high | `js/state.js` |
| HTMLAudioElement | Browser media | Play `assets/music/*.mp3` or user URLs | none | high | `js/vinyl.js` |
| Media Session API | Browser media overlay | Override OS now-playing title/artist | none | med | `js/vinyl.js` `navigator.mediaSession` |

Cloud data and media sync are not connected yet. User-supplied MP3 URLs in settings may point to third-party HTTP (`js/settings.js`).

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| localStorage `celestial_romance_v1` | Existing data source pending migration | `js/state.js` | Must not be shown to another signed-in account | `loadState` / `saveState` |
| Supabase Postgres + private Storage | Planned shared source of truth | RLS and bucket policies in migration | Migration must be applied and verified before public launch | `supabase/migrations/0001_private_pairs.sql` |

### 3) Secrets and Credentials Handling

- Credential sources: URL and publishable key live in ignored `.env.local`; service-role keys and Google OAuth client secrets stay in provider-managed secrets and never enter frontend files.
- Hardcoding checks: frontend source reads only Vite-prefixed Supabase variables.
- Rotation or lifecycle notes: enable Google OAuth only after Supabase Auth and RLS migrations are deployed to a staging project.

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
