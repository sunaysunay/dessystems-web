import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function generateClaimNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CLM-${ts}-${rand}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, claim_type, fault_description, serial_number, product_title, sku, photos } =
    body;

  if (!order_id || !claim_type || !fault_description) {
    return NextResponse.json(
      { error: 'order_id, claim_type, and fault_description are required' },
      { status: 400 },
    );
  }

  const validTypes = ['warranty', 'damage', 'missing_parts', 'carrier_damage', 'other'];
  if (!validTypes.includes(claim_type)) {
    return NextResponse.json({ error: `Invalid claim_type: ${claim_type}` }, { status: 400 });
  }

  const supabase = getServerClient();
  const now = new Date().toISOString();
  const claim_number = generateClaimNumber();

  const { data: claim, error: claimErr } = await supabase
    .from('shop_claims')
    .insert({
      claim_number,
      order_id,
      claim_type,
      fault_description,
      serial_number: serial_number ?? null,
      product_title: product_title ?? null,
      sku: sku ?? null,
      status: 'submitted',
      priority: 'normal',
      submitted_at: now,
    })
    .select()
    .single();

  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });

  if (Array.isArray(photos) && photos.length > 0) {
    const photoRows = photos.map((p: Record<string, unknown>, i: number) => ({
      claim_id: claim.id,
      storage_key: p.storage_key,
      filename: p.filename ?? null,
      content_type: p.content_type ?? null,
      size_bytes: p.size_bytes ?? null,
      sort_order: i,
    }));
    await supabase.from('shop_claim_photos').insert(photoRows);
  }

  await supabase.from('shop_claim_events').insert({
    claim_id: claim.id,
    event_type: 'status_change',
    from_status: null,
    to_status: 'submitted',
  });

  return NextResponse.json({ claim_number: claim.claim_number, claim_id: claim.id }, { status: 201 });
}
