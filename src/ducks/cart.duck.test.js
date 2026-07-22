import {
  getCart,
  cartItemCount,
  addItemToCart,
  setItemQuantity,
  removeItemFromCart,
} from './cart.duck';

const TS = '2026-07-22T12:00:00.000Z';

const cartWith = (authorId, items) => ({
  authorId,
  authorName: 'Seller Name',
  items,
  updatedAt: TS,
});

describe('cart.duck pure helpers', () => {
  describe('getCart()', () => {
    it('reads the cart from currentUser privateData', () => {
      const cart = cartWith('a1', [{ listingId: 'l1', quantity: 2 }]);
      const currentUser = { attributes: { profile: { privateData: { cart } } } };
      expect(getCart(currentUser)).toEqual(cart);
    });

    it('returns null for missing user or cart', () => {
      expect(getCart(null)).toBeNull();
      expect(getCart({ attributes: { profile: { privateData: {} } } })).toBeNull();
    });
  });

  describe('cartItemCount()', () => {
    it('sums the quantities', () => {
      const cart = cartWith('a1', [
        { listingId: 'l1', quantity: 2 },
        { listingId: 'l2', quantity: 3 },
      ]);
      expect(cartItemCount(cart)).toBe(5);
    });

    it('is 0 for an empty or missing cart', () => {
      expect(cartItemCount(null)).toBe(0);
      expect(cartItemCount(cartWith('a1', []))).toBe(0);
    });
  });

  describe('addItemToCart()', () => {
    const params = {
      listingId: 'l1',
      authorId: 'a1',
      authorName: 'Seller Name',
      quantity: 2,
      maxQuantity: 5,
    };

    it('creates a cart from scratch', () => {
      const { cart, requiresReplace } = addItemToCart(null, params, TS);
      expect(requiresReplace).toBe(false);
      expect(cart).toEqual(cartWith('a1', [{ listingId: 'l1', quantity: 2 }]));
    });

    it('accumulates quantity for the same listing', () => {
      const existing = cartWith('a1', [{ listingId: 'l1', quantity: 2 }]);
      const { cart } = addItemToCart(existing, params, TS);
      expect(cart.items).toEqual([{ listingId: 'l1', quantity: 4 }]);
    });

    it('clamps the accumulated quantity to the stock', () => {
      const existing = cartWith('a1', [{ listingId: 'l1', quantity: 4 }]);
      const { cart } = addItemToCart(existing, params, TS);
      expect(cart.items).toEqual([{ listingId: 'l1', quantity: 5 }]);
    });

    it('adds a second listing from the same seller', () => {
      const existing = cartWith('a1', [{ listingId: 'l1', quantity: 1 }]);
      const { cart } = addItemToCart(existing, { ...params, listingId: 'l2' }, TS);
      expect(cart.items).toHaveLength(2);
    });

    it('flags a replace when the cart has items from another seller', () => {
      const existing = cartWith('other-author', [{ listingId: 'lx', quantity: 1 }]);
      const { cart, requiresReplace } = addItemToCart(existing, params, TS);
      expect(requiresReplace).toBe(true);
      expect(cart).toEqual(existing); // untouched
    });

    it('defaults invalid quantities to 1', () => {
      const { cart } = addItemToCart(null, { ...params, quantity: 'not-a-number' }, TS);
      expect(cart.items).toEqual([{ listingId: 'l1', quantity: 1 }]);
    });
  });

  describe('setItemQuantity()', () => {
    const existing = cartWith('a1', [
      { listingId: 'l1', quantity: 2 },
      { listingId: 'l2', quantity: 1 },
    ]);

    it('sets the quantity of the given item only', () => {
      const cart = setItemQuantity(existing, { listingId: 'l1', quantity: 4, maxQuantity: 9 }, TS);
      expect(cart.items).toEqual([
        { listingId: 'l1', quantity: 4 },
        { listingId: 'l2', quantity: 1 },
      ]);
    });

    it('clamps to the available stock', () => {
      const cart = setItemQuantity(existing, { listingId: 'l1', quantity: 99, maxQuantity: 3 }, TS);
      expect(cart.items[0].quantity).toBe(3);
    });

    it('never goes below 1', () => {
      const cart = setItemQuantity(existing, { listingId: 'l1', quantity: 0, maxQuantity: 3 }, TS);
      expect(cart.items[0].quantity).toBe(1);
    });

    it('ignores unknown listing ids', () => {
      const cart = setItemQuantity(existing, { listingId: 'nope', quantity: 4 }, TS);
      expect(cart).toEqual(existing);
    });
  });

  describe('removeItemFromCart()', () => {
    it('removes the given item', () => {
      const existing = cartWith('a1', [
        { listingId: 'l1', quantity: 2 },
        { listingId: 'l2', quantity: 1 },
      ]);
      const cart = removeItemFromCart(existing, 'l1', TS);
      expect(cart.items).toEqual([{ listingId: 'l2', quantity: 1 }]);
    });

    it('clears the cart when the last item is removed', () => {
      const existing = cartWith('a1', [{ listingId: 'l1', quantity: 2 }]);
      expect(removeItemFromCart(existing, 'l1', TS)).toBeNull();
    });
  });
});
