import { useEffect, useState } from 'react';

import { getExchangeRate } from './api';

// Module-level cache: the EUR->USD rate is fetched from the app's own server
// at most once per browser session. The server caches the upstream rate for 12h,
// so the displayed estimate is at most a day or so old — fine for a display-only hint.
let cachedResult; // { base, rate, date } | undefined
let pendingPromise = null;

export const fetchEurUsdRateOnce = () => {
  if (cachedResult !== undefined) {
    return Promise.resolve(cachedResult);
  }
  if (!pendingPromise) {
    pendingPromise = getExchangeRate()
      .then(result => {
        cachedResult = result && typeof result.rate === 'number' ? result : { rate: null };
        return cachedResult;
      })
      .catch(() => {
        // A missing rate only hides the USD estimate — it must never break a page.
        cachedResult = { rate: null };
        return cachedResult;
      });
  }
  return pendingPromise;
};

/**
 * The current EUR->USD exchange rate as a number, or null while loading or
 * when no rate is available. Server-side rendering always returns null, so
 * the USD estimate appears on the client after hydration.
 *
 * @returns {number|null} the EUR->USD rate
 */
export const useEurUsdRate = () => {
  const [rate, setRate] = useState(() =>
    typeof cachedResult?.rate === 'number' ? cachedResult.rate : null
  );

  useEffect(() => {
    let mounted = true;
    fetchEurUsdRateOnce().then(result => {
      if (mounted && typeof result?.rate === 'number') {
        setRate(result.rate);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return rate;
};
