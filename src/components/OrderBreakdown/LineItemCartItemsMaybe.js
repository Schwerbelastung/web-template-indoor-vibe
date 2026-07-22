import React from 'react';
import { intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { humanizeLineItemCode } from '../../util/data';
import { LINE_ITEM_CART_ITEM_PREFIX, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * Renders the extra shopping-cart line items (line-item/cart-item-*) with the
 * real listing titles. The titles come from the transaction's
 * protectedData.cartItems, written server-side when the cart order was
 * initiated (see server/api/initiate-privileged.js).
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The transaction's line items
 * @param {Object} [props.protectedData] - The transaction's protectedData
 * @param {boolean} props.isProvider - Whether the breakdown is shown to the provider
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element|null}
 */
const LineItemCartItemsMaybe = props => {
  const { lineItems, protectedData, isProvider, intl } = props;

  const allCartLineItems = lineItems.filter(
    item => item.code.startsWith(LINE_ITEM_CART_ITEM_PREFIX) && !item.reversal
  );
  const items = isProvider
    ? allCartLineItems.filter(item => item.includeFor.includes('provider'))
    : allCartLineItems.filter(item => item.includeFor.includes('customer'));

  const titleByCode = new Map(
    (protectedData?.cartItems || []).map(cartItem => [cartItem.code, cartItem.title])
  );

  return items.length > 0 ? (
    <React.Fragment>
      {items.map(item => {
        const quantity = item.quantity;
        const title = titleByCode.get(item.code) || humanizeLineItemCode(item.code);
        const label = quantity && quantity > 1 ? `${title} x ${quantity}` : title;
        const formattedTotal = formatMoney(intl, item.lineTotal);
        return (
          <div key={item.code} className={css.lineItem}>
            <span className={css.itemLabel}>{label}</span>
            <span className={css.itemValue}>{formattedTotal}</span>
          </div>
        );
      })}
    </React.Fragment>
  ) : null;
};

export default LineItemCartItemsMaybe;
