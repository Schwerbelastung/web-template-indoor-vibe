/**
 * GET /api/exchange-rate
 *
 * Returns the current EUR -> USD exchange rate for display-only price estimates:
 * { base: 'EUR', rate: 1.14, date: '2026-07-22' } — rate is null when unavailable.
 *
 * The rate comes from the keyless Frankfurter API (ECB daily reference rates) and is
 * cached in memory for 12 hours. On upstream errors the previously cached (stale)
 * rate keeps being served, so a Frankfurter outage never breaks price rendering.
 */

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
// After a failed upstream fetch, wait before retrying so an outage doesn't
// get hammered on every page view.
const FAILURE_COOLDOWN_MS = 60 * 1000;

let cached = null; // { base, rate, date, fetchedAt }
let lastFailureAt = 0;

const FETCH_TIMEOUT_MS = 8 * 1000;

const fetchRateFromFrankfurter = async () => {
  // Bound the upstream call so a hung endpoint can't tie up the request for the
  // ~300s undici default (display-only rate, so fail fast to the EUR fallback).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(FRANKFURTER_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Frankfurter API responded with status ${response.status}`);
  }
  const data = await response.json();
  const rate = data?.rates?.USD;
  if (typeof rate !== 'number' || !(rate > 0)) {
    throw new Error('Frankfurter API response did not contain a valid USD rate');
  }
  return { base: 'EUR', rate, date: data.date || null };
};

module.exports = async (req, res) => {
  const now = Date.now();
  const isFresh = cached && now - cached.fetchedAt < CACHE_TTL_MS;
  const isInFailureCooldown = lastFailureAt > 0 && now - lastFailureAt < FAILURE_COOLDOWN_MS;

  if (!isFresh && !isInFailureCooldown) {
    try {
      const fresh = await fetchRateFromFrankfurter();
      cached = { ...fresh, fetchedAt: now };
    } catch (e) {
      lastFailureAt = now;
      console.error(`exchange-rate: fetching a fresh rate failed: ${e.message}`);
    }
  }

  const payload = cached
    ? { base: cached.base, rate: cached.rate, date: cached.date }
    : { base: 'EUR', rate: null, date: null };

  res
    .status(200)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(payload));
};
