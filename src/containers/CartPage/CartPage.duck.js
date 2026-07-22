import { createSlice } from '@reduxjs/toolkit';

import { createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';

import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';
import { getCart } from '../../ducks/cart.duck';

// ================ Slice ================ //

const initialState = {
  listingIds: [],
  fetchInProgress: false,
  fetchListingsError: null,
};

const cartPageSlice = createSlice({
  name: 'CartPage',
  initialState,
  reducers: {
    fetchListingsRequest: state => {
      state.fetchInProgress = true;
      state.fetchListingsError = null;
    },
    fetchListingsSuccess: (state, action) => {
      state.fetchInProgress = false;
      state.listingIds = action.payload;
    },
    fetchListingsError: (state, action) => {
      state.fetchInProgress = false;
      state.fetchListingsError = action.payload;
    },
  },
});

export const {
  fetchListingsRequest,
  fetchListingsSuccess,
  fetchListingsError,
} = cartPageSlice.actions;

export default cartPageSlice.reducer;

// ================ loadData ================ //

// Fetch the current user (for the cart in privateData) and then the cart's
// listings with images and live stock, so the page can clamp quantities and
// detect items that are no longer available.
export const loadData = (params, search, config) => (dispatch, getState, sdk) => {
  dispatch(fetchListingsRequest());

  return dispatch(fetchCurrentUser())
    .then(() => {
      const cart = getCart(getState().user.currentUser);
      const listingIds = (cart?.items || []).map(i => i.listingId);

      if (listingIds.length === 0) {
        dispatch(fetchListingsSuccess([]));
        return null;
      }

      const {
        aspectWidth = 1,
        aspectHeight = 1,
        variantPrefix = 'listing-card',
      } = config.layout.listingImage;
      const aspectRatio = aspectHeight / aspectWidth;

      return sdk.listings
        .query({
          ids: listingIds,
          include: ['author', 'images', 'currentStock'],
          'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
          ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
          ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
          'limit.images': 1,
        })
        .then(response => {
          const sanitizeConfig = { listingFields: config?.listing?.listingFields };
          dispatch(addMarketplaceEntities(response, sanitizeConfig));
          dispatch(fetchListingsSuccess(response.data.data.map(l => l.id)));
          return response;
        });
    })
    .catch(e => {
      dispatch(fetchListingsError(storableError(e)));
      throw e;
    });
};
