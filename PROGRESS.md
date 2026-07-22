# PROGRESS.md — build status

**Current phase: 1 — Running locally + test baseline (in progress).**

## How to resume

Open a terminal in this repo folder, run `claude`, and say:
_"Read BUILD-PLAN.md and start from the current phase in PROGRESS.md."_

Phase 0 approved & committed 2026-07-22. Phase 1 sequence: `yarn install` → Vesa runs
`yarn run config` himself (client ID/secret, Stripe pk_test, Mapbox) → Console tasks (EUR currency,
two listing types, Stripe sk_test saved) → `yarn run dev` manual checks → Jest baseline →
add Playwright smoke tests (`e2e/smoke.spec.js`, `playwright.config.js`, `test:e2e` script).

## Phase table

| Phase | Name                                    | Status               |
| ----- | --------------------------------------- | -------------------- |
| 0     | Orientation & bootstrap                 | ✅ done              |
| 1     | Running locally + test baseline         | 🔄 in progress       |
| 2     | New marketplace-wide font               | pending              |
| 3     | Experience badges (admin-set)           | pending              |
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

## Phase 1 credentials checklist (Vesa)

From Sharetribe Console (Dev environment) and external services — have these ready:

1. Client ID + Client Secret — Console → Build → Advanced → Applications
2. Stripe **test** publishable key (`pk_test_...`) — the **secret** key (`sk_test_...`) goes into
   Console → Build → Integrations → Payments, not into this repo
3. Mapbox access token
