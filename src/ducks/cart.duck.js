import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { denormalisedResponseEntities } from '../util/data';
import { storableError } from '../util/errors';
import { setCurrentUser } from './user.duck';

// ================ Cart shape & pure helpers (exported for tests) ================ //

// The cart lives in currentUser.attributes.profile.privateData.cart:
//   { authorId, authorName, items: [{ listingId, quantity }], updatedAt }
// privateData is visible only to the user themselves, and profile updates
// overwrite only the first-level keys given, so writing { privateData: { cart } }
// never touches other private data. The cart holds purchase listings from a
// single seller (single-vendor cart).

export const getCart = currentUser => currentUser?.attributes?.profile?.privateData?.cart || null;

export const cartItemCount = cart =>
  (cart?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

const clampQuantity = (quantity, maxQuantity) => {
  const q = Number.parseInt(quantity, 10);
  const atLeastOne = Number.isInteger(q) && q > 0 ? q : 1;
  const max = Number.isInteger(maxQuantity) && maxQuantity > 0 ? maxQuantity : null;
  return max ? Math.min(atLeastOne, max) : atLeastOne;
};

/**
 * Add an item to the cart (pure function).
 *
 * @param {Object|null} cart current cart or null
 * @param {Object} params { listingId, authorId, authorName, quantity, maxQuantity }
 * @param {String} timestamp ISO timestamp for cart.updatedAt
 * @returns {Object} { cart, requiresReplace } — when requiresReplace is true, the
 *   cart already has items from another seller and nothing was changed.
 */
export const addItemToCart = (cart, params, timestamp) => {
  const { listingId, authorId, authorName, quantity = 1, maxQuantity } = params;
  const items = cart?.items || [];
  const hasItemsFromOtherAuthor = items.length > 0 && cart.authorId !== authorId;
  if (hasItemsFromOtherAuthor) {
    return { cart, requiresReplace: true };
  }

  const existing = items.find(i => i.listingId === listingId);
  const addedQuantity = Number.parseInt(quantity, 10) || 1;
  const combinedQuantity = (existing?.quantity || 0) + addedQuantity;
  const newItem = { listingId, quantity: clampQuantity(combinedQuantity, maxQuantity) };
  const newItems = existing
    ? items.map(i => (i.listingId === listingId ? newItem : i))
    : [...items, newItem];

  return {
    cart: { authorId, authorName, items: newItems, updatedAt: timestamp },
    requiresReplace: false,
  };
};

/**
 * Set the quantity of a cart item (pure function). Quantity is clamped to
 * 1..maxQuantity. Unknown listingIds leave the cart untouched.
 */
export const setItemQuantity = (cart, params, timestamp) => {
  const { listingId, quantity, maxQuantity } = params;
  const items = cart?.items || [];
  if (!items.find(i => i.listingId === listingId)) {
    return cart;
  }
  const newItems = items.map(i =>
    i.listingId === listingId ? { ...i, quantity: clampQuantity(quantity, maxQuantity) } : i
  );
  return { ...cart, items: newItems, updatedAt: timestamp };
};

/**
 * Remove an item from the cart (pure function). Removing the last item
 * clears the whole cart (returns null).
 */
export const removeItemFromCart = (cart, listingId, timestamp) => {
  const items = (cart?.items || []).filter(i => i.listingId !== listingId);
  return items.length === 0 ? null : { ...cart, items, updatedAt: timestamp };
};

// ================ Thunks ================ //

export const saveCartThunk = createAsyncThunk(
  'cart/saveCart',
  (cart, { dispatch, rejectWithValue, extra: sdk }) => {
    return sdk.currentUser
      .updateProfile({ privateData: { cart } }, { expand: true })
      .then(response => {
        const entities = denormalisedResponseEntities(response);
        if (entities.length !== 1) {
          throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
        }
        // Keep state.user.currentUser (the single source of truth for the cart) fresh.
        dispatch(setCurrentUser(entities[0]));
        return cart;
      })
      .catch(e => rejectWithValue(storableError(e)));
  }
);

/**
 * Add a listing to the cart. Resolves to { requiresReplace: true, currentAuthorName }
 * without saving when the cart holds items from another seller and replaceExisting
 * wasn't set — the UI should then ask the user and retry with replaceExisting: true.
 */
export const addToCart = ({ listing, quantity = 1, replaceExisting = false }) => (
  dispatch,
  getState
) => {
  const { currentUser } = getState().user;
  const cart = getCart(currentUser);
  const params = {
    listingId: listing?.id?.uuid,
    authorId: listing?.author?.id?.uuid,
    authorName: listing?.author?.attributes?.profile?.displayName || '',
    quantity,
    maxQuantity: listing?.currentStock?.attributes?.quantity,
  };
  const baseCart = replaceExisting ? null : cart;
  const { cart: nextCart, requiresReplace } = addItemToCart(
    baseCart,
    params,
    new Date().toISOString()
  );

  if (requiresReplace) {
    return Promise.resolve({ requiresReplace: true, currentAuthorName: cart?.authorName || '' });
  }
  return dispatch(saveCartThunk(nextCart))
    .unwrap()
    .then(() => ({ requiresReplace: false }));
};

export const setCartItemQuantity = ({ listingId, quantity, maxQuantity }) => (
  dispatch,
  getState
) => {
  const cart = getCart(getState().user.currentUser);
  const nextCart = setItemQuantity(
    cart,
    { listingId, quantity, maxQuantity },
    new Date().toISOString()
  );
  return dispatch(saveCartThunk(nextCart)).unwrap();
};

export const removeFromCart = ({ listingId }) => (dispatch, getState) => {
  const cart = getCart(getState().user.currentUser);
  const nextCart = removeItemFromCart(cart, listingId, new Date().toISOString());
  return dispatch(saveCartThunk(nextCart)).unwrap();
};

export const clearCart = () => dispatch => {
  return dispatch(saveCartThunk(null)).unwrap();
};

// ================ Slice ================ //

const initialState = {
  saveInProgress: false,
  saveError: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(saveCartThunk.pending, state => {
        state.saveInProgress = true;
        state.saveError = null;
      })
      .addCase(saveCartThunk.fulfilled, state => {
        state.saveInProgress = false;
      })
      .addCase(saveCartThunk.rejected, (state, action) => {
        state.saveInProgress = false;
        state.saveError = action.payload;
      });
  },
});

export default cartSlice.reducer;
