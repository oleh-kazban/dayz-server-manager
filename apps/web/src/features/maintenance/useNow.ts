import { useEffect, useState } from 'react';

/** Current time in ms, re-read every `intervalMs` while `enabled` (e.g. for a countdown). */
export function useNow(enabled: boolean, intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const tick = () => setNow(Date.now());
    // Refresh right away (a stale value may be minutes old), then every interval.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);

  return now;
}
