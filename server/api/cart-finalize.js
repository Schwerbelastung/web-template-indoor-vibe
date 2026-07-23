const { getSdk, handleError, serialize } = require('../api-util/sdk');
const { getIntegrationSdk } = require('../api-util/integrationSdk');

/**
 * POST /api/cart-finalize { transactionId }
 *
 * After a successful cart payment, decrement the stock of the extra cart
 * listings (the transaction itself only reserved stock for the primary
 * listing). Idempotent: transaction metadata.cartStockFinalized guards
 * against double runs. The caller must be a participant of the transaction
 * (we look the transaction up with the caller's own credentials).
 *
 * If an adjustment fails (e.g. a racing purchase took the last item), the
 * failure is recorded in metadata.cartStockErrors for operator reconciliation
 * — see docs/CART.md.
 */
module.exports = (req, res) => {
  const { transactionId } = req.body || {};
  if (!transactionId || typeof transactionId !== 'string') {
    res
      .status(400)
      .json({ error: 'transactionId is required' })
      .end();
    return;
  }

  const sdk = getSdk(req, res);

  return sdk.transactions
    .show({ id: transactionId })
    .then(response => {
      const tx = response.data.data;
      const { processName, transitions = [], protectedData, metadata } = tx.attributes;

      const isPurchase = processName === 'default-purchase';
      const isPaid = transitions.some(t => t.transition === 'transition/confirm-payment');
      const cartItems = protectedData?.cartItems || [];

      if (!isPurchase || !isPaid) {
        const error = new Error('Transaction is not a paid purchase.');
        error.status = 400;
        error.statusText = 'cart-finalize-invalid-transaction';
        error.data = {};
        throw error;
      }

      if (cartItems.length === 0) {
        return { finalized: false, reason: 'no-cart-items' };
      }

      if (metadata?.cartStockFinalized) {
        return { finalized: true, alreadyFinalized: true };
      }

      const integrationSdk = getIntegrationSdk();

      // Claim the idempotency flag BEFORE adjusting stock. Concurrent duplicate
      // requests that arrive after this write see cartStockFinalized and bail
      // (above), which prevents the double-decrement race. The narrow residual
      // window (two requests both reading no-flag before either claims) is
      // documented in docs/CART.md for operator reconciliation.
      return integrationSdk.transactions
        .updateMetadata({
          id: transactionId,
          metadata: {
            cartStockFinalized: true,
            cartStockFinalizedAt: new Date().toISOString(),
          },
        })
        .then(() => {
          const adjustOne = item =>
            integrationSdk.stockAdjustments
              .create({ listingId: item.listingId, quantity: -item.quantity })
              .then(() => ({ listingId: item.listingId, ok: true }))
              .catch(e => {
                console.error(
                  `cart-finalize: stock adjustment failed for listing ${item.listingId}:`,
                  e.message
                );
                return { listingId: item.listingId, ok: false };
              });

          return Promise.all(cartItems.map(adjustOne)).then(results => {
            const failures = results.filter(r => !r.ok).map(r => r.listingId);
            // Record which items failed so a later cancel-restore skips them (F4).
            const recordErrors =
              failures.length > 0
                ? integrationSdk.transactions.updateMetadata({
                    id: transactionId,
                    metadata: { cartStockErrors: failures },
                  })
                : Promise.resolve();
            return recordErrors.then(() => ({ finalized: true, failures }));
          });
        });
    })
    .then(result => {
      res
        .status(200)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(result))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
