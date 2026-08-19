import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 });

  const supabase = getServerClient();
  const { data: key } = await supabase.from('shop_api_keys').select('id').eq('key', apiKey).eq('active', true).single();
  if (!key) return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });

  const { data, error } = await supabase.from('shop_webhooks').select('*').eq('api_key_id', key.id).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 });

  const supabase = getServerClient();
  const { data: key } = await supabase.from('shop_api_keys').select('id').eq('key', apiKey).eq('active', true).single();
  if (!key) return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });

  const body = await req.json();
  const { url, events } = body;
  if (!url || !events?.length) return NextResponse.json({ error: 'url and events[] required' }, { status: 400 });

  const validEvents = ['order.created', 'order.updated', 'order.cancelled', 'stock.low', 'stock.updated', 'product.created', 'product.updated', 'return.created', 'payment.failed'];
  const invalid = events.filter((e: string) => !validEvents.includes(e));
  if (invalid.length) return NextResponse.json({ error: `Invalid events: ${invalid.join(', ')}. Valid: ${validEvents.join(', ')}` }, { status: 400 });

  const { data, error } = await supabase.from('shop_webhooks').insert({
    api_key_id: key.id,
    url,
    events,
    active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 });

  const supabase = getServerClient();
  const { data: key } = await supabase.from('shop_api_keys').select('id').eq('key', apiKey).eq('active', true).single();
  if (!key) return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const webhookId = sp.get('id');
  if (!webhookId) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { error } = await supabase.from('shop_webhooks').delete().eq('id', webhookId).eq('api_key_id', key.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
