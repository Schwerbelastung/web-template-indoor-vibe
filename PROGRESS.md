# PROGRESS.md — build status

**Current phase: 3 — Experience badges, admin-set (in progress).**

## How to resume

Open a terminal in this repo folder, run `claude`, and say:
_"Read BUILD-PLAN.md and start from the current phase in PROGRESS.md."_

Phases 0–1 approved & committed 2026-07-22. Phase 2 next: propose sporty Google Fonts →
Vesa picks → swap Inter for it in `public/index.html` + `src/styles/marketplaceDefaults.css`
(+ `server/csp.js` if CDN-hosted), update snapshots, add font E2E assertion.

## Phase table

| Phase | Name                                    | Status               |
| ----- | --------------------------------------- | -------------------- |
| 0     | Orientation & bootstrap                 | ✅ done              |
| 1     | Running locally + test baseline         | ✅ done              |
| 2     | New marketplace-wide font               | ✅ done              |
| 3     | Experience badges (admin-set)           | 🔄 in progress       |
| 4     | Dual currency display (EUR + USD)       | pending              |
| 5A    | Cart state + UI                         | pending              |
| 5B    | One-payment cart checkout               | pending              |
| 6     | 2-hour customer cancellation            | pending              |
| 7     | Staging deploy (Render)                 | pending              |
| 8     | Going live                              | pending              |

## Key facts & decisions (Phase 0)

- **Tooling:** Node v25.8.0, Yarn 1.22.22, git 2.53.0. `package.json` engines is
  `^22.22.0 || >=24.0.0`, so Node 25 is supported. Render (Phase 7) will pin `NODE_VERSION=22.22.0`;
  if local Node 25 ever causes odd build issues, switch to Node 22 LTS (e.g. via nvm-windows).
- **Git state:** working tree was already clean — no CRLF cleanup needed. Repo-local
  `core.autocrlf=true` left as-is (works; don't churn it). Remotes verified:
  `origin` = Schwerbelastung/web-template-indoor-vibe (push auth tested OK with `--dry-run`),
  `upstream` = sharetribe/web-template (never push).
- **Template:** v12.0.0. Ships five processes in `src/transactions/` (purchase, booking, inquiry,
  negotiation, download) — this project uses `default-booking` + `default-purchase`, both on alias
  `release-1`. The `ext/transaction-processes/*/process.edn` files match BUILD-PLAN section 4 facts.
- **Config:** local `configDefault.js` currency is `USD` but the hosted localization asset from
  Console overrides it — EUR gets set in Console in Phase 1. `.env` doesn't exist yet (created via
  `yarn run config` in Phase 1); `.gitignore` covers `.env`.
- **Docs:** local Sharetribe docs confirmed reachable at `..\dev-docs-main\dev-docs-main\content\`.

## Key facts & decisions (Phase 1)

- App runs locally against the Dev marketplace; Console has EUR + "Daily rental" and "Buy bikes"
  listing types; `.env` filled by Vesa via `yarn run config` (gitignored, verified).
- Playwright `@playwright/test@1.61.1` added; `e2e/smoke.spec.js` (3 tests: landing hero, search
  results/empty-state, listing price — the last one skips until a listing exists);
  `playwright.config.js` honors `PLAYWRIGHT_BASE_URL` for remote runs (Phase 7) and otherwise
  starts/reuses the dev server on :3000. Run with `yarn run test:e2e`.
- Jest baseline: 69 suites / 1069 tests green. Note: on a *cold* cache (first run after install)
  4 page-suites can time out (lazy-loaded chunks + slow disk/Dropbox) — re-run before diagnosing.
- Landing-page content in Console is Finnish (auto-generated); microcopy is default English.
  Decide before go-live (plan says English-only). Not a code issue.
- Dev server for this workspace: `.claude/launch.json` (parent folder) runs
  `yarn --cwd web-template-indoor-vibe run dev`, port 3000.

## Key facts & decisions (Phase 2)

- Font: **Sora** (Vesa's pick), self-hosted variable font at `public/static/fonts/sora/`
  (2 woff2 files, latin + latin-ext, weights 100–800 in one file). `@font-face` + preload in
  `public/index.html`; stack + weights in `marketplaceDefaults.css` (`--fontWeightBlack`
  remapped 900→800 — Sora's max). Stripe card iframe fonts via css2 URL in
  `StripePaymentForm.js`. No CSP change needed (self-hosted = `self`).
- E2E has a font-loaded assertion (smoke.spec.js). Jest snapshots unaffected by font change.
- Known flake: LandingPage/Terms/Privacy(/ListingPage) "Fallback page on error" suites time out
  when the machine is busy (cold cache or parallel e2e). Re-run alone before diagnosing.
  Avoid running Jest and Playwright simultaneously.

## Phase 1 credentials checklist (Vesa)

From Sharetribe Console (Dev environment) and external services — have these ready:

1. Client ID + Client Secret — Console → Build → Advanced → Applications
2. Stripe **test** publishable key (`pk_test_...`) — the **secret** key (`sk_test_...`) goes into
   Console → Build → Integrations → Payments, not into this repo
3. Mapbox access token
