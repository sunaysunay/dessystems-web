// app/api/bop/mkt/generate/route.ts
// One grounded LLM call → outputs for every channel×locale. Saves generation
// (with prompt/context snapshots) + outputs. Optional cheap verification pass.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
import {
  loadBrandProfile, loadChannelSpecs, buildBopListingContext,
  buildSystemPrompt, buildUserPrompt, parseOutputs,
  buildVerifyPrompt, parseWarnings, type Channel, type ListingContext,
} from '@/lib/bop-mkt';

export const dynamic = 'force-dynamic';

// Minimal provider dispatch over a bop_ai_agents row.
async function callAgent(agent: any, system: string, user: string): Promise<{ text: string; tokens_in?: number; tokens_out?: number }> {
  const provider = (agent.provider || 'anthropic').toLowerCase();
  const model = agent.model;
  const max_tokens = agent.max_tokens ?? 4000;
  // temperature is deprecated on newer Claude models (sonnet-5+); only send to openai-compatible.
  const temperature = agent.temperature ?? 0.5;

  if (provider === 'anthropic') {
    const r = await fetch((agent.base_url || 'https://api.anthropic.com') + '/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': agent.api_key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
    const j = await r.json();
    // newer Claude models return a thinking block before the text block — join all text blocks
    const text = Array.isArray(j.content) ? j.content.map((c: any) => c.text ?? '').join('') : '';
    return { text, tokens_in: j.usage?.input_tokens, tokens_out: j.usage?.output_tokens };
  }
  if (provider === 'google' || provider === 'gemini') {
    const base = (agent.base_url || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
    const r = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': agent.api_key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: max_tokens, temperature },
      }),
    });
    if (!r.ok) throw new Error(`google ${r.status}: ${await r.text()}`);
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text ?? '').join('');
    return { text, tokens_in: j.usageMetadata?.promptTokenCount, tokens_out: j.usageMetadata?.candidatesTokenCount };
  }
  // openai-compatible (openai | azure | custom) — matches /api/bop/ai/chat convention
  const base = agent.base_url || 'https://api.openai.com';
  const r = await fetch(base.replace(/\/$/, '') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${agent.api_key}` },
    body: JSON.stringify({ model, temperature, max_tokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`${provider} ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content ?? '', tokens_in: j.usage?.prompt_tokens, tokens_out: j.usage?.completion_tokens };
}

export async function POST(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const sb = getServerClient();
  const b = await req.json();

  const tenantId: number = Number(b.tenant_id);
  const channels: Channel[] = b.channels || [];
  const locales: string[] = b.locales || [];
  if (!tenantId || !channels.length || !locales.length)
    return NextResponse.json({ error: 'tenant_id, channels, locales required' }, { status: 400 });

  // active agent
  const { data: agent } = await sb.from('bop_ai_agents').select('*').eq('is_active', true).maybeSingle();
  if (!agent) return NextResponse.json({ error: 'no active AI agent (configure in AI005)' }, { status: 400 });

  // context (listing-grounded or manual)
  let ctx: ListingContext | null = null;
  if (b.listing_id && (b.source_type ?? 'listing') !== 'manual' && b.listing_source === 'bop') {
    ctx = await buildBopListingContext(sb, b.listing_id, locales[0]);
  } else if (b.listing_context) {
    ctx = b.listing_context;   // caller (e.g. descamper *2) supplies its own context
  }

  const brand = await loadBrandProfile(sb, tenantId);
  const specs = await loadChannelSpecs(sb, channels);
  const system = buildSystemPrompt(brand, specs);
  const user = buildUserPrompt(ctx, {
    objective: b.objective, target_audience: b.target_audience,
    channels, locales, toneOverride: b.tone, manualPrompt: b.manual_prompt,
  });

  // upsert campaign
  let campaignId: string = b.campaign_id;
  if (!campaignId) {
    const { data: c, error: ce } = await sb.from('bop_mkt_campaigns').insert({
      tenant_id: tenantId, name: b.name || `Campaign ${new Date().toISOString().slice(0, 10)}`,
      objective: b.objective, source_type: b.source_type || (ctx ? 'listing' : 'manual'),
      listing_id: b.listing_id || null, listing_source: b.listing_source || 'bop',
      target_audience: b.target_audience, languages: locales, channels, status: 'generating', created_by: uid,
    }).select('id').single();
    if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
    campaignId = c.id;
  } else {
    await sb.from('bop_mkt_campaigns').update({ status: 'generating' }).eq('id', campaignId);
  }

  // generate
  let text: string, usage: any;
  try {
    const res = await callAgent(agent, system, user); text = res.text; usage = res;
  } catch (e: any) {
    await sb.from('bop_mkt_campaigns').update({ status: 'failed', error_message: e.message }).eq('id', campaignId);
    return NextResponse.json({ error: e.message, campaign_id: campaignId }, { status: 502 });
  }

  const { data: gen } = await sb.from('bop_mkt_generations').insert({
    campaign_id: campaignId, listing_id: b.listing_id || null, agent_id: agent.id,
    model: agent.model, provider: agent.provider,
    prompt_snapshot: { system, user }, context_snapshot: ctx || {},
    tokens_in: usage.tokens_in, tokens_out: usage.tokens_out, created_by: uid,
  }).select('id').single();

  let outputs;
  try { outputs = parseOutputs(text); }
  catch (e: any) {
    await sb.from('bop_mkt_generations').update({ status: 'error', error: e.message }).eq('id', gen!.id);
    await sb.from('bop_mkt_campaigns').update({ status: 'failed', error_message: 'parse: ' + e.message }).eq('id', campaignId);
    return NextResponse.json({ error: 'could not parse model output', raw: text?.slice(0, 500), campaign_id: campaignId }, { status: 502 });
  }

  // optional verification pass (best-effort, non-blocking on failure)
  let warnings: Record<string, any[]> = {};
  if (b.verify !== false) {
    try {
      const vp = buildVerifyPrompt(ctx, outputs);
      const vr = await callAgent(agent, vp.system, vp.user);
      for (const w of parseWarnings(vr.text)) (warnings[`${w.channel}|${w.locale}`] ||= []).push(w);
    } catch { /* verification is advisory */ }
  }

  const rows = outputs.map(o => ({
    generation_id: gen!.id, campaign_id: campaignId, channel: o.channel, locale: o.locale,
    subject: o.subject, body: o.body, hashtags: o.hashtags, cta: o.cta, image_prompt: o.image_prompt,
    verify_warnings: warnings[`${o.channel}|${o.locale}`] || [],
  }));
  await sb.from('bop_mkt_outputs').insert(rows);
  await sb.from('bop_mkt_campaigns').update({ status: 'review' }).eq('id', campaignId);

  return NextResponse.json({ campaign_id: campaignId, generation_id: gen!.id, count: rows.length, outputs: rows });
}
