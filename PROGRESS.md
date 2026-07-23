# PROGRESS.md — build status

**Current phase: 8 — Going live (NOT started; prerequisite: Vesa tests staging with fresh eyes).**

**Adversarial QA fixes applied 2026-07-23** (from Indoorbikeparadise-QA-Report.md):
- F1 (BLOCKER, money): `transactionLineItems` now reads validated cart items from a dedicated
  5th arg, never from client `orderData`; `initiate-privileged` strips client `validatedCartItems`.
  Regression test in `lineItems.cart.test.js`. Closes the "buy anything for ~€1" hole in BOTH
  `initiate-privileged` and `transaction-line-items`.
- F2 (stock race): `cart-finalize` claims `cartStockFinalized` BEFORE adjusting stock.
- F4 (over-restore): `cart-restore-stock` skips ids in `cartStockErrors`.
- F5: `MAX_CART_LINE_ITEMS` 49→46 (base+shipping+2 commission headroom).
- F6/F7 (privacy): removed Google-Fonts `cssSrc` from StripePaymentForm + PaymentMethodsForm
  (checkout is now Google-free; CSP allowlist left as harmless dead entries).
- F3 (dropped emails): re-anchored order-receipt + shipping-reminder to
  `:on close-cancellation-window` (fire when window closes → purchased). **Pushed
  default-purchase v4; release-1 → v4** (PT2H window intact; v3 was QA's leftover PT3M experiment).
- F9 (fetch timeout), F11 (assert EUR), F12 (.env-template), F-COUNTDOWN ("1h 60min" carry) fixed.
- Not changed (out of scope / accepted): F7b (our repo `.env` already uses names specs read;
  documented in .env-template), F8 (upstream skew), F10/F13 (accepted), F14/F15 (Console config),
  F16 (info). See Indoorbikeparadise-QA-Fixes-Report.pdf.

## How to resume

Open a terminal in this repo folder, run `claude`, and say:
_"Read BUILD-PLAN.md and start from the current phase in PROGRESS.md."_

Phases 0–5B approved & committed 2026-07-22.

**Phase 6 SHIPPED (2026-07-23): processes v2 live in Dev, aliases release-1 → v2.** Live-verified:
automated buy→countdown→cancel→refund (purchase). Manual rental-cancel + cart-cancel checks done
by Vesa at approval. Cancel e2e: `e2e/cancel.spec.js` (@payment). Original design notes below.

**Phase 6 design (decided with Vesa):**
- Booking accept-window: **option (i)** — provider `accept` stays `:from :state/preauthorized`
  only; provider waits max 2h. Cancel inside window = release preauth (never captured).
- Both edn processes: `confirm-payment :to :state/cancellation-window`; add
  `:transition/customer-cancel` (actor customer; booking actions
  [calculate-full-refund, stripe-refund-payment, decline-booking] — booking still *pending*;
  purchase actions [calculate-full-refund, stripe-refund-payment, cancel-stock-reservation],
  stock/booking action LAST) → cancelled/canceled; and `:transition/close-cancellation-window`
  (`:at {:fn/plus [{:fn/timepoint [:time/first-entered-state :state/cancellation-window]}
  {:fn/period ["PT2H"]}]}`, actions []) → preauthorized (booking) / purchased (purchase).
- Notifications for customer-cancel: reuse existing templates (plan-sanctioned): booking →
  :booking-declined-request (to customer) + :booking-operator-declined-request (to provider);
  purchase → :purchase-order-canceled-to-customer + -to-provider. Copy polish deferred to Phase 8.
- Known edge (accepted): bookings whose booking-end falls inside the 2h window get auto-expired
  right after the window closes (`:fn/min` in booking `expire`) — money always refunded, safe.
- Client: ActionButtons gets `hoursSinceTransition` condition type (+30s ticking re-render so the
  button hides live at expiry) and an optional `countdown: {sinceTransition, hours, translationKey}`
  on buttonProps rendering "cancellable for another X h Y min". stateData files get
  CANCELLATION_WINDOW conds (customer: cancel button; provider: info heading). Old in-flight txs
  whose lastTransition is confirm-payment render as cancellation-window — the >2h hide condition
  keeps the stale cancel button away (tiny <2h deploy edge accepted in Dev).
- Purchase customer-cancel with cartItems → TransactionPage.duck transition-success hook calls
  `cartRestoreStock({transactionId})` (endpoint from 5B; idempotent).
- delete-account.js: add 'cancellation-window' to both stripeRelatedStates arrays.
- flex-cli 1.16.0 installed globally; marketplace id `indoorbikeparadise-dev`; Vesa logs in
  (`flex-cli login`) with his own API key. Pull → edit → validate → push → client → alias.

**Phase 5B in-progress design (decided with Vesa):** stock handling = option (a): post-payment
`/api/cart-finalize` (idempotent through tx metadata `cartStockFinalized`; Integration SDK
compareAndSet stock decrement; failures logged, never block the redirect; operator reconciles
per docs/CART.md). Data flow: CartPage → CheckoutPage `setInitialValues` with
`{ listing: primaryListing, orderData: { quantity, deliveryMethod, cartItems: [{listingId, quantity}] } }`
→ `getOrderParams` adds cartItems → CheckoutPage.duck routes cartItems into the server-only
`orderData` (initiate + speculate paths) → `initiate-privileged` validates via new
`server/api-util/cartOrder.js` (same author, purchase process, published, stock, currency),
enriches orderData with priced cart items, injects `protectedData.cartItems` (titles for
rendering) → `lineItems.js` adds `line-item/cart-item-N` + commissions computed on the WHOLE
payin (synthetic commission base). `transition-privileged` intentionally NOT cart-aware (cart
checkout never starts from an inquiry). Delivery v1: primary listing's method (pickup when both
enabled); extra items carry no delivery fee. Client cart cleared after finalize. Integration
SDK dep added (`sharetribe-flex-integration-sdk@1.14.0`); `INTEGRATION_CLIENT_ID`/`SECRET`
expected in `.env` (Vesa's Console task). Rendering: `LineItemCartItemsMaybe` in OrderBreakdown
+ prefix `line-item/cart-item-` excluded from LineItemUnknownItemsMaybe.

## Phase table

| Phase | Name                                    | Status               |
| ----- | --------------------------------------- | -------------------- |
| 0     | Orientation & bootstrap                 | ✅ done              |
| 1     | Running locally + test baseline         | ✅ done              |
| 2     | New marketplace-wide font               | ✅ done              |
| 3     | Experience badges (admin-set)           | ✅ done              |
| 4     | Dual currency display (EUR + USD)       | ✅ done              |
| 5A    | Cart state + UI                         | ✅ done              |
| 5B    | One-payment cart checkout               | ✅ done              |
| 6     | 2-hour customer cancellation            | ✅ done              |
| 7     | Staging deploy (Render)                 | ✅ done              |
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

## Key facts & decisions (Phase 7)

- **Staging live: https://indoorbikeparadise-staging.onrender.com** (Render Blueprint from
  `render.yaml`; service `indoorbikeparadise-staging`, free plan — sleeps when idle; basic auth
  user `indoorbike`, password only in Render + Vesa's head). Secrets entered by Vesa in Render's
  env form; same values as local `.env` + BASIC_AUTH pair.
- **Every push to `main` auto-deploys staging** (Blueprint watches GitHub). Env var changes need
  Manual Deploy → Clear build cache & deploy (REACT_APP_ vars bake at build time).
- Staging e2e: `$env:PLAYWRIGHT_BASE_URL="https://indoorbikeparadise-staging.onrender.com"` +
  `E2E_STAGING_AUTH_USER`/`E2E_STAGING_AUTH_PASSWORD` in .env (playwright httpCredentials,
  remote runs only). Full suite green vs staging. Use `--workers=2` (free dyno).
- `e2e/helpers.js` shared `login(page, email, password)` — **hydration-safe** (SSR pages wipe
  values typed before React hydrates; fill is verified+retried). All login specs use it.
- `.sharetribe/config.json` records service name/staging URL for other Sharetribe skills.
- Local `yarn build` can fail EPERM on `build/` when Dropbox is mid-sync — retry after clearing;
  not a code issue (Render unaffected).

## Key facts & decisions (Phase 5B)

- One-payment cart checkout **verified end-to-end with a real test payment**: buyer account,
  2 listings, one PaymentIntent of €7,500; primary stock 5→4 (native reservation), extra item
  3→2 via `/api/cart-finalize` + Integration API `stockAdjustments`; cart auto-cleared.
- Server: `api-util/cartOrder.js` (validation: same author/purchase/published/stock/currency;
  max 49 extras), `api-util/integrationSdk.js`, `api/cart-finalize.js` + `api/cart-restore-stock.js`
  (idempotent via tx metadata `cartStockFinalized`/`cartStockRestored`; failures →
  `cartStockErrors`/`cartRestoreErrors` for operator reconciliation, see docs/CART.md).
  `lineItems.js`: `line-item/cart-item-N` + commissions on the whole payin (synthetic base).
  `initiate-privileged.js` injects `protectedData.cartItems`; listingPromise includes author.
- Client: cartItems ride orderData (CheckoutPage.duck initiate+speculate), `getOrderParams`
  + finalize+clearCart in `CheckoutPageWithPayment.js` handleSubmit success (failures never
  block redirect); CartPage checkout handler mimics ListingPage handleSubmit
  (setInitialValues → /l/:slug/:id/checkout). `LineItemCartItemsMaybe` renders titles from
  protectedData (LINE_ITEM_CART_ITEM_PREFIX excluded from UnknownItemsMaybe).
- **Own listings never show Add to cart** (isOwnListing guard in ProductOrderForm);
  e2e `own-listing.spec.js` gated on `E2E_SELLER_EMAIL`/`E2E_SELLER_PASSWORD`
  (seller login = buyer email without the "2", same password — per Vesa).
- `@payment`-tagged e2e (`cart-checkout.spec.js`) excluded from normal runs; run with
  `$env:E2E_INCLUDE_PAYMENT="true"`. E2E test creds in .env are now the BUYER account.
- Dev marketplace ID (from API logs): **indoorbikeparadise-dev** (needed for flex-cli in Phase 6).

## Phase 1 credentials checklist (Vesa)

From Sharetribe Console (Dev environment) and external services — have these ready:

1. Client ID + Client Secret — Console → Build → Advanced → Applications
2. Stripe **test** publishable key (`pk_test_...`) — the **secret** key (`sk_test_...`) goes into
   Console → Build → Integrations → Payments, not into this repo
3. Mapbox access token
