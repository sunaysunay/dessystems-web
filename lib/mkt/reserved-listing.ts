// P5-T03  Reserved-listing flow with success fee for CBT dealer module

export interface ReservedListing {
  id: string;
  listing_id: string;
  dealer_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'reserved' | 'confirmed' | 'expired' | 'completed' | 'cancelled';
  success_fee_pct: number;
  success_fee_amount: number | null;
  trade_id: string | null;
}

// ── In-memory store ─────────────────────────────────────────────────────────

const store: Map<string, ReservedListing> = new Map();

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `rl_${Date.now()}_${idCounter}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function get(id: string): ReservedListing {
  const r = store.get(id);
  if (!r) throw new Error(`Reservation ${id} not found`);
  return r;
}

// ── Public API ──────────────────────────────────────────────────────────────

const DEFAULT_FEE_PCT = 2.5;
const RESERVATION_HOURS = 48;

export function reserveListing(
  listingId: string,
  dealerId: string,
  feePct: number = DEFAULT_FEE_PCT,
): ReservedListing {
  const now = new Date();
  const expires = new Date(now.getTime() + RESERVATION_HOURS * 60 * 60 * 1000);

  const reservation: ReservedListing = {
    id: nextId(),
    listing_id: listingId,
    dealer_id: dealerId,
    reserved_at: now.toISOString(),
    expires_at: expires.toISOString(),
    status: 'reserved',
    success_fee_pct: feePct,
    success_fee_amount: null,
    trade_id: null,
  };

  store.set(reservation.id, reservation);
  return reservation;
}

export function confirmReservation(id: string): ReservedListing {
  const r = get(id);
  if (r.status !== 'reserved') {
    throw new Error(`Cannot confirm reservation in status "${r.status}"`);
  }
  r.status = 'confirmed';
  return r;
}

export function completeWithFee(id: string, tradeAmount: number): ReservedListing {
  const r = get(id);
  if (r.status !== 'confirmed') {
    throw new Error(`Cannot complete reservation in status "${r.status}"`);
  }
  r.success_fee_amount = Math.round(tradeAmount * r.success_fee_pct) / 100;
  r.status = 'completed';
  return r;
}

export function cancelReservation(id: string): ReservedListing {
  const r = get(id);
  if (r.status === 'completed') {
    throw new Error('Cannot cancel a completed reservation');
  }
  r.status = 'cancelled';
  return r;
}

export function expireStale(): number {
  const now = Date.now();
  let count = 0;
  for (const r of store.values()) {
    if (r.status === 'reserved' && new Date(r.expires_at).getTime() <= now) {
      r.status = 'expired';
      count += 1;
    }
  }
  return count;
}

export function getReservations(
  dealerId?: string,
  status?: string,
): ReservedListing[] {
  let results = Array.from(store.values());
  if (dealerId) results = results.filter(r => r.dealer_id === dealerId);
  if (status) results = results.filter(r => r.status === status);
  return results.sort(
    (a, b) => new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime(),
  );
}
