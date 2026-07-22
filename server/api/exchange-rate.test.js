const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
};

const sentPayload = res => JSON.parse(res.send.mock.calls[res.send.mock.calls.length - 1][0]);

const okUpstream = (rate, date = '2026-07-22') =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ base: 'EUR', date, rates: { USD: rate } }),
  });

const failedUpstream = () => Promise.resolve({ ok: false, status: 503 });

describe('exchange-rate endpoint', () => {
  let handler;
  let fetchMock;
  let nowMock;

  beforeEach(() => {
    jest.resetModules();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    nowMock = jest.spyOn(Date, 'now').mockReturnValue(0);
    handler = require('./exchange-rate');
  });

  afterEach(() => {
    nowMock.mockRestore();
    delete global.fetch;
  });

  it('returns the upstream rate', async () => {
    fetchMock.mockReturnValueOnce(okUpstream(1.1432));
    const res = createResponse();
    await handler({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(sentPayload(res)).toEqual({ base: 'EUR', rate: 1.1432, date: '2026-07-22' });
  });

  it('serves from cache within the TTL without refetching', async () => {
    fetchMock.mockReturnValueOnce(okUpstream(1.1432));
    await handler({}, createResponse());

    nowMock.mockReturnValue(11 * 60 * 60 * 1000); // 11h later: still fresh
    const res = createResponse();
    await handler({}, res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentPayload(res).rate).toBe(1.1432);
  });

  it('refetches after the TTL and returns the new rate', async () => {
    fetchMock.mockReturnValueOnce(okUpstream(1.1432)).mockReturnValueOnce(okUpstream(1.2001));
    await handler({}, createResponse());

    nowMock.mockReturnValue(13 * 60 * 60 * 1000); // 13h later: expired
    const res = createResponse();
    await handler({}, res);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentPayload(res).rate).toBe(1.2001);
  });

  it('serves the stale rate when a refetch fails', async () => {
    fetchMock.mockReturnValueOnce(okUpstream(1.1432)).mockReturnValueOnce(failedUpstream());
    await handler({}, createResponse());

    nowMock.mockReturnValue(13 * 60 * 60 * 1000);
    const res = createResponse();
    await handler({}, res);

    expect(sentPayload(res).rate).toBe(1.1432);
  });

  it('returns a null rate when no rate has ever been available', async () => {
    fetchMock.mockReturnValueOnce(failedUpstream());
    const res = createResponse();
    await handler({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(sentPayload(res)).toEqual({ base: 'EUR', rate: null, date: null });
  });

  it('rejects an upstream response without a valid rate', async () => {
    fetchMock.mockReturnValueOnce(
      Promise.resolve({ ok: true, json: () => Promise.resolve({ rates: {} }) })
    );
    const res = createResponse();
    await handler({}, res);
    expect(sentPayload(res).rate).toBeNull();
  });
});
