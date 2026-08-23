// CI-T25 — Winsorised percentile normalisation (spec §6.1).
//
// 1. Select peer group P (default: same category × same price band)
// 2. Winsorise x at p1 and p99 of P
// 3. score_component = 100 × (rank(x, P) − 0.5) / |P|
// 4. direction 'lower_better' → 100 − score
// 5. |P| < 12 → widen peer group one level (category → parent → site);
//    the level actually used is recorded by the caller in components.peer_level.
//
// All functions are pure — the engine supplies peer values.

export type Direction = 'higher_better' | 'lower_better';

export const MIN_PEER_GROUP = 12;

/** Linear-interpolated percentile (matches numpy.percentile default). */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Clamp every value (and the subject) into [p1, p99] of the peer set. */
export function winsorise(values: number[]): { clamp: (x: number) => number; p1: number; p99: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const p1 = percentile(sorted, 1);
  const p99 = percentile(sorted, 99);
  return { clamp: (x: number) => Math.min(Math.max(x, p1), p99), p1, p99 };
}

/**
 * Average rank (1-based) of x within peers, ties averaged.
 * `peers` must already be winsorised with the same clamp as x.
 */
export function rank(x: number, peers: number[]): number {
  let below = 0;
  let equal = 0;
  for (const v of peers) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  // average rank across the tie block; x itself is a member of the peer set
  return below + (equal + 1) / 2;
}

export interface PeerScore {
  score: number;          // 0..100
  n: number;              // peer group size used
  p1: number;
  p99: number;
}

/**
 * Score `x` against its peer group. `peers` INCLUDES the subject's own value
 * (the subject is a member of its peer group).
 */
export function scoreInPeerGroup(x: number, peers: number[], direction: Direction = 'higher_better'): PeerScore {
  const n = peers.length;
  if (n === 0) return { score: 50, n: 0, p1: NaN, p99: NaN };

  const { clamp, p1, p99 } = winsorise(peers);
  const wPeers = peers.map(clamp);
  const wx = clamp(x);

  const r = rank(wx, wPeers);
  let score = (100 * (r - 0.5)) / n;
  if (direction === 'lower_better') score = 100 - score;

  return { score: Math.round(score * 10) / 10, n, p1, p99 };
}

export type PeerLevel = 'category_price_band' | 'category' | 'parent_category' | 'site';

const WIDEN_ORDER: PeerLevel[] = ['category_price_band', 'category', 'parent_category', 'site'];

/**
 * Pick the narrowest peer group with |P| ≥ 12, widening one level at a time.
 * `groups` maps level → peer values (levels may be missing). Returns the level
 * used so the engine can store it in components.peer_level.
 */
export function widenPeers(
  groups: Partial<Record<PeerLevel, number[]>>,
): { peers: number[]; level: PeerLevel } {
  for (const level of WIDEN_ORDER) {
    const peers = groups[level];
    if (peers && peers.length >= MIN_PEER_GROUP) return { peers, level };
  }
  // Nothing reaches 12 — use the widest non-empty group.
  for (const level of [...WIDEN_ORDER].reverse()) {
    const peers = groups[level];
    if (peers && peers.length > 0) return { peers, level };
  }
  return { peers: [], level: 'site' };
}
