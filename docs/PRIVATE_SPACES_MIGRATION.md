# Private Pair Spaces: Migration Design

## Understanding

- Replace browser-only shared state with private pair spaces on Supabase, hosted by Vercel.
- Keep app in vanilla HTML, CSS, and JavaScript; use Supabase Auth, PostgreSQL, RLS, and private Storage.
- Google sign-in only; no public user search or directory.
- Each active space has exactly two original members. A user can belong to one active space at a time.
- Ending a relationship archives the old space. The person who leaves loses access; the other member keeps read-only access to old data. Both can join a different active space.
- Import existing localStorage and IndexedDB data without deleting local copies during migration.

## Assumptions

- Invite expires after seven days and is bound to the recipient's verified Google email.
- The raw one-time invite token is returned only to the inviter; database stores SHA-256 hash.
- Resolved invite rows clear recipient email and token hash; invite creation is capped at five attempts per inviter per ten minutes.
- Put invite token in URL fragment, preserve it in sessionStorage through OAuth redirect, then clear the fragment; never log it or put it in query parameters.
- Pair rows are created only when invite redemption succeeds, in one transaction.
- Archived spaces never accept new members or writes. Historical read access does not count as active membership.
- Browser talks to Supabase with the public anon/publishable key. RLS is the data boundary; service-role key never ships to browser.
- Supabase URL and publishable key are supplied and stored in ignored local env; Google OAuth credentials, redirect allowlists, and production domains are not yet configured.
- Existing audio in IndexedDB is not part of the current JSON export; import must read `celestial_romance_media` separately.
- Expected user count and traffic are not specified; MVP assumes small usage and relies on managed Supabase/Vercel limits, with pair/date indexes and media in object storage.
- User owns Supabase, Google OAuth, and Vercel operations. Backup retention, account deletion, monitoring, and recovery targets remain deployment decisions.

## Decision Log

| Decision | Choice | Alternatives considered | Reason |
|---|---|---|---|
| Hosting and data access | Vercel static app + direct Supabase client | Vercel API server for all database calls | Keeps current vanilla app; RLS protects direct client access without a service key in the browser. |
| Authentication | Supabase Google OAuth | Local PIN or app-managed passwords | Verified identity; local PIN is not authentication and no password store is needed. |
| Space membership | Exactly two permanent member rows; one active space per user | Account may join only one space ever; replaceable third member | Allows a new relationship after leaving while preventing concurrent active spaces and third members in an old space. |
| Ending relationship | Archive space; leaver loses access; other member gets read-only history | Close history to both members | Preserves the remaining member's memories while revoking the leaver. |
| Invites | One-use, seven-day, recipient-email-bound token | Reusable link or link-only bearer token | Limits exposure and blocks a forwarded link from a different Google account. |
| Media | Private Storage bucket; object path begins with space UUID | Public URLs or media stored in PostgreSQL | RLS checks membership on object requests and large media stays out of relational rows. |
| Privileged mutations | PostgreSQL RPC for invite creation/redemption and relationship ending | Client-side multi-step inserts or Vercel API handlers | Keeps membership and invite checks/writes atomic without a second authorization layer. |
| User discovery | None | Public account directory/search | Pairing happens only by direct invite link. |

## Schema and Access Rules

`pair_spaces`, `space_members`, `pair_invites`, `pair_settings`, `timeline_events`, `special_days`, `photos`, `playlist_tracks`, and `legacy_imports` live in `public`. `space_members` uses `active`, `history`, and `left` states, with a partial unique index on `user_id` for `active`. A deferred constraint trigger keeps exactly two original membership rows per space and requires two active members for active spaces. Archived spaces have no active members.

Every pair-owned table has RLS. Reads require active membership in an active space or history membership in an archived space. Writes require active membership and active space. Membership and invite state changes are RPC-only. Invite rows have no direct client read grant; raw tokens are never stored. There is no client-readable profile directory.

RLS helpers live in non-exposed `private` schema to avoid making membership checks callable as a public API. Only intentional invite and relationship RPCs are exposed to authenticated users.

Storage bucket `pair-media` stays private. Objects use `<space_uuid>/<random_uuid>.<extension>`. Storage SELECT permits active/history members; INSERT, UPDATE, and DELETE permit active members only. App requests short-lived signed URLs. Previously issued signed URLs remain usable until expiry.

Vercel headers set a restrictive baseline CSP, allow the configured Supabase origin for browser requests, deny framing, disable MIME sniffing, and suppress referrers.

## Implementation Status

- Added the first schema/RLS/RPC/Storage migration and browser Auth/invite UI.
- Vite reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `.env.local` is ignored by Git.
- Auth gate now starts on page load. Private app content stays locked until cloud reads/writes are connected.
- Google OAuth credentials and the local app redirect were entered in Supabase per user report; end-to-end OAuth has not been verified.
- Migration has not been applied to Supabase. The SQL Editor was given the file path as SQL; paste the file contents instead.
- App data, private media upload/download, archived-history view, and legacy import are not connected yet.

### Local Google OAuth URLs

- Supabase Auth URL Configuration: Site URL and allowed redirect URL `http://127.0.0.1:8000/`.
- Google Cloud OAuth client: authorized redirect URI `https://tawqjnlzrmpvfnaqlodn.supabase.co/auth/v1/callback`.
- Google client ID/secret belong in Supabase Auth → Providers → Google, never in this repository.
- `js/auth.js` sets the app redirect from the current origin and path, so local sign-in returns to `http://127.0.0.1:8000/`.
- Add the Vercel origin to Supabase's allowed redirect URLs after deployment.

## Import

Read `celestial_romance_v1` from localStorage and audio blobs from IndexedDB `celestial_romance_media`. Validate and normalize every item before uploading. Upload photos/audio to private Storage first, then write metadata rows. Keep browser data until the user confirms import completion. Existing backups and imported content remain private user data and must not enter Git.

## Rollout Slices

1. Remove personal seed values and the client-only PIN; add private-data ignores and keep current browser data intact.
2. Add the first PostgreSQL migration, RLS, Storage policies, and transactional RPCs.
3. Configure Google Auth and the Supabase browser client; add sign-in and active-space state.
4. Add recipient-bound invite creation, acceptance, reuse/expiry handling, and relationship ending.
5. Move app reads/writes and media to Supabase; preserve archived-space read-only access.
6. Add resumable localStorage/IndexedDB import and report items that need user action.
7. Verify two-pair isolation and leaver/history permissions in a Supabase staging project before production deployment.

## Open Deployment Decisions

- Supabase region and Google OAuth provider setup; project URL and publishable key are configured locally.
- Local, preview, and production redirect URLs.
- Backup retention and account deletion behavior before production data is stored.

## Release Checks

- Users in pair A cannot select, update, delete, or create Storage URLs for pair B.
- A member cannot create a second active space; concurrent invite redemptions still allow at most one active membership.
- Wrong-email, expired, revoked, and reused invite tokens fail; successful redemption creates exactly two members once.
- After ending a relationship, leaver cannot read database rows or Storage objects; remaining member can read but cannot write old-space data.
- An archived/history member can join another active space without gaining access to that new space's data unless invited.
- No personal defaults, credentials, or user media appear in the current tree. Before publishing existing Git history, remove the personal seed values already present in its initial commit or publish from a clean sanitized history.
