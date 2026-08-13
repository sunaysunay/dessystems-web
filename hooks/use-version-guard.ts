'use client';
import { useEffect, useRef } from 'react';

// Polls /api/version every 5 minutes and forces a hard reload when the
// build ID changes — prevents "Failed to find Server Action" errors after deploys.
export function useVersionGuard(intervalMs = 5 * 60 * 1000) {
  const buildIdRef = useRef<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        const { buildId } = await res.json();
        if (buildIdRef.current === null) {
          buildIdRef.current = buildId;
        } else if (buildIdRef.current !== buildId) {
          window.location.reload();
        }
      } catch {
        // ignore network errors
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
