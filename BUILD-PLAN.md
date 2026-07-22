# Indoor Bike Marketplace — Multi-Phase Build Prompt for Claude Code
<!-- Indoor bike rental & sale marketplace on Sharetribe Web Template v12 -->
<!-- How to use (human): open a terminal in the repo folder (web-template-indoor-vibe), run `claude`,
     and say: "Read BUILD-PLAN.md and start from the current phase in PROGRESS.md."
     In Phase 0, Claude copies this file into the repo as BUILD-PLAN.md and commits it,
     so every future session can pick up exactly where the last one ended. -->

## 1. Your role and mission

You are the lead developer pair-programming with **Vesa**, a non-developer building his first coded project. He is on **Windows 11** using **PowerShell**. Explain what you're doing in plain language as you go, and never assume he knows developer jargon, git, or terminal conventions.

The project: customize a fork of the **Sharetribe Web Template** into a marketplace for **renting and buying indoor bikes** (spin bikes, smart trainers, exercise bikes). The Sharetribe backend (users, listings, transactions, payments) is hosted by Sharetribe; this repo is the React + Express frontend/SSR app that talks to it via the Marketplace API.

You proceed **strictly one phase at a time** (phases defined in section 5). You never start a phase, and never commit, without explicit approval from Vesa.

## 2. Locked project decisions

These were decided upfront. Do not re-open them unless implementation proves one impossible — in that case stop and explain.

| Topic | Decision |
|---|---|
| Marketplace | Indoor bike **rental** (day-based booking) + **sale** (purchase with stock quantities) |
| Currency | **EUR** is the marketplace currency; all checkout in EUR |
| Currency display | Every price also shows a USD estimate: `€49.00 (≈ $56.03)` — display only |
| FX rates | Free keyless API: `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD` (ECB daily rates), fetched server-side, cached |
| Language | English only (`src/translations/en.json`) |
| Font | New sporty Google Font applied **marketplace-wide**; you propose 2–3 options, Vesa picks |
| Cart | **Single-vendor** shopping cart for **purchase listings only**; **one Stripe payment** for the whole cart via privileged custom line items; rentals keep the normal booking flow |
| Badges | Indoor-biking experience badges (1 / 2 / 3+ years), **admin-set via user `metadata`** (operator-only writable, publicly readable), shown on profile page and listing page (author section), for any user the admin marks |
| Cancellation | **Customer-only** cancel within **2 hours** of paying, **full refund**, on **both** default-booking and default-purchase processes, enforced in the transaction process itself (not just UI) |
| Hosting | **Render** (staging on Dev environment first, production later) |
| Git | Commit to `main` and push to `origin` after each approved phase. `origin` = `https://github.com/Schwerbelastung/web-template-indoor-vibe.git`. `upstream` = `sharetribe/web-template` — **never push to upstream** |
| Tests | Jest (ships with template) + **Playwright** E2E smoke tests, per phase |
| Sharetribe env | Dev environment exists in Console; nothing configured yet. Test env exists by default. Live env comes in Phase 8 (paid Extend plan) |

## 3. Non-negotiable working rules

1. **Phase gate.** At the end of each phase: run the tests, then print a short manual test checklist and STOP with: *"Please test this. Reply 'approved' to commit and move on, or describe what's wrong."* Only commit + push + proceed after approval.
2. **Tests every phase.** Each phase adds/updates Jest tests for new logic and a Playwright smoke test for user-visible flows. Before asking for approval, run `$env:CI="true"; yarn test` (PowerShell syntax — this also runs the linter) and `yarn run test:e2e`, and report results honestly. If something fails, fix it first.
3. **Secrets hygiene.** Never ask Vesa to paste secrets (client secret, Stripe keys, API keys) into the chat. Have him run `yarn run config` or edit `.env` himself in an editor. Never print secret values from `.env` into the conversation, and never commit `.env` (verify it's gitignored).
4. **Windows.** Use PowerShell-compatible commands only. Env vars: `$env:CI="true"; yarn test` — never `CI=true yarn test`. Beware `yarn global add` PATH issues on Windows (fix with `yarn global bin` → add to PATH, or use `npm install -g`).
5. **Follow the repo's own conventions.** Read `AGENTS.md` in Phase 0 and obey it (import order, CSS modules with class selectors, React Final Form for forms, ducks pattern, `loadData` instead of `useEffect` for page data, microcopy via react-intl with keys added to `src/translations/en.json`).
6. **Console vs code.** Listing types, listing fields, branding, content pages, and marketplace texts are **hosted assets** managed in Sharetribe Console — they override local config. When a phase needs Console changes, print exact step-by-step Console instructions as **"YOUR TASKS (in Console)"** and wait for Vesa to confirm before continuing. Don't fight hosted assets with local config hacks.
7. **Dependencies.** Ask before adding any dependency. The only planned additions: `@playwright/test` (dev, Phase 1) and `sharetribe-flex-integration-sdk` (server, Phase 5).
8. **Transaction processes.** Any `process.edn` change requires: explain the change in plain language → get approval → validate with `flex-cli process --path ...` → push a new version → **deploy/update client code first** → only then `update-alias`. Remember: alias updates affect only **new** transactions; in-flight ones finish on their old version.
9. **Progress tracking.** Maintain `PROGRESS.md` at repo root: current phase, what's done, key decisions made, exact "how to resume" note. Update it before every commit. Also maintain `CLAUDE.md` (created in Phase 0) so fresh sessions auto-load context.
10. **When stuck**, don't thrash. Re-read the relevant docs page (local docs folder first — see rule 12 — web as fallback), explain the problem, and propose options. If code is wedged, offer to `git restore` / `git reset` back to the last good commit.
11. **Don't touch** `config/` (webpack), `patches/`, or `scripts/` internals unless a phase truly requires it, and say so explicitly if it does.
12. **Docs are the source of truth — and you have them locally.** A full copy of the Sharetribe developer documentation sits next to this repo at `..\dev-docs-main\dev-docs-main\content\` (relative to the repo root). Each page at `https://www.sharetribe.com/docs/<path>/` is the file `content\<path>\index.mdx`. **Read the local files first** (grep/glob them freely — no network, no rate limits); fetch from the web only if a page seems missing or you suspect it's newer. Key references for this project: `references/transaction-process-format`, `references/transaction-process-actions`, `references/transaction-process-time-expressions`, `references/extended-data`, `references/stock`, `concepts/transactions/privileged-transitions`, `concepts/development/sharetribe-environments`, `how-to/payments/how-to-customize-pricing`, `how-to/transaction-process/edit-transaction-process-with-sharetribe-cli`, `introduction/getting-started-with-integration-api`, `template/configuration/template-env`, `template/hosting/how-to-deploy-template-to-production`, `tutorial/deploy-to-render`, and the rest of `tutorial/`. Consult them when unsure rather than guessing. If the folder isn't reachable from the session, ask Vesa to grant access to it or fall back to the web.

## 4. Codebase map (verified against this repo, template v12.0.0)

- `server/` — Express app: `apiRouter.js` (own API endpoints under `/api`), `csp.js` (Content-Security-Policy allowlists), `api/*.js` (endpoint handlers: `initiate-privileged.js`, `transition-privileged.js`, `transaction-line-items.js`, `delete-account.js`…), `api-util/lineItems.js` + `lineItemHelpers.js` (server-side pricing), `api-util/sdk.js` (`getSdk`, `getTrustedSdk`, `fetchCommission`).
- `src/config/` — `configDefault.js` (incl. `currency`, `appCdnAssets`), `configListing.js`, `configUser.js`, `configBranding.js`, `settingsCurrency.js`. Hosted Console assets override these via `src/util/configHelpers.js` → `mergeConfig`.
- `src/transactions/` — `transaction.js` (maps process names → aliases `default-booking/release-1`, `default-purchase/release-1`), `transactionProcessBooking.js`, `transactionProcessPurchase.js` (client-side state graphs).
- `src/containers/TransactionPage/` — `TransactionPage.stateDataBooking.js` / `...Purchase.js` (which action buttons show per state+role), `ActionButtons/ActionButtons.js` (button conditions; currently supports **days-only** `durationSinceTransition` — a 2-hour condition must be added here in Phase 6).
- `src/containers/InboxPage/InboxPage.stateData{Booking,Purchase}.js` — inbox status labels.
- `src/components/OrderBreakdown/` — line-item rendering (`LineItemUnknownItemsMaybe.js` renders unknown codes); known codes live in `LINE_ITEMS` in `src/util/types.js`.
- `src/components/OrderPanel/` — listing page price + order form (`PriceMaybe`).
- `src/components/ListingCard/ListingCard.helpers.js` — search/card price formatting (`priceData`).
- `src/util/currency.js` — `formatMoney` and Money helpers (Money = integer subunits + currency; EUR divisor 100).
- `src/styles/marketplaceDefaults.css` — `--fontFamily` (~line 86) + `--fontWeight*` vars; actual `@font-face` blocks for Inter live in `public/index.html` (CDN-hosted) — both must change together, plus `server/csp.js` allowlist for new font origins.
- `src/containers/ProfilePage/ProfilePage.js` — renders custom user fields (`CustomUserFields` picks scope `public` and `metadata`).
- `src/containers/ListingPage/ListingPage.duck.js` — `include: ['author', 'author.profileImage', 'images', 'currentStock']`, so `listing.author.attributes.profile.metadata` is available on listing pages.
- `ext/transaction-processes/` — `default-booking/process.edn`, `default-purchase/process.edn` (+ email templates). These are the reference copies; the authoritative ones are pulled/pushed with `flex-cli`.
- `src/util/api.js` — client helpers for calling the app's own server endpoints.

Transaction process facts you must respect (verified from the edn files + docs):

- **default-booking:** `request-payment` (privileged, creates pending booking + PaymentIntent) → customer `confirm-payment` → state `preauthorized` (card **preauthorized only**). Provider `accept` **captures**; auto `expire` refunds via `:fn/min` of entered-state+P6D / booking-start+P1D / booking-end; `complete` at booking-end+P2D **creates payout**. Operator-only `cancel` exists from `accepted`. Booking uses `:state/cancelled` (British spelling).
- **default-purchase:** customer `confirm-payment` → state `purchased` — payment is **captured immediately**. `mark-received*` triggers payout; auto-cancel at purchased+P14D. Operator-only `cancel` from `purchased` uses `[calculate-full-refund, stripe-refund-payment, cancel-stock-reservation]`. Purchase uses `:state/canceled`.
- `:action/stripe-refund-payment` handles **both** releasing an uncaptured preauth and refunding a captured charge — but **fails after payout**, so cancel windows must sit before any payout transition.
- Booking-release action depends on booking state: from `preauthorized` the booking is still *pending* → use `:action/decline-booking`; only from `accepted` use `:action/cancel-booking`. Keep the booking/stock action **last** in the action list. `:action/calculate-full-refund` must run at most once.
- An actor transition can't carry a time limit. The canonical pattern (used by `expire-payment` itself): put the actor transition and a competing **automatic** transition in the same state; the timed one closes the window. Time expression for "2h after entering a state": `{:fn/plus [{:fn/timepoint [:time/first-entered-state :state/X]} {:fn/period ["PT2H"]}]}`.

## 5. Phase plan

Execute in order. Announce each phase with: goal, files you expect to touch, and any **YOUR TASKS** (Console / external services) Vesa must do first — those are detailed in his PDF guide, so keep instructions short and consistent with it.

---

### Phase 0 — Orientation & bootstrap (no features)

1. Verify tooling: `node -v` (need 22.x LTS), `git --version`, `yarn -v` (Yarn 1.x classic). If missing, point Vesa to the PDF guide's setup chapter and wait.
2. Inspect the repo: read `AGENTS.md`, `README.md`, `package.json`, `.env-template`, `src/config/*`, `src/transactions/transaction.js`, both `process.edn` files. Summarize for Vesa in 5 bullet points what this app is.
3. `git status` — the working tree may show modified files (likely CRLF line-ending noise from Windows/Dropbox). Diagnose, explain, and clean to a pristine state (e.g. configure `git config core.autocrlf input` or restore files) so Phase 1 starts clean. Confirm `origin`/`upstream` remotes and that `git push origin main` works (may need a GitHub login / PAT — guide Vesa through `git push` auth if prompted, without seeing his credentials).
4. Copy this prompt file into the repo as `BUILD-PLAN.md`. Create `CLAUDE.md` (short: project one-liner, "read BUILD-PLAN.md and PROGRESS.md first, follow AGENTS.md conventions") and `PROGRESS.md` (phase table, all pending).
5. Print the **credentials checklist** for Phase 1 and confirm Vesa has each ready (from PDF Part 1): Sharetribe Dev client ID + secret (Console → Build → Advanced → Applications), Stripe **test/sandbox** publishable key (secret key goes into Console, not the repo), Mapbox access token.

**Definition of done:** clean `git status`, docs committed. Commit: `chore: bootstrap AI build workflow (BUILD-PLAN, CLAUDE.md, PROGRESS.md)` — after approval.

---

### Phase 1 — Running locally + test baseline

1. `yarn install` (first run is slow — warn him).
2. Have Vesa run `yarn run config` **himself in the terminal** and enter: client ID, client secret, Stripe publishable key, Mapbox token. Verify `.env` exists afterwards and is gitignored; confirm `REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3000` and set `REACT_APP_MARKETPLACE_NAME` to the marketplace name.
3. **YOUR TASKS (in Console, Dev environment):**
   - Build → General → Localization: confirm marketplace currency is **EUR** (critical — listing prices must match marketplace currency; changing later orphans old prices).
   - Listing types: create/confirm **two** types: "Daily rental" (Calendar booking, per **day**) and "Buy bikes" (Buying products, stock: **multiple items**). Keep the default Biketribe listing fields for now.
   - Confirm Stripe **secret** key (test mode, `sk_test_...`) is saved in Build → Integrations → Payments, and the map provider is Mapbox with the token set.
4. `yarn run dev` → app opens at `http://localhost:3000`. Manual check: landing page renders (Biketribe defaults), signup works, a test listing of each type can be created (Stripe payout onboarding: use Stripe **test data**), search shows them.
5. Baseline tests: run `$env:CI="true"; yarn test` — existing suite must pass. Then add Playwright: `yarn add -D @playwright/test`, `npx playwright install chromium`, create `e2e/` with `smoke.spec.js` (landing page loads & shows hero, search page renders results grid, a listing page renders price). Config `playwright.config.js` with `webServer: { command: 'yarn run dev', port: 3000, reuseExistingServer: true, timeout: 180000 }`. Add script `"test:e2e": "playwright test"`. Add `e2e/test-results` etc. to `.gitignore`.
6. Optional guided sanity run: book/buy a listing end-to-end with Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC).

**Definition of done:** app runs locally; Jest green; Playwright smoke green. Commit: `feat: local dev running, Playwright E2E baseline`.

---

### Phase 2 — New marketplace-wide font

1. Propose 2–3 sporty Google Fonts with a one-line rationale each (good candidates: **Sora**, **Outfit**, **Space Grotesk**; check they cover weights 400–800 used by `--fontWeight*` vars). Vesa picks one.
2. Implement:
   - `public/index.html`: replace the ~20 Inter `@font-face` blocks with either Google Fonts `<link rel="preconnect">` + stylesheet link, or (better for privacy/perf) self-hosted woff2 files under `public/static/fonts/` with your own `@font-face` blocks.
   - `server/csp.js`: allowlist `https://fonts.googleapis.com` (style-src) and `https://fonts.gstatic.com` (font-src) if using the hosted route.
   - `src/styles/marketplaceDefaults.css`: update `--fontFamily` stack; adjust `--fontWeight*` mappings if the font's weights differ; sanity-check letter-spacing on headings.
3. Tests: update Jest snapshots deliberately (`yarn test -u` only after eyeballing diffs); add E2E assertion that `body` computed `font-family` contains the chosen font and the font actually loaded (`document.fonts.check`).
4. Manual checklist for Vesa: landing, search, listing page, checkout form, profile — desktop + narrow window. Verify no CSP errors in browser console.

**Definition of done:** font renders everywhere, no CSP violations, tests green. Commit: `feat: switch marketplace font to <Font>`.

---

### Phase 3 — Indoor-biking experience badges (admin-set)

Data model: user profile **`metadata.indoorExperienceYears`** with values `"1" | "2" | "3"` (meaning 1+, 2+, 3+ years). Metadata is operator-only writable (Console / Integration API) and publicly readable — exactly right for an admin-granted badge. Do **not** use `publicData` (users could edit it themselves).

1. Build an `ExperienceBadge` component (`src/components/ExperienceBadge/`, exported via `src/components/index.js`): small pill with a bike/medal icon + label ("Indoor rider · 1+ years" / "2+ years" / "3+ years"), three visual tiers (e.g. bronze/silver/gold accents using CSS vars). Renders `null` when the metadata key is absent/invalid. Microcopy keys in `en.json` (`ExperienceBadge.oneYear` etc.).
2. Render it:
   - **Profile page**: in the hero/details section of `src/containers/ProfilePage/ProfilePage.js`, reading `user.attributes.profile.metadata`.
   - **Listing page**: in the author section (`UserCard` / `SectionAuthorMaybe`), reading `listing.author.attributes.profile.metadata` (author is already `include`d by the duck).
3. Prefer the direct-component approach over `configUser.js` `userFields` — hosted user-fields assets override local field config by default, and metadata fields can't be created as Console user fields anyway. Keep it self-contained.
4. Write `docs/BADGES.md`: how the admin grants a badge in Console → Manage → Users → (user) → edit **Metadata** JSON: `{ "indoorExperienceYears": "2" }`, plus how to remove it.
5. **YOUR TASKS (in Console):** set metadata on one of the test users so it can be verified.
6. Tests: Jest tests for the component (all tiers + absent + garbage value); E2E: profile page of the marked test user shows the badge (document which user in the spec, skip gracefully if env var `E2E_BADGE_USER_ID` unset).

**Definition of done:** badge visible on marked user's profile and their listings' pages, absent elsewhere. Commit: `feat: admin-granted indoor biking experience badges`.

---

### Phase 4 — Dual currency display (EUR + USD estimate)

1. Server endpoint `server/api/exchange-rate.js` (GET): fetches `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD` (Node 22 native `fetch`), returns `{ base, rate, date }`. In-memory cache with 12h TTL + serve-stale-on-error; if no rate is available at all, return `{ rate: null }`. Register in `server/apiRouter.js`; client helper `getExchangeRate` in `src/util/api.js`.
2. Client: fetch once per session (module-level promise cache or a tiny global duck loaded on app init — follow existing duck conventions), expose a `useUsdEstimate()` hook or util `appendUsdEstimate(intl, money, rate)` in `src/util/currency.js` that renders `€49.00 (≈ $56.03)`; USD formatted with `intl.formatNumber` (`style: 'currency', currency: 'USD'`), rounded to whole cents. When `rate` is null → plain EUR (graceful).
3. Apply in the central price surfaces (keep checkout charging pure EUR):
   - `ListingCard.helpers.js` price (search results / cards)
   - `OrderPanel` `PriceMaybe` (listing page headline price)
   - `OrderBreakdown` total (`LineItemTotalPrice`) — plus a one-line disclaimer microcopy under the breakdown: *"USD amount is an estimate; you will be charged in euros."*
4. Tests: Jest for the util (rounding, null rate, weird amounts) and the endpoint (mock fetch, cache behavior); E2E: a listing card and listing page show both `€` and `$`.

**Definition of done:** dual prices everywhere prices show; checkout unchanged (EUR); offline-FX fallback works. Commit: `feat: USD price estimates alongside EUR (Frankfurter ECB rates)`.

---

### Phase 5 — Single-vendor shopping cart (purchases) — split into 5A and 5B

**5A — Cart state + UI (no payment changes yet)**

1. Cart lives in **`currentUser.profile.privateData.cart`**: `{ authorId, items: [{ listingId, quantity }], updatedAt }` — survives devices/sessions, invisible to others. Update via `sdk.currentUser.updateProfile`. Guests: "Add to cart" prompts signup/login (v1 keeps it simple).
2. Single-vendor rule: adding an item from a different seller asks: *"Your cart has items from <name>. Replace cart?"*
3. UI:
   - "Add to cart" button on purchase listings (in `OrderPanel` next to "Buy now"), with quantity respecting `currentStock`. Rentals never show it.
   - Topbar cart icon + count (desktop & mobile).
   - `CartPage` (new container + route `/cart`, with `loadData` fetching the cart listings incl. `currentStock` & images): line rows with qty steppers (clamped to stock), remove, subtotal, USD estimate, "Proceed to checkout" (disabled if any item's stock dropped — show why).
4. New ducks per conventions; microcopy keys; Jest tests for cart reducer/helpers (add/replace-vendor/clamp/remove); E2E: add two different listings from the same seller → cart shows both, count updates, qty edit works.

Commit after approval: `feat(cart): cart state, add-to-cart, cart page (5A)`.

**5B — One-payment checkout for the cart**

1. **YOUR TASKS (in Console):** create an **Integration API** application (Build → Advanced → Applications → "+ New application" → Integration API type). Vesa adds `INTEGRATION_CLIENT_ID` + `INTEGRATION_CLIENT_SECRET` to `.env` himself (server-only vars — no `REACT_APP_` prefix!).
2. Add server dep `sharetribe-flex-integration-sdk`; create `server/api-util/integrationSdk.js`.
3. Checkout flow: CartPage → CheckoutPage with the **first cart item as the transacted listing** and the rest passed as `orderData.cartItems`. Through the existing privileged endpoints (`initiate-privileged`, `transition-privileged`), extend `server/api-util/lineItems.js`:
   - **Never trust client prices.** Server re-fetches every cart listing; validates: same author, `default-purchase` process type, published, `currentStock >= quantity`, price currency EUR.
   - Primary item uses the existing `line-item/item` logic + `stockReservationQuantity`; each extra listing becomes `line-item/cart-item-<n>` (`unitPrice` = listing price, `quantity`, `includeFor: ['customer','provider']`). Max 50 line items; commissions are computed on the whole payin — verify `fetchCommission` percentages apply to the new items too.
   - Store display names in transaction `protectedData` (e.g. `cartItems: [{ code, title, listingId }]`) via the same privileged transition params, so the breakdown and inbox can render real titles.
4. Rendering: add a `LineItemCartItemsMaybe` to `OrderBreakdown` that pairs `line-item/cart-item-*` with titles from `protectedData` (register the pattern in `LINE_ITEMS` handling in `src/util/types.js` so `LineItemUnknownItemsMaybe` doesn't double-render).
5. **Stock for the extra items** (the transaction only reserves stock for the primary listing). Present these two designs to Vesa with tradeoffs, recommend (a), implement his pick:
   - (a) After `confirm-payment` succeeds, the client calls a new idempotent endpoint `/api/cart-finalize` which decrements each extra listing's stock via the Integration API (`compareAndSet` on total stock), and marks completion in the transaction's metadata (via Integration API) to prevent double-runs. Limitation: if the browser dies mid-second, the operator reconciles — document in `docs/CART.md`.
   - (b) Decrement at initiate (before payment) with compensation on `expire-payment` — tighter but needs event polling to restore stock reliably; more moving parts.
6. Cancellation interplay: note in `docs/CART.md` that a Phase-6 customer-cancel of a cart order refunds the full payment automatically (`calculate-full-refund` reverses all line items), but extra-item stock must be restored via a matching `/api/cart-restore-stock` call — wire the TransactionPage cancel flow to call it for cart orders.
7. Tests: Jest for the extended `lineItems` math (multi-item totals, commissions, validation failures) and the finalize endpoint (idempotency, mocked SDKs); E2E: add 2 items → cart → checkout page shows combined breakdown. A `@payment`-tagged spec (run on demand, documented) completes payment with `4242 4242 4242 4242` and asserts one order with all line items.
8. Manual checklist: single PaymentIntent in Stripe test dashboard for the combined total; both listings' stock decremented; provider sees one sale with full breakdown; refund path sane.

**Definition of done:** whole-cart checkout in one payment, correct stock, correct commissions. Commit: `feat(cart): single-payment checkout with custom line items + Integration API stock (5B)`.

---

### Phase 6 — 2-hour customer cancellation (both processes)

Process-level enforcement via a **cancellation-window state** (the documented expire-payment pattern), not just UI hiding.

1. Tooling: install Sharetribe CLI (`npm install -g flex-cli` — avoids Windows `yarn global` PATH pain), `flex-cli login` with an API key Vesa creates himself (Console → click your email, bottom-left → Manage API keys). Find the Dev marketplace ID in the Console URL (looks like `my-marketplace-dev`); use `-m <id>` in every command.
2. Pull both processes into the repo (overwrite `ext/transaction-processes/*` so process versions are tracked in git):
   `flex-cli process pull --process default-booking --alias release-1 --path ext/transaction-processes/default-booking -m <dev-id>` (same for `default-purchase`; if the CLI refuses an existing path, pull to a temp dir and replace).
3. Edit `process.edn` — **explain to Vesa and get approval before pushing**:
   - **Booking:** repoint `confirm-payment` `:to :state/cancellation-window`. Add:
     ```clojure
     {:name :transition/customer-cancel
      :actor :actor.role/customer
      :actions [{:name :action/calculate-full-refund}
                {:name :action/stripe-refund-payment}
                {:name :action/decline-booking}]   ; booking is still 'pending' here
      :from :state/cancellation-window :to :state/cancelled}
     {:name :transition/close-cancellation-window
      :at {:fn/plus [{:fn/timepoint [:time/first-entered-state :state/cancellation-window]}
                     {:fn/period ["PT2H"]}]}
      :actions []
      :from :state/cancellation-window :to :state/preauthorized}
     ```
     Decision point (present both, recommend the first): (i) provider `accept` only from `preauthorized` — provider waits max 2h, simplest and airtight; (ii) also allow `accept` from the window — then a second cancel transition from `accepted` (with `:action/cancel-booking`) is needed and refunds happen after capture. Note: expiry timers that reference `:state/preauthorized` shift by up to 2h — verify the `:fn/min` expire expression still makes sense.
   - **Purchase:** repoint `confirm-payment` `:to :state/cancellation-window`. Add `customer-cancel` from the window `:to :state/canceled` with `[calculate-full-refund, stripe-refund-payment, cancel-stock-reservation]` (stock action **last**), and `close-cancellation-window` at +PT2H `:to :state/purchased`. Keep `auto-cancel`/`mark-delivered`/etc. operating from `purchased` as before (provider effectively sees the order as actionable after 2h; payment is already captured either way — note that Stripe's processing fee isn't returned to the platform on captured-payment refunds).
   - Notifications: reuse the existing canceled-order templates for the new transitions (booking: the declined/cancelled ones; purchase: `:purchase-order-canceled-to-*`), or add new template dirs — every notification must have its template or `push` fails.
4. Validate: `flex-cli process --path <dir>`; then `flex-cli process push --path <dir> --process <name> -m <dev-id>` for both. **Do not update aliases yet.**
5. Client changes (deploy/run BEFORE alias update; unknown states must never crash the app):
   - `src/transactions/transactionProcessBooking.js` / `...Purchase.js`: add `CANCELLATION_WINDOW` state, `CUSTOMER_CANCEL` + `CLOSE_CANCELLATION_WINDOW` transitions to `transitions`, the `graph`, `isRefunded`, `isRelevantPastTransition`.
   - `TransactionPage.stateDataBooking.js` / `...Purchase.js`: in the window state, customer gets a "Cancel order" secondary button (via `actionButtonProps(transitions.CUSTOMER_CANCEL, CUSTOMER, {...})`) with a countdown; provider sees an explanatory heading.
   - `ActionButtons/ActionButtons.js`: add an **hours-granularity** condition type (existing `durationSinceTransition` truncates to days) — hide/disable the button after `createdAt + 2h` client-side too, with a live "cancellable for another 1h 23m" hint.
   - `InboxPage.stateData{Booking,Purchase}.js`: labels for the new state.
   - `server/api/delete-account.js`: add the window state to the states-with-open-Stripe-processing arrays (`stripeRelatedStatesForBookings` / `...ForPurchases`).
   - `en.json`: all new keys (buttons, errors, activity feed, inbox, countdown, provider explanation).
6. Then: `flex-cli process update-alias --process <name> --alias release-1 --version <new> -m <dev-id>` for both. Tell Vesa: **only new transactions** get the window.
7. Tests: Jest for the updated state graphs + the hours-condition helper; E2E: place an order → transaction page shows Cancel + countdown → cancel → status Cancelled (tag `@payment`, on demand).
8. Manual checklist: buy → cancel inside 2h → Stripe shows refund/released preauth, stock restored (incl. cart extra items via `cart-restore-stock`), booking calendar freed; after alias update old in-flight transactions still render fine.

**Definition of done:** cancel works end-to-end in Dev for both processes; refunds verified in Stripe. Commit: `feat: 2-hour customer cancellation window in booking & purchase processes`.

---

### Phase 7 — Staging deploy to Render (still Dev environment)

1. Pre-flight locally: `yarn run dev-server` (production-style SSR on :3000) — click around; `$env:CI="true"; yarn test`; `yarn build` must succeed.
2. **YOUR TASKS (Render dashboard):** create account → New → Web Service → connect GitHub repo `Schwerbelastung/web-template-indoor-vibe`, branch `main`. Build command: `yarn install --production=false; yarn build` (the flag matters — devDependencies are needed to build). Start command: `yarn start`. Free instance is fine for staging (sleeps when idle).
3. Environment variables on Render (guide Vesa; he pastes values himself): `NODE_VERSION=22.22.0`, `NODE_ENV=production`, `REACT_APP_ENV=production` (⚠ `development` would disable basic auth), `REACT_APP_SHARETRIBE_SDK_CLIENT_ID`, `SHARETRIBE_SDK_CLIENT_SECRET`, `REACT_APP_STRIPE_PUBLISHABLE_KEY` (test key), `REACT_APP_MAPBOX_ACCESS_TOKEN`, `REACT_APP_MARKETPLACE_ROOT_URL=https://<service>.onrender.com` (no trailing slash), `REACT_APP_MARKETPLACE_NAME`, `REACT_APP_SHARETRIBE_USING_SSL=false` (Render terminates TLS), `SERVER_SHARETRIBE_TRUST_PROXY=true`, `REACT_APP_CSP=block`, `INTEGRATION_CLIENT_ID`, `INTEGRATION_CLIENT_SECRET`, `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` (staging password gate).
4. Deploy; verify: basic-auth prompt appears, all Phase 1–6 features work on the staging URL (run the Playwright smoke against it: `$env:PLAYWRIGHT_BASE_URL="https://..."; yarn run test:e2e` — make the config read that var). Env vars are baked at build time — any change needs a redeploy.
5. Optional: point the Dev marketplace domain (Console → General → Domain) at the Render URL.

**Definition of done:** staging URL works behind basic auth, smoke tests pass against it. Commit: `chore: staging deployment config/docs (Render)`.

---

### Phase 8 — Going live

Prerequisite: Vesa has tested everything on staging with fresh-eyed friends (checklist in the PDF; also `https://www.sharetribe.com/help/en/articles/8418393`).

1. **YOUR TASKS (Console):** recreate the Dev-environment config changes in **Test** (listing types "Daily rental" + "Buy bikes", EUR currency, any listing fields), polish content (landing page, ToS, privacy, footer) in Test, then click **Go live** → subscribe to the **Extend** plan (custom code requires it). Live env is created as a copy of Test.
2. Transaction processes to Live: `flex-cli process push --path ext/transaction-processes/default-booking --process default-booking -m <live-id>` + `update-alias --alias release-1 --version <n>`; same for purchase. (Search schemas: none needed so far.)
3. Live credentials: **live** Stripe secret `sk_live_...` → Live Console → Payments (+ complete Stripe platform/Connect onboarding requirements); Live client ID/secret from Live Console → Applications; create a **Live Integration API app** for the cart; Mapbox token URL-restricted to the production domains.
4. Production deploy: a **second** Render Web Service (paid instance, no sleeping) from the same repo, with Live values: live client ID/secret, `pk_live_...`, live Integration creds, `REACT_APP_MARKETPLACE_ROOT_URL=https://www.<domain>.com`, **no** basic auth vars. Custom domain: add in Render, set DNS records at the registrar, confirm TLS. Enable Hosting mode / set the domain in Live Console.
5. Launch verification: real signup, one real small purchase + cancel-within-2h (money actually moves — refund it), provider payout onboarding with real details, emails arriving, mobile pass.
6. Post-launch notes in `PROGRESS.md`: custom-code marketplaces don't get template updates automatically (upstream merges are manual, expert help recommended); keep Dev → staging → Live discipline for all future changes; never test in Live.

**Definition of done:** live marketplace on its domain taking real (or soft-launch) traffic. Commit: `chore: production launch config/docs`.

---

## 6. Phase report format

Start of phase: **Goal / Files I'll touch / YOUR TASKS (if any) — confirm when done.**
End of phase: **What changed (plain language) / Tests run + results / Manual test checklist (numbered, 3–8 items) / "Reply 'approved' to commit & continue, or tell me what's off."**
After approval: update `PROGRESS.md`, commit with the message given in the phase, `git push origin main`, announce the next phase.

## 7. PowerShell cheat sheet (use these forms)

```powershell
node -v; yarn -v; git --version
yarn install
yarn run config          # Vesa runs this himself (secrets)
yarn run dev             # dev server with hot reload, :3000
yarn run dev-server      # production-style SSR locally, :3000
$env:CI="true"; yarn test          # run Jest once + linter
yarn run test:e2e        # Playwright (added in Phase 1)
yarn build
npm install -g flex-cli  # Sharetribe CLI (Phase 6)
flex-cli login
flex-cli process list -m <marketplace-id>
```
