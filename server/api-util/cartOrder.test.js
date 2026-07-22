const { fetchAndValidateCartItems, cartItemsProtectedData } = require('./cartOrder');

const primaryListing = {
  id: { uuid: 'primary-id' },
  attributes: { price: { amount: 250000, currency: 'EUR' } },
  relationships: { author: { data: { id: { uuid: 'author-1' } } } },
};

const makeListing = ({
  id = 'extra-1',
  authorId = 'author-1',
  amount = 100000,
  currency = 'EUR',
  unitType = 'item',
  processAlias = 'default-purchase/release-1',
  stockId = `stock-${id}`,
} = {}) => ({
  id: { uuid: id },
  type: 'listing',
  attributes: {
    title: `Listing ${id}`,
    price: { amount, currency },
    publicData: { unitType, transactionProcessAlias: processAlias },
  },
  relationships: {
    author: { data: { id: { uuid: authorId } } },
    currentStock: { data: { id: { uuid: stockId } } },
  },
});

const makeStock = (stockId, quantity) => ({
  id: { uuid: stockId },
  type: 'stock',
  attributes: { quantity },
});

const sdkWith = (listings, included) => ({
  listings: {
    query: jest.fn(() => Promise.resolve({ data: { data: listings, included } })),
  },
});

describe('cartOrder', () => {
  describe('fetchAndValidateCartItems()', () => {
    it('returns enriched items for a valid cart', async () => {
      const sdk = sdkWith(
        [makeListing({ id: 'extra-1' }), makeListing({ id: 'extra-2', amount: 50000 })],
        [makeStock('stock-extra-1', 5), makeStock('stock-extra-2', 2)]
      );
      const items = await fetchAndValidateCartItems(sdk, primaryListing, [
        { listingId: 'extra-1', quantity: 2 },
        { listingId: 'extra-2', quantity: 1 },
      ]);
      expect(items).toEqual([
        {
          listingId: 'extra-1',
          title: 'Listing extra-1',
          quantity: 2,
          unitPriceAmount: 100000,
          currency: 'EUR',
        },
        {
          listingId: 'extra-2',
          title: 'Listing extra-2',
          quantity: 1,
          unitPriceAmount: 50000,
          currency: 'EUR',
        },
      ]);
    });

    it.each([
      ['empty array', []],
      ['missing listingId', [{ quantity: 1 }]],
      ['duplicate ids', [{ listingId: 'a', quantity: 1 }, { listingId: 'a', quantity: 1 }]],
      ['primary repeated', [{ listingId: 'primary-id', quantity: 1 }]],
      ['zero quantity', [{ listingId: 'a', quantity: 0 }]],
      ['non-integer quantity', [{ listingId: 'a', quantity: 1.5 }]],
    ])('rejects invalid shape: %s', async (_label, cartItems) => {
      const sdk = sdkWith([], []);
      await expect(
        fetchAndValidateCartItems(sdk, primaryListing, cartItems)
      ).rejects.toMatchObject({ status: 400 });
      expect(sdk.listings.query).not.toHaveBeenCalled();
    });

    it('rejects a listing that is not found (unpublished/closed)', async () => {
      const sdk = sdkWith([], []);
      await expect(
        fetchAndValidateCartItems(sdk, primaryListing, [{ listingId: 'ghost', quantity: 1 }])
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects a listing from a different seller', async () => {
      const sdk = sdkWith(
        [makeListing({ id: 'extra-1', authorId: 'someone-else' })],
        [makeStock('stock-extra-1', 5)]
      );
      await expect(
        fetchAndValidateCartItems(sdk, primaryListing, [{ listingId: 'extra-1', quantity: 1 }])
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects a non-purchase listing', async () => {
      const sdk = sdkWith(
        [makeListing({ id: 'extra-1', unitType: 'day', processAlias: 'default-booking/release-1' })],
        [makeStock('stock-extra-1', 5)]
      );
      await expect(
        fetchAndValidateCartItems(sdk, primaryListing, [{ listingId: 'extra-1', quantity: 1 }])
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects a currency mismatch', async () => {
      const sdk = sdkWith(
        [makeListing({ id: 'extra-1', currency: 'USD' })],
        [makeStock('stock-extra-1', 5)]
      );
      await expect(
        fetchAndValidateCartItems(sdk, primaryListing, [{ listingId: 'extra-1', quantity: 1 }])
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects insufficient stock', async () => {
      const sdk = sdkWith([makeListing({ id: 'extra-1' })], [makeStock('stock-extra-1', 1)]);
      await expect(
        fetchAndValidateCartItems(sdk, primaryListing, [{ listingId: 'extra-1', quantity: 2 }])
      ).rejects.toMatchObject({ status: 400, statusText: 'cart-item-out-of-stock' });
    });
  });

  describe('cartItemsProtectedData()', () => {
    it('builds indexed codes with display data', () => {
      const result = cartItemsProtectedData([
        { listingId: 'a', title: 'Bike A', quantity: 2, unitPriceAmount: 100, currency: 'EUR' },
        { listingId: 'b', title: 'Bike B', quantity: 1, unitPriceAmount: 200, currency: 'EUR' },
      ]);
      expect(result).toEqual({
        cartItems: [
          {
            code: 'line-item/cart-item-1',
            listingId: 'a',
            title: 'Bike A',
            quantity: 2,
            unitPriceAmount: 100,
          },
          {
            code: 'line-item/cart-item-2',
            listingId: 'b',
            title: 'Bike B',
            quantity: 1,
            unitPriceAmount: 200,
          },
        ],
      });
    });
  });
});
