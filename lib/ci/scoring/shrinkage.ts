// CI-T26 — Beta-prior shrinkage for rate metrics (spec §6.2).
//
//   adjusted_rate = (successes + k × peer_rate) / (trials + k)
//   confidence    = trials / (trials + k)
//
// Display rules (spec §6.2):
//   confidence < 0.30            → suppress entirely ("Insufficient data (n=…)")
//   0.30 ≤ confidence < 0.60     → show greyed with "provisional" chip
//   confidence ≥ 0.60            → normal display

export interface ShrunkRate {
  adjustedRate: number;
  confidence: number;
  display: 'suppressed' | 'provisional' | 'normal';
  suppressedReason: string | null;
}

/** Shrinkage constants per rate metric (spec §6.2 table). */
export const SHRINKAGE_K: Record<string, number> = {
  cvr_view_to_order: 40, // ~40 views before own rate outweighs category
  cart_rate: 25,         // higher base rate, converges faster
  return_rate: 15,       // high base rate, few trials needed
};

export function shrink(
  successes: number,
  trials: number,
  k: number,
  peerRate: number,
): ShrunkRate {
  if (k < 0 || trials < 0 || successes < 0) {
    throw new Error('shrink: negative inputs');
  }
  const adjustedRate = (successes + k * peerRate) / (trials + k || 1);
  const confidence = trials / (trials + k || 1);

  let display: ShrunkRate['display'];
  if (confidence < 0.3) display = 'suppressed';
  else if (confidence < 0.6) display = 'provisional';
  else display = 'normal';

  return {
    adjustedRate,
    confidence,
    display,
    suppressedReason: display === 'suppressed' ? `Insufficient data (n=${trials})` : null,
  };
}

/** Convenience: shrink a named rate metric using its spec constant. */
export function shrinkMetric(
  metric: keyof typeof SHRINKAGE_K | string,
  successes: number,
  trials: number,
  peerRate: number,
): ShrunkRate {
  const k = SHRINKAGE_K[metric];
  if (k === undefined) throw new Error(`shrinkMetric: no k for '${metric}' — add it to SHRINKAGE_K`);
  return shrink(successes, trials, k, peerRate);
}
