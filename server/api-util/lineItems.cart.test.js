const { transactionLineItems } = require('./lineItems');

const listing = {
  attributes: {
    price: { amount: 250000, currency: 'EUR', _sdkType: 'Money' },
    publicData: { unitType: 'item' },
  },
};

// The template's Money type check happens via instanceof from sharetribe-flex-sdk;
// construct real Money instances for the listing price.
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;
const listingWithMoney = {
  attributes: {
    price: new Money(250000, 'EUR'),
    publicData: { unitType: 'item' },
  },
};

const validatedCartItems = [
  { listingId: 'a', title: 'Bike A', quantity: 2, unitPriceAmount: 100000, currency: 'EUR' },
  { listingId: 'b', title: 'Bike B', quantity: 1, unitPriceAmount: 50000, currency: 'EUR' },
];

describe('transactionLineItems with cart items', () => {
  it('adds a line item per cart item with server-side prices', () => {
    const lineItems = transactionLineItems(
      listingWithMoney,
      { stockReservationQuantity: 1, validatedCartItems },
      null,
      null
    );

    const cartLines = lineItems.filter(li => li.code.startsWith('line-item/cart-item-'));
    expect(cartLines).toEqual([
      expect.objectContaining({
        code: 'line-item/cart-item-1',
        quantity: 2,
        includeFor: ['customer', 'provider'],
      }),
      expect.objectContaining({
        code: 'line-item/cart-item-2',
        quantity: 1,
        includeFor: ['customer', 'provider'],
      }),
    ]);
    expect(cartLines[0].unitPrice.amount).toBe(100000);
    expect(cartLines[1].unitPrice.amount).toBe(50000);
  });

  it('computes commissions on the whole payin (base + cart items)', () => {
    const lineItems = transactionLineItems(
      listingWithMoney,
      { stockReservationQuantity: 1, validatedCartItems },
      { percentage: 10 },
      { percentage: 5 }
    );

    // base 250000 + (2 x 100000) + 50000 = 500000
    const providerCommission = lineItems.find(li => li.code === 'line-item/provider-commission');
    expect(providerCommission).toBeDefined();
    expect(providerCommission.unitPrice.amount).toBe(500000);
    expect(providerCommission.percentage.toNumber ? providerCommission.percentage.toNumber() : providerCommission.percentage).toBe(-10);

    const customerCommission = lineItems.find(li => li.code === 'line-item/customer-commission');
    expect(customerCommission).toBeDefined();
    expect(customerCommission.unitPrice.amount).toBe(500000);
  });

  it('keeps behavior unchanged without cart items', () => {
    const lineItems = transactionLineItems(
      listingWithMoney,
      { stockReservationQuantity: 2 },
      { percentage: 10 },
      null
    );
    expect(lineItems.some(li => li.code.startsWith('line-item/cart-item-'))).toBe(false);
    const providerCommission = lineItems.find(li => li.code === 'line-item/provider-commission');
    // commission base is the plain order: 2 x 250000
    expect(providerCommission.unitPrice.amount).toBe(500000);
  });
});
