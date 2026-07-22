const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const { fetchAndValidateCartItems, cartItemsProtectedData } = require('../api-util/cartOrder');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');

const { Money } = sharetribeSdk.types;

// author is included for the cart flow, where the extra listings must belong
// to the same seller as the transacted listing.
const listingPromise = (sdk, id) => sdk.listings.show({ id, include: ['author'] });

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  return isIntentionToMakeOffer(offerInSubunits, transitionName)
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body || {};
  const transitionName = bodyParams.transition;
  const sdk = getSdk(req, res);
  const cartItems = orderData?.cartItems;
  const hasCartItems = Array.isArray(cartItems) && cartItems.length > 0;
  let lineItems = null;
  let metadataMaybe = {};
  let cartProtectedDataMaybe = {};

  Promise.all([listingPromise(sdk, bodyParams?.params?.listingId), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const currency = listing.attributes.price?.currency || orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      // For cart orders, re-fetch and validate the extra listings server-side.
      const validatedCartItemsPromise = hasCartItems
        ? fetchAndValidateCartItems(sdk, listing, cartItems)
        : Promise.resolve(null);

      return validatedCartItemsPromise.then(validatedCartItems => {
        const cartOrderDataMaybe = validatedCartItems ? { validatedCartItems } : {};
        cartProtectedDataMaybe = validatedCartItems
          ? cartItemsProtectedData(validatedCartItems)
          : {};

        lineItems = transactionLineItems(
          listing,
          { ...getFullOrderData(orderData, bodyParams, currency), ...cartOrderDataMaybe },
          providerCommission,
          customerCommission
        );
        metadataMaybe = getMetadata(orderData, transitionName);

        return getTrustedSdk(req);
      });
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // For cart orders, store display data (titles etc.) of the extra items in
      // protectedData so the order breakdown can render them.
      const protectedDataMaybe = hasCartItems
        ? { protectedData: { ...params?.protectedData, ...cartProtectedDataMaybe } }
        : {};

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          ...protectedDataMaybe,
          lineItems,
          ...metadataMaybe,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
