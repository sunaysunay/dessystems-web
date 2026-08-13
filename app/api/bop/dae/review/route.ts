import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// PATCH /api/bop/dae/review  { listing_id, review_status?, notes?, target_price?, contact_made? }
export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json();
  const { listing_id, ...fields } = body;
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  const { error } = await sb
    .from('dae_reviews')
    .upsert({ listing_id, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'listing_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
