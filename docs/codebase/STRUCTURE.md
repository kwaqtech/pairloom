# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `index.html` | Single page: hero, vinyl, timeline, gallery, settings drawer | `index.html` |
| `js/` | ES module app (entry + features) | `js/app.js` and siblings |
| `css/` | Design tokens + layout + component styles | `css/tokens.css`, `css/main.css`, `css/components/` |
| `assets/music/` | Local MP3 playlist files | scan tree; `js/config.js` `src` paths |
| `assets/images/` | Image assets directory | scan tree |
| `docs/codebase/` | Generated codebase knowledge | this folder |
| `supabase/migrations/` | PostgreSQL schema, RLS, Storage policies, and RPCs | `supabase/migrations/0001_private_pairs.sql` |

### 2) Entry Points

- Main runtime entry: `index.html` → `js/app.js` (`main()`)
- Secondary entry points: NONE
- How entry is selected: browser loads `index.html`; `app.js` runs on `DOMContentLoaded` or immediately if document already ready (`js/app.js`)

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `js/app.js` | Boot, toast, theme, welcome gate, appear observer | Feature rendering |
| `js/state.js` | Load/save/merge localStorage, emit changes | DOM |
| `js/config.js` | Default couple data, playlist, timeline, milestones | Runtime I/O |
| `js/counter.js` | Day counter + special-days list | Audio |
| `js/vinyl.js` | Audio element, playlist UI, tonearm/disc classes | Settings state |
| `js/settings.js` | Settings drawer, form save, uploads | Canvas particles |
| `js/gallery.js` / `js/timeline.js` | Photo grid / journey list | Persistence internals |
| `js/sky-canvas.js` | Background particle canvas | App state besides reading `bgEffect` |
| `css/components/*.css` | Styles for matching JS features | Script |

### 4) Naming and Organization Rules

- File naming pattern: kebab-case CSS (`vinyl.css`); lowercase JS feature names (`counter.js`, `sky-canvas.js`)
- Directory organization pattern: feature files at `js/` root; CSS split tokens / main / components
- Import aliasing or path conventions: relative `./file.js` only (no `tsconfig` paths)

### 5) Evidence

- `docs/codebase/.codebase-scan.txt` DIRECTORY TREE
- `index.html` script and stylesheet links
- `js/app.js` import list
