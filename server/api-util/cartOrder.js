// The whole transaction may have at most 50 line items. Besides the extra cart
// items, a purchase can emit: 1 base item + up to 1 shipping fee + up to 2
// commission lines (provider + customer). Cap extras at 46 to stay under 50.
const MAX_CART_LINE_ITEMS = 46;

const badRequest = message => {
  const error = new Error(message);
  error.status = 400;
  error.statusText = message;
  error.data = {};
  return error;
};

/**
 * Basic shape check for orderData.cartItems coming from the client:
 * [{ listingId: string, quantity: int > 0 }] with unique ids.
 */
const validateCartItemsShape = (cartItems, primaryListingId) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw badRequest('Error: cartItems must be a non-empty array.');
  }
  if (cartItems.length > MAX_CART_LINE_ITEMS) {
    throw badRequest(`Error: a cart can have at most ${MAX_CART_LINE_ITEMS} extra items.`);
  }
  const ids = cartItems.map(i => i?.listingId);
  if (ids.some(id => typeof id !== 'string' || id.length === 0)) {
    throw badRequest('Error: every cart item needs a listingId.');
  }
  if (new Set(ids).size !== ids.length) {
    throw badRequest('Error: cart items contain duplicate listings.');
  }
  if (ids.includes(primaryListingId)) {
    throw badRequest('Error: the primary listing must not be repeated in cartItems.');
  }
  if (
    cartItems.some(i => {
      const q = i?.quantity;
      return !Number.isInteger(q) || q < 1 || q > 100;
    })
  ) {
    throw badRequest('Error: every cart item needs an integer quantity between 1 and 100.');
  }
};

/**
 * Fetch and validate the extra cart listings against the primary listing.
 * Never trusts client prices: every listing is re-fetched and its current
 * price, author, process and stock are checked server-side.
 *
 * @param {Object} sdk Marketplace API SDK (from the request context)
 * @param {Object} primaryListing the transacted listing (already fetched)
 * @param {Array} cartItems [{ listingId, quantity }] from orderData
 * @returns {Promise<Array>} enriched items:
 *   [{ listingId, title, quantity, unitPriceAmount, currency }]
 */
exports.fetchAndValidateCartItems = (sdk, primaryListing, cartItems) => {
  const primaryListingId = primaryListing?.id?.uuid;
  const primaryAuthorId = primaryListing?.relationships?.author?.data?.id?.uuid;
  const primaryCurrency = primaryListing?.attributes?.price?.currency;

  return Promise.resolve()
    .then(() => {
      validateCartItemsShape(cartItems, primaryListingId);
      // Defense-in-depth: the marketplace charges in EUR only. Refuse to build a
      // cart order in any other currency, even if a listing slipped through.
      if (primaryCurrency !== 'EUR') {
        throw badRequest(`Error: cart checkout supports EUR only (got ${primaryCurrency}).`);
      }
      return sdk.listings.query({
        ids: cartItems.map(i => i.listingId),
        include: ['author', 'currentStock'],
      });
    })
    .then(response => {
      const listings = response.data.data;
      const included = response.data.included || [];
      const stockById = new Map(
        included.filter(i => i.type === 'stock').map(i => [i.id.uuid, i.attributes.quantity])
      );

      return cartItems.map(item => {
        const listing = listings.find(l => l.id.uuid === item.listingId);
        if (!listing) {
          throw badRequest(
            `Error: cart listing ${item.listingId} is not available (closed, deleted or unpublished).`
          );
        }

        const title = listing.attributes.title;
        const authorId = listing.relationships?.author?.data?.id?.uuid;
        if (!primaryAuthorId || authorId !== primaryAuthorId) {
          throw badRequest(`Error: cart listing "${title}" belongs to a different seller.`);
        }

        const { unitType, transactionProcessAlias } = listing.attributes.publicData || {};
        const isPurchase =
          unitType === 'item' && `${transactionProcessAlias}`.startsWith('default-purchase');
        if (!isPurchase) {
          throw badRequest(`Error: cart listing "${title}" is not a purchasable product.`);
        }

        const price = listing.attributes.price;
        if (!price || price.currency !== primaryCurrency) {
          throw badRequest(`Error: cart listing "${title}" has an incompatible price.`);
        }

        const stockRef = listing.relationships?.currentStock?.data?.id?.uuid;
        const stock = stockRef != null ? stockById.get(stockRef) : null;
        if (typeof stock !== 'number' || stock < item.quantity) {
          const error = badRequest(
            `Error: cart listing "${title}" does not have enough stock (${stock ?? 0} left).`
          );
          error.statusText = 'cart-item-out-of-stock';
          throw error;
        }

        return {
          listingId: item.listingId,
          title,
          quantity: item.quantity,
          unitPriceAmount: price.amount,
          currency: price.currency,
        };
      });
    });
};

/**
 * Build the protectedData entry that lets the web app render real titles for
 * the cart line items (the Marketplace API only stores code + amounts).
 */
exports.cartItemsProtectedData = validatedCartItems => {
  return {
    cartItems: validatedCartItems.map((item, index) => ({
      code: `line-item/cart-item-${index + 1}`,
      listingId: item.listingId,
      title: item.title,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
    })),
  };
};
