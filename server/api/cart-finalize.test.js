jest.mock('../api-util/sdk', () => ({
  getSdk: jest.fn(),
  handleError: jest.fn(),
  serialize: jest.fn(),
}));

jest.mock('../api-util/integrationSdk', () => ({
  getIntegrationSdk: jest.fn(),
}));

const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdk } = require('../api-util/integrationSdk');
const cartFinalize = require('./cart-finalize');

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

const sentPayload = res => JSON.parse(res.send.mock.calls[res.send.mock.calls.length - 1][0]);

const makeTx = ({
  processName = 'default-purchase',
  transitions = [{ transition: 'transition/confirm-payment' }],
  cartItems = [
    { code: 'line-item/cart-item-1', listingId: 'a', quantity: 2 },
    { code: 'line-item/cart-item-2', listingId: 'b', quantity: 1 },
  ],
  metadata = {},
} = {}) => ({
  attributes: { processName, transitions, protectedData: { cartItems }, metadata },
});

const mockSdks = (tx, { adjustmentFailsFor = [] } = {}) => {
  getSdk.mockReturnValue({
    transactions: { show: jest.fn(() => Promise.resolve({ data: { data: tx } })) },
  });
  const stockAdjustmentsCreate = jest.fn(({ listingId }) =>
    adjustmentFailsFor.includes(listingId)
      ? Promise.reject(new Error('conflict'))
      : Promise.resolve({})
  );
  const updateMetadata = jest.fn(() => Promise.resolve({}));
  getIntegrationSdk.mockReturnValue({
    stockAdjustments: { create: stockAdjustmentsCreate },
    transactions: { updateMetadata },
  });
  return { stockAdjustmentsCreate, updateMetadata };
};

describe('cart-finalize endpoint', () => {
  beforeEach(() => {
    // The project's jest config uses resetMocks: true, which strips mock
    // implementations before every test — re-establish handleError here.
    handleError.mockImplementation((res, e) => {
      res.status(e.status || 500).send(JSON.stringify({ error: e.message }));
    });
  });

  it('rejects a missing transactionId', async () => {
    const res = createResponse();
    await cartFinalize({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an unpaid transaction', async () => {
    mockSdks(makeTx({ transitions: [{ transition: 'transition/request-payment' }] }));
    const res = createResponse();
    await cartFinalize({ body: { transactionId: 'tx-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('does nothing for a transaction without cart items', async () => {
    const { stockAdjustmentsCreate } = mockSdks(makeTx({ cartItems: [] }));
    const res = createResponse();
    await cartFinalize({ body: { transactionId: 'tx-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(sentPayload(res)).toEqual({ finalized: false, reason: 'no-cart-items' });
    expect(stockAdjustmentsCreate).not.toHaveBeenCalled();
  });

  it('is idempotent when already finalized', async () => {
    const { stockAdjustmentsCreate } = mockSdks(
      makeTx({ metadata: { cartStockFinalized: true } })
    );
    const res = createResponse();
    await cartFinalize({ body: { transactionId: 'tx-1' } }, res);
    expect(sentPayload(res)).toEqual({ finalized: true, alreadyFinalized: true });
    expect(stockAdjustmentsCreate).not.toHaveBeenCalled();
  });

  it('decrements stock for every cart item and marks the transaction', async () => {
    const { stockAdjustmentsCreate, updateMetadata } = mockSdks(makeTx());
    const res = createResponse();
    await cartFinalize({ body: { transactionId: 'tx-1' } }, res);

    expect(stockAdjustmentsCreate).toHaveBeenCalledWith({ listingId: 'a', quantity: -2 });
    expect(stockAdjustmentsCreate).toHaveBeenCalledWith({ listingId: 'b', quantity: -1 });
    expect(updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-1',
        metadata: expect.objectContaining({ cartStockFinalized: true }),
      })
    );
    expect(sentPayload(res)).toEqual({ finalized: true, failures: [] });
  });

  it('records failures without blocking the response', async () => {
    const { updateMetadata } = mockSdks(makeTx(), { adjustmentFailsFor: ['b'] });
    const res = createResponse();
    await cartFinalize({ body: { transactionId: 'tx-1' } }, res);

    expect(updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          cartStockFinalized: true,
          cartStockErrors: ['b'],
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(sentPayload(res)).toEqual({ finalized: true, failures: ['b'] });
  });
});
