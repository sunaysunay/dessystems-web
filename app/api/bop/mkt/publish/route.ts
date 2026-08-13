// app/api/bop/mkt/publish/route.ts — Phase 1 publish targets (telegram/blog/record)
// Copy & Download are client-side; this handles server-side sends and logging.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
export const dynamic = 'force-dynamic';

// POST { output_id, platform: 'telegram'|'blog', publish_at? }
export async function POST(req: NextRequest) {
  if (!await callerUid()) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const sb = getServerClient();
  const { output_id, platform, publish_at } = await req.json();
  if (!output_id || !platform) return NextResponse.json({ error: 'output_id, platform required' }, { status: 400 });

  const { data: out } = await sb.from('bop_mkt_outputs').select('*').eq('id', output_id).maybeSingle();
  if (!out) return NextResponse.json({ error: 'output not found' }, { status: 404 });
  if (out.status !== 'approved') return NextResponse.json({ error: 'output must be approved before publishing' }, { status: 409 });

  // scheduled → just record intent; a worker publishes later
  if (publish_at && new Date(publish_at) > new Date()) {
    const { data } = await sb.from('bop_mkt_publications').insert({ output_id, platform, publish_at, status: 'scheduled' }).select().single();
    await sb.from('bop_mkt_outputs').update({ status: 'scheduled' }).eq('id', output_id);
    return NextResponse.json({ publication: data, scheduled: true });
  }

  let status = 'published', external_url: string | null = null, api_response: any = {};
  try {
    if (platform === 'telegram') {
      const token = process.env.BOP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      const chat = process.env.BOP_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
      if (!token || !chat) throw new Error('telegram not configured (BOP_TELEGRAM_BOT_TOKEN / BOP_TELEGRAM_CHAT_ID)');
      const text = [out.subject, out.body, (out.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: false }),
      });
      api_response = await r.json();
      if (!api_response.ok) throw new Error('telegram: ' + JSON.stringify(api_response));
      external_url = `https://t.me/${String(chat).replace('@', '')}`;
    } else if (platform === 'blog') {
      // Phase 1: record as published; real CMS insert wired in Phase 2.
      api_response = { note: 'recorded — CMS publish wired in Phase 2' };
    } else {
      return NextResponse.json({ error: `unsupported platform '${platform}' in Phase 1` }, { status: 400 });
    }
  } catch (e: any) {
    const { data } = await sb.from('bop_mkt_publications').insert({ output_id, platform, status: 'failed', api_response: { error: e.message } }).select().single();
    return NextResponse.json({ publication: data, error: e.message }, { status: 502 });
  }

  const { data: pub } = await sb.from('bop_mkt_publications').insert({
    output_id, platform, status, external_url, published_at: new Date().toISOString(), api_response,
  }).select().single();
  await sb.from('bop_mkt_outputs').update({ status: 'published' }).eq('id', output_id);
  if (platform === 'telegram') {
    const { data: o2 } = await sb.from('bop_mkt_outputs').select('campaign_id').eq('id', output_id).single();
    if (o2?.campaign_id) await sb.from('bop_mkt_campaigns').update({ telegram_sent: true }).eq('id', o2.campaign_id);
  }
  return NextResponse.json({ publication: pub });
}
