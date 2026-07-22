import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatMoney, formatUsdEstimate } from '../../util/currency';
import { useEurUsdRate } from '../../util/exchangeRate';
import { types as sdkTypes } from '../../util/sdkLoader';
import { createSlug } from '../../util/urlHelpers';

import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getCart, cartItemCount, setCartItemQuantity, removeFromCart } from '../../ducks/cart.duck';

import {
  H3,
  Page,
  LayoutSingleColumn,
  NamedLink,
  AspectRatioWrapper,
  ResponsiveImage,
  InlineTextButton,
  PrimaryButton,
  IconCart,
} from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './CartPage.module.css';

const { Money } = sdkTypes;

const stockOf = listing => listing?.currentStock?.attributes?.quantity ?? 0;

const CartItemRow = props => {
  const {
    item,
    listing,
    intl,
    variantPrefix,
    aspectWidth,
    aspectHeight,
    saveInProgress,
    onSetQuantity,
    onRemove,
  } = props;

  const title = listing?.attributes?.title;
  const price = listing?.attributes?.price;
  const stock = stockOf(listing);
  const isUnavailable = !listing || stock === 0;
  const quantity = item.quantity;
  const firstImage = listing?.images?.length > 0 ? listing.images[0] : null;

  const lineTotal =
    !isUnavailable && price ? new Money(price.amount * Math.min(quantity, stock), price.currency) : null;

  const imageMaybe = firstImage ? (
    <AspectRatioWrapper width={aspectWidth} height={aspectHeight} className={css.itemImageWrapper}>
      <ResponsiveImage
        rootClassName={css.itemImage}
        alt={title || ''}
        image={firstImage}
        variants={[variantPrefix, `${variantPrefix}-2x`]}
        sizes="96px"
      />
    </AspectRatioWrapper>
  ) : (
    <div className={css.itemImagePlaceholder} />
  );

  const titleMaybe =
    listing && title ? (
      <NamedLink
        className={css.itemTitle}
        name="ListingPage"
        params={{ id: listing.id.uuid, slug: createSlug(title) }}
      >
        {title}
      </NamedLink>
    ) : (
      <span className={css.itemTitleUnavailable}>
        <FormattedMessage id="CartPage.unavailableItemTitle" />
      </span>
    );

  return (
    <li className={css.itemRow} data-testid="cart-item-row">
      {imageMaybe}
      <div className={css.itemInfo}>
        {titleMaybe}
        {isUnavailable ? (
          <p className={css.itemUnavailableNote}>
            <FormattedMessage id="CartPage.unavailableItem" />
          </p>
        ) : (
          <p className={css.itemUnitPrice}>{formatMoney(intl, price)}</p>
        )}
        {!isUnavailable && quantity > stock ? (
          <p className={css.itemStockWarning}>
            <FormattedMessage id="CartPage.stockLimited" values={{ count: stock }} />
          </p>
        ) : null}
        <InlineTextButton
          rootClassName={css.removeButton}
          onClick={() => onRemove(item.listingId)}
          disabled={saveInProgress}
        >
          <FormattedMessage id="CartPage.remove" />
        </InlineTextButton>
      </div>
      {!isUnavailable ? (
        <div className={css.itemControls}>
          <div className={css.quantityStepper}>
            <button
              type="button"
              className={css.stepperButton}
              onClick={() => onSetQuantity(item.listingId, quantity - 1, stock)}
              disabled={saveInProgress || quantity <= 1}
              aria-label={intl.formatMessage({ id: 'CartPage.decreaseQuantity' })}
            >
              −
            </button>
            <span className={css.quantityValue} data-testid="cart-item-quantity">
              {quantity}
            </span>
            <button
              type="button"
              className={css.stepperButton}
              onClick={() => onSetQuantity(item.listingId, quantity + 1, stock)}
              disabled={saveInProgress || quantity >= stock}
              aria-label={intl.formatMessage({ id: 'CartPage.increaseQuantity' })}
            >
              +
            </button>
          </div>
          {lineTotal ? <span className={css.lineTotal}>{formatMoney(intl, lineTotal)}</span> : null}
        </div>
      ) : null}
    </li>
  );
};

/**
 * The shopping cart page: lists the cart's items with quantity steppers,
 * removals, a subtotal (with USD estimate) and the checkout entry point.
 */
const CartPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();
  const eurUsdRate = useEurUsdRate();

  const currentUser = useSelector(state => state.user.currentUser);
  const { listingIds, fetchInProgress, fetchListingsError } = useSelector(state => state.CartPage);
  const saveInProgress = useSelector(state => state.cart.saveInProgress);
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const listings = useSelector(state =>
    getMarketplaceEntities(state, listingIds.map(id => ({ id, type: 'listing' })))
  );

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;

  const cart = getCart(currentUser);
  const items = cart?.items || [];
  const findListing = listingId => listings.find(l => l.id?.uuid === listingId);

  const onSetQuantity = (listingId, quantity, maxQuantity) =>
    dispatch(setCartItemQuantity({ listingId, quantity, maxQuantity }));
  const onRemove = listingId => dispatch(removeFromCart({ listingId }));

  const availableItems = items.filter(i => stockOf(findListing(i.listingId)) > 0);
  const hasUnavailableItems = items.length > availableItems.length;
  const subtotalAmount = availableItems.reduce((sum, i) => {
    const listing = findListing(i.listingId);
    const price = listing?.attributes?.price;
    const quantity = Math.min(i.quantity, stockOf(listing));
    return price ? sum + price.amount * quantity : sum;
  }, 0);
  const subtotalMoney = subtotalAmount > 0 ? new Money(subtotalAmount, config.currency) : null;
  const usdEstimate = subtotalMoney ? formatUsdEstimate(intl, subtotalMoney, eurUsdRate) : null;

  const title = intl.formatMessage({ id: 'CartPage.title' });
  const isLoading = fetchInProgress && items.length > 0 && listings.length === 0;

  const emptyCart = (
    <div className={css.emptyCart}>
      <IconCart rootClassName={css.emptyCartIcon} />
      <p className={css.emptyCartMessage}>
        <FormattedMessage id="CartPage.empty" />
      </p>
      <NamedLink className={css.browseLink} name="SearchPage">
        <FormattedMessage id="CartPage.browseListings" />
      </NamedLink>
    </div>
  );

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="CartPage.heading" values={{ count: cartItemCount(cart) }} />
          </H3>
          {cart?.authorName ? (
            <p className={css.sellerNote}>
              <FormattedMessage id="CartPage.itemsFrom" values={{ name: cart.authorName }} />
            </p>
          ) : null}

          {fetchListingsError ? (
            <p className={css.error}>
              <FormattedMessage id="CartPage.loadError" />
            </p>
          ) : null}

          {items.length === 0 ? (
            emptyCart
          ) : isLoading ? (
            <p className={css.loading}>
              <FormattedMessage id="CartPage.loading" />
            </p>
          ) : (
            <>
              <ul className={css.itemList}>
                {items.map(item => (
                  <CartItemRow
                    key={item.listingId}
                    item={item}
                    listing={findListing(item.listingId)}
                    intl={intl}
                    variantPrefix={variantPrefix}
                    aspectWidth={aspectWidth}
                    aspectHeight={aspectHeight}
                    saveInProgress={saveInProgress}
                    onSetQuantity={onSetQuantity}
                    onRemove={onRemove}
                  />
                ))}
              </ul>

              {hasUnavailableItems ? (
                <p className={css.unavailableNote}>
                  <FormattedMessage id="CartPage.unavailableItemsNote" />
                </p>
              ) : null}

              <div className={css.summary}>
                <div className={css.subtotalRow}>
                  <span className={css.subtotalLabel}>
                    <FormattedMessage id="CartPage.subtotal" />
                  </span>
                  <span className={css.subtotalValue} data-testid="cart-subtotal">
                    {subtotalMoney ? formatMoney(intl, subtotalMoney) : '—'}
                    {usdEstimate ? (
                      <span className={css.subtotalUsdEstimate}>{` (≈ ${usdEstimate})`}</span>
                    ) : null}
                  </span>
                </div>
                <PrimaryButton className={css.checkoutButton} disabled>
                  <FormattedMessage id="CartPage.checkoutButton" />
                </PrimaryButton>
                <p className={css.checkoutNote}>
                  <FormattedMessage id="CartPage.checkoutComingSoon" />
                </p>
              </div>
            </>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default CartPage;
