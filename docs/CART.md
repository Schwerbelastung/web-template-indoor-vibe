# Shopping cart — how it works & operator guide

## Overview

- The cart is **single-vendor** and lives in the buyer's profile `privateData.cart`
  (see `src/ducks/cart.duck.js`).
- Sellers don't get an "Add to cart" button on their **own** listings (and the Marketplace API
  would reject a self-purchase at checkout anyway).
- Checkout charges **one Stripe payment** for the whole cart. The **first cart item is the
  transacted listing** (normal `default-purchase` flow, including its stock reservation);
  every other item rides along as a custom line item `line-item/cart-item-<n>`.
- **Prices are never trusted from the browser.** The server re-fetches every cart listing and
  validates: same seller as the primary listing, purchase process, published, enough stock,
  matching currency (`server/api-util/cartOrder.js`). Line items and commissions are built in
  `server/api-util/lineItems.js`; **commissions apply to the whole payin**.
- Display names of the extra items are stored in the transaction's
  `protectedData.cartItems`, so order breakdowns and emails can show real titles
  (`LineItemCartItemsMaybe` in `src/components/OrderBreakdown/`).

## Stock handling (the part an operator should understand)

Sharetribe reserves stock automatically **only for the primary listing**. For the extra items:

1. Right after the payment succeeds, the buyer's browser calls `POST /api/cart-finalize`.
2. The server verifies the transaction is a paid purchase, then decrements each extra item's
   stock through the **Integration API** (`stockAdjustments.create` with a negative quantity)
   and marks the transaction metadata with `cartStockFinalized: true` (idempotent — repeated
   calls do nothing).
3. If an adjustment fails (e.g. another buyer took the last piece seconds earlier, or the
   browser died mid-call), the failure is recorded in the transaction metadata as
   `cartStockErrors: [listingIds]`.

### Operator reconciliation

Occasionally check (or check when a seller reports an oversold item):

- **Console → Manage → Transactions** → open the transaction → **Metadata**:
  - `cartStockFinalized` missing on a paid cart order → the finalize call never ran.
    Fix: adjust the listings' stock manually (Console → Listings → the listing → stock) by the
    quantities shown in the transaction's `protectedData.cartItems`.
  - `cartStockErrors: [...]` → those listings could not be decremented (usually a stock race).
    Decide with the seller: refund/cancel the order, or restock and fulfil.

## Cancellations (Phase 6 interplay)

Cancelling a cart order refunds the **whole payment** automatically
(`calculate-full-refund` reverses all line items). The primary listing's stock reservation is
released by the process, but the extra items must be restored via `POST /api/cart-restore-stock`
(idempotent, guarded by `cartStockRestored`). The Phase 6 cancellation flow calls it after a
customer cancel; operator cancels from Console need a manual restock (see reconciliation above).

## v1 limitations (documented decisions)

- **Delivery:** the whole order uses the **primary listing's** delivery setup. When a listing
  allows both pickup and shipping, cart checkout currently uses **pickup**; the primary item's
  shipping fee applies when shipping is the only option. Extra cart items never add their own
  shipping fees. (Future: a delivery selector on the cart page.)
- **Stock race window:** between payment and finalize there is a small window where a competing
  purchase can take the last piece — accepted tradeoff of the post-payment design (option a).
- Cart checkout never starts from an inquiry thread (`transition-privileged` is not cart-aware).

## Testing

- Unit tests: `server/api-util/cartOrder.test.js`, `server/api-util/lineItems.cart.test.js`,
  `server/api/cart-finalize.test.js` (run with `yarn run test-server`).
- Browser test with a real (test-mode) payment: tagged `@payment`, excluded from normal runs.
  Run on demand with the dev server running:

  ```powershell
  $env:E2E_INCLUDE_PAYMENT="true"; yarn run test:e2e cart-checkout
  ```

  Requires `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` in `.env` and at least two purchase
  listings with stock from the same seller. Uses Stripe test card `4242 4242 4242 4242`.
