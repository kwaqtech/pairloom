# Security automation

`.github/workflows/security-pipeline.yml` runs on pull requests, pushes to `main`/`master`, weekly, and manual dispatch.

| Pipeline step | Automation | State / limit |
|---|---|---|
| Asset inventory | Repo paths and configured deployment scanned by CI | Live domain inventory needs approved domain list. |
| Threat model | Keep data flows and trust boundaries in `docs/PRIVATE_SPACES_MIGRATION.md` | Human review required when architecture changes. |
| Secret scanning | Gitleaks scans current files and full Git history; redacts findings | Rotate any detected credentials. |
| SCA | `npm audit` blocks on low or higher severity | npm ecosystem only. |
| SAST | CodeQL `security-extended` for JavaScript | Results appear in GitHub code scanning; repository must support code scanning. |
| Secure code review/tests | Node test runner executes existing tests; CodeQL reviews source patterns | Manual review still needed for authorization and business logic. |
| API security | Supabase database tests should run against local disposable DB when pgTAP cases exist | No API/RLS test suite exists yet. |
| IaC/config | Vercel security headers are in `vercel.json`; CodeQL scans source | No Terraform/Kubernetes/Docker configuration exists to scan. |
| Container/supply chain | CycloneDX SBOM uploaded as workflow artifact | No container image exists. |
| Security integration tests | `node --test` runs current regression tests | Add isolated Auth/RLS and abuse cases before release. |
| DAST | ZAP baseline job requires repository variable `STAGING_URL` | Must be HTTPS and point only to an owned, isolated staging deployment. |
| Manual pentest | Report/retest gate remains manual | Requires approved scope and role-based test accounts. |
| TLS/headers/readiness | ZAP checks staging response; source headers live in `vercel.json` | Production TLS and rollback need deployment-level confirmation. |
| Remediation/release gate | `Security release gate` fails when checks, secrets, CodeQL, or configured DAST fail | Require `Security release gate` in branch protection; configure release approval in GitHub. |

## GitHub setup

1. Add repository variable `STAGING_URL` with the HTTPS URL of the isolated staging deployment; CI fails closed when it is missing or invalid.
2. Protect the default branch and require `Security release gate` as a status check.
3. Enable GitHub code scanning alerts. Dependabot weekly updates are defined in `.github/dependabot.yml`.
4. Keep staging data synthetic. Do not add service-role keys or OAuth client secrets to Actions variables or repository files.
5. Rotate the Google OAuth client secret found in the local `supabase/Google/` directory; `.gitignore` now excludes that file pattern.

The workflow does not scan arbitrary external domains, mutate production data, or replace manual penetration testing. No Git remote is configured in this checkout, so GitHub will not run this workflow until the repository is connected and pushed.
