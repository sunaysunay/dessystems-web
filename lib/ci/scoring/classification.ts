// CI-T30 — Classification quadrants + lifecycle FSM
// Products are classified into quadrants by (score, trend).
// Lifecycle FSM prevents oscillation: state changes require
// N consecutive nights in the target state.

export type Quadrant = 'star' | 'workhorse' | 'hidden_opportunity' | 'underperformer' | 'dead_stock';

export interface Classification {
  quadrant: Quadrant;
  score: number;
  trend: number;
}

export const SCORE_THRESHOLD = 50;
export const TREND_THRESHOLD = 0;

export function classifyProduct(score: number, trend: number): Quadrant {
  if (score >= SCORE_THRESHOLD && trend >= TREND_THRESHOLD) return 'star';
  if (score >= SCORE_THRESHOLD && trend < TREND_THRESHOLD) return 'workhorse';
  if (score < SCORE_THRESHOLD && trend >= TREND_THRESHOLD) return 'hidden_opportunity';
  return 'underperformer';
}

export type LifecycleState =
  | 'new'
  | 'growing'
  | 'mature'
  | 'declining'
  | 'dead_stock'
  | 'revived';

export interface LifecycleFSM {
  current_state: LifecycleState;
  consecutive_nights: number;
  pending_state: LifecycleState | null;
}

export const TRANSITION_THRESHOLD = 3;

const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  new:         ['growing', 'declining', 'dead_stock'],
  growing:     ['mature', 'declining'],
  mature:      ['declining', 'growing'],
  declining:   ['dead_stock', 'revived'],
  dead_stock:  ['revived'],
  revived:     ['growing', 'declining'],
};

export function deriveTargetState(quadrant: Quadrant, daysSinceFirstSale: number): LifecycleState {
  if (daysSinceFirstSale < 30) return 'new';
  if (quadrant === 'dead_stock') return 'dead_stock';
  if (quadrant === 'star' || quadrant === 'hidden_opportunity') return 'growing';
  if (quadrant === 'workhorse') return 'mature';
  return 'declining';
}

export function advanceFSM(fsm: LifecycleFSM, target: LifecycleState): LifecycleFSM {
  if (target === fsm.current_state) {
    return { current_state: fsm.current_state, consecutive_nights: 0, pending_state: null };
  }

  const allowed = VALID_TRANSITIONS[fsm.current_state];
  if (!allowed?.includes(target)) {
    return { ...fsm, pending_state: null, consecutive_nights: 0 };
  }

  if (fsm.pending_state === target) {
    const nights = fsm.consecutive_nights + 1;
    if (nights >= TRANSITION_THRESHOLD) {
      return { current_state: target, consecutive_nights: 0, pending_state: null };
    }
    return { current_state: fsm.current_state, consecutive_nights: nights, pending_state: target };
  }

  return { current_state: fsm.current_state, consecutive_nights: 1, pending_state: target };
}

export function classifyWithLifecycle(
  score: number,
  trend: number,
  daysSinceFirstSale: number,
  fsm: LifecycleFSM,
): { quadrant: Quadrant; lifecycle: LifecycleFSM } {
  const quadrant = classifyProduct(score, trend);
  const target = deriveTargetState(quadrant, daysSinceFirstSale);
  const newFsm = advanceFSM(fsm, target);
  return { quadrant, lifecycle: newFsm };
}
