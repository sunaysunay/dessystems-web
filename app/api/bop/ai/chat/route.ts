import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Agent = {
  name: string; provider: string; model: string; api_key: string;
  base_url?: string | null; system_prompt?: string | null;
  max_tokens?: number | null; temperature?: number | null;
};
type Msg = { role: string; content: string };

export async function GET() {
  const supabase = getServerClient();
  const { data: a } = await supabase
    .from('bop_ai_agents')
    .select('name, provider, model, api_key')
    .eq('is_active', true)
    .maybeSingle();
  return NextResponse.json({
    configured: !!(a && a.api_key),
    agent: a?.name ?? null,
    provider: a?.provider ?? null,
    model: a?.model ?? null,
  });
}

async function callAnthropic(agent: Agent, system: string, messages: Msg[]) {
  const r = await fetch(`${agent.base_url ?? 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': agent.api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: agent.model, max_tokens: agent.max_tokens ?? 1024, system,
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ configured: true, error: true, reply: `AI error: ${j?.error?.message ?? r.status}` });
  const reply = Array.isArray(j.content) ? j.content.map((c: { text?: string }) => c.text ?? '').join('') : '(no response)';
  return NextResponse.json({ configured: true, reply, agent: agent.name, model: agent.model });
}

async function callGemini(agent: Agent, system: string, messages: Msg[]) {
  const base = (agent.base_url ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const r = await fetch(`${base}/v1beta/models/${agent.model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': agent.api_key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: agent.max_tokens ?? 1024, temperature: agent.temperature ?? 0.3 },
    }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ configured: true, error: true, reply: `AI error: ${j?.error?.message ?? r.status}` });
  const reply = ((j.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map(p => p.text ?? '').join('') || '(no response)';
  return NextResponse.json({ configured: true, reply, agent: agent.name, model: agent.model });
}

async function callOpenAI(agent: Agent, system: string, messages: Msg[]) {
  const r = await fetch(`${agent.base_url ?? 'https://api.openai.com'}/v1/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${agent.api_key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: agent.model, temperature: agent.temperature ?? 0.3, max_tokens: agent.max_tokens ?? 1024,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ configured: true, error: true, reply: `AI error: ${j?.error?.message ?? r.status}` });
  return NextResponse.json({ configured: true, reply: j.choices?.[0]?.message?.content ?? '(no response)', agent: agent.name, model: agent.model });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json() as { messages?: Msg[]; screen?: string; agent_id?: string };
  const messages: Msg[] = body.messages ?? [];
  const screen: string | null = body.screen ?? null;

  let q = supabase.from('bop_ai_agents').select('*');
  q = body.agent_id ? q.eq('id', body.agent_id) : q.eq('is_active', true);
  const { data: agent } = await q.maybeSingle();

  if (!agent || !agent.api_key) {
    return NextResponse.json({
      configured: false,
      reply: 'No AI agent is configured yet. Add an agent with credentials in the `bop_ai_agents` table and set `is_active = true`.',
    });
  }

  let grounding = '';
  if (screen) {
    const { data: docs } = await supabase
      .from('bop_documentation')
      .select('doc_type, title, body_md')
      .eq('target_type', 'screen').eq('target_id', screen).eq('status', 'active');
    if (docs?.length) {
      grounding = `\n\n--- Documentation for the screen the user is on (${screen}) ---\n` +
        docs.map(d => `[${d.doc_type}] ${d.title ?? ''}: ${d.body_md ?? ''}`).join('\n');
    }
  }
  const system = (agent.system_prompt ?? '') + grounding;

  try {
    if (agent.provider === 'anthropic') return callAnthropic(agent as Agent, system, messages);
    if (agent.provider === 'google' || agent.provider === 'gemini') return callGemini(agent as Agent, system, messages);
    return callOpenAI(agent as Agent, system, messages);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ configured: true, error: true, reply: `AI request failed: ${msg}` });
  }
}
