# PROGRESS.md — build status

**Current phase: 5B — Shopping cart: one-payment checkout (in progress).**

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
| 3     | Experience badges (admin-set)           | ✅ done              |
| 4     | Dual currency display (EUR + USD)       | ✅ done              |
| 5A    | Cart state + UI                         | ✅ done              |
| 5B    | One-payment cart checkout               | 🔄 in progress       |
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

## Key facts & decisions (Phase 3)

- Badge = profile `metadata.indoorExperienceYears` ("1"|"2"|"3"); component
  `src/components/ExperienceBadge/` (pill, bronze/silver/gold, bike icon, null on invalid);
  rendered in ProfilePage MainContent + ListingPage UserCard. Admin guide: `docs/BADGES.md`.
  Styleguide preview: `/styleguide/c/ExperienceBadge` (registered in `src/examples.js`).
- Jest test convention: microcopy renders as **keys** in tests (testHelpers maps every message
  to its own key) — assert `'ExperienceBadge.oneYear'`, not English text.
- **Full Jest runs: use `$env:CI="true"; yarn test --runInBand`** (serial, like the template's
  own CI). Parallel workers cause false timeouts in the 4 lazy-loading page suites.
- E2E badge test: set `$env:E2E_BADGE_USER_ID="6a60cd57-499d-4f59-928e-2d64ce842134"`
  (Vesa's badge-holding Dev test user, gold tier). His test listing (purchase type):
  `6a60d73b-3864-4d11-9aa1-b899a62cd676` ("Exerpeutic 400XL Recumbent Bike", €5,000).
- Discovery: marketplace language in Console was Finnish → Finnish number formatting
  ("5 000,00 €") and Finnish landing content. Plan says English-only → Vesa switches language
  to English in Console at the start of Phase 4.

## Key facts & decisions (Phase 4)

- `GET /api/exchange-rate` (`server/api/exchange-rate.js`): Frankfurter ECB EUR→USD, 12h in-memory
  cache, serves stale on upstream error, `{rate: null}` if never fetched. Client: `getExchangeRate`
  in `util/api.js`; `useEurUsdRate()` hook in `src/util/exchangeRate.js` (fetches once per session,
  null during SSR). Utils in `util/currency.js`: `formatUsdEstimate` / `appendUsdEstimate`.
- Surfaces: ListingCard (helpers get eurUsdRate param), OrderPanel PriceMaybe, OrderBreakdown
  LineItemTotalPrice + disclaimer microcopy `OrderBreakdown.usdEstimateDisclaimer`.
- **DECISION AMENDED by Vesa (2026-07-22): marketplace locale is FINNISH** (Console language =
  Finnish; UI texts remain English via template en.json fallback). EUR renders "5 000,00 €".
  USD estimate format: **"$5 709,00 USD"** — $ always in front, number in app locale, "USD"
  suffix to disambiguate from other dollars. Full example: `5 000,00 € (≈ $5 704,00 USD)`.
- E2E `currency.spec.js` requires the `(≈ $… USD)` pattern on a search card + listing page.

## Key facts & decisions (Phase 5A)

- Cart lives in `currentUser.profile.privateData.cart`:
  `{ authorId, authorName, items: [{ listingId, quantity }], updatedAt }` (single-vendor).
  Global duck `src/ducks/cart.duck.js`: pure helpers (tested) + `saveCartThunk`
  (`sdk.currentUser.updateProfile` + `setCurrentUser`); slice only tracks saveInProgress/saveError.
- Add to cart: `ProductOrderForm` (purchase listings only) → `OrderPanel` → both ListingPage
  variants via `handleAddToCart` in ListingPage.shared.js; guests → signup redirect;
  different-seller add → `ReplaceCartModal` (ListingPage/ReplaceCartModal/).
- Topbar: `IconCart` component; desktop `#cart-link` + count bubble (TopbarDesktop), mobile bar
  icon + mobile-menu link. Count = total quantity via `cartItemCount(getCart(currentUser))`.
- `/cart` (auth) = `src/containers/CartPage/` — loadData: fetchCurrentUser → `listings.query`
  by ids incl. images/currentStock; rows with steppers (clamped to stock), remove, subtotal
  EUR + USD estimate; unavailable items excluded from subtotal. Checkout button disabled (5B).
- E2E `cart.spec.js` runs when `E2E_TEST_USER_EMAIL`/`E2E_TEST_USER_PASSWORD` are in `.env`
  (playwright.config loads dotenv). Test user owns the two purchase listings — own-listing
  cart adds are allowed (handy for testing; a real checkout of one's own listing fails anyway).
- Vesa's Dev listings: "Exerpeutic 400XL" (6a60d73b-…, €5,000) and "Exerpeutic 525XLR"
  (6a60f221-ffc6-40fa-b25a-8a35a3425188, €2,500, stock 5).

## Phase 1 credentials checklist (Vesa)

From Sharetribe Console (Dev environment) and external services — have these ready:

1. Client ID + Client Secret — Console → Build → Advanced → Applications
2. Stripe **test** publishable key (`pk_test_...`) — the **secret** key (`sk_test_...`) goes into
   Console → Build → Integrations → Payments, not into this repo
3. Mapbox access token
