const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdk } = require('../api-util/integrationSdk');

// Transitions after which restoring cart stock is legitimate: the payment has
// been refunded and the primary listing's own stock reservation was cancelled.
// transition/customer-cancel is added by the Phase 6 cancellation window.
const CANCEL_TRANSITIONS = [
  'transition/cancel',
  'transition/auto-cancel',
  'transition/cancel-from-disputed',
  'transition/auto-cancel-from-disputed',
  'transition/customer-cancel',
];

/**
 * POST /api/cart-restore-stock { transactionId }
 *
 * Counterpart of cart-finalize for cancelled cart orders: adds the extra cart
 * items' quantities back to their listings' stock. Runs only when the
 * transaction was cancelled after the stock had been decremented, and is
 * idempotent through transaction metadata.cartStockRestored.
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
      const isCancelled = transitions.some(t => CANCEL_TRANSITIONS.includes(t.transition));
      const cartItems = protectedData?.cartItems || [];

      if (!isPurchase || !isCancelled) {
        const error = new Error('Transaction is not a cancelled purchase.');
        error.status = 400;
        error.statusText = 'cart-restore-invalid-transaction';
        error.data = {};
        throw error;
      }

      if (cartItems.length === 0 || !metadata?.cartStockFinalized) {
        return { restored: false, reason: 'nothing-to-restore' };
      }

      if (metadata?.cartStockRestored) {
        return { restored: true, alreadyRestored: true };
      }

      const integrationSdk = getIntegrationSdk();

      const restoreOne = item =>
        integrationSdk.stockAdjustments
          .create({ listingId: item.listingId, quantity: item.quantity })
          .then(() => ({ listingId: item.listingId, ok: true }))
          .catch(e => {
            console.error(
              `cart-restore-stock: adjustment failed for listing ${item.listingId}:`,
              e.message
            );
            return { listingId: item.listingId, ok: false };
          });

      return Promise.all(cartItems.map(restoreOne)).then(results => {
        const failures = results.filter(r => !r.ok).map(r => r.listingId);
        const errorsMaybe = failures.length > 0 ? { cartRestoreErrors: failures } : {};

        return integrationSdk.transactions
          .updateMetadata({
            id: transactionId,
            metadata: {
              cartStockRestored: true,
              cartStockRestoredAt: new Date().toISOString(),
              ...errorsMaybe,
            },
          })
          .then(() => ({ restored: true, failures }));
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
