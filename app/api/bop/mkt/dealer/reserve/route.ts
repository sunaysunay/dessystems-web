import { NextRequest, NextResponse } from 'next/server';
import {
  reserveListing,
  confirmReservation,
  completeWithFee,
  cancelReservation,
  getReservations,
  expireStale,
} from '@/lib/mkt/reserved-listing';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkt/dealer/reserve?dealer_id=&status=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const dealerId = sp.get('dealer_id') ?? undefined;
  const status = sp.get('status') ?? undefined;

  // Expire stale reservations on every read
  expireStale();

  const reservations = getReservations(dealerId, status);
  return NextResponse.json({ reservations });
}

// POST /api/bop/mkt/dealer/reserve  { listing_id, dealer_id, success_fee_pct? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listing_id, dealer_id, success_fee_pct } = body ?? {};

    if (!listing_id || !dealer_id) {
      return NextResponse.json(
        { error: 'listing_id and dealer_id are required' },
        { status: 400 },
      );
    }

    const reservation = reserveListing(listing_id, dealer_id, success_fee_pct);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PATCH /api/bop/mkt/dealer/reserve  { id, action: 'confirm'|'complete'|'cancel', trade_amount? }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, trade_amount } = body ?? {};

    if (!id || !action) {
      return NextResponse.json(
        { error: 'id and action are required' },
        { status: 400 },
      );
    }

    let reservation;
    switch (action) {
      case 'confirm':
        reservation = confirmReservation(id);
        break;
      case 'complete':
        if (trade_amount == null) {
          return NextResponse.json(
            { error: 'trade_amount is required for complete action' },
            { status: 400 },
          );
        }
        reservation = completeWithFee(id, trade_amount);
        break;
      case 'cancel':
        reservation = cancelReservation(id);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action "${action}"` },
          { status: 400 },
        );
    }

    return NextResponse.json({ reservation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
