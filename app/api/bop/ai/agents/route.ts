import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/ai/agents → list (config fields; api_key masked)
export async function GET() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('bop_ai_agents')
    .select('id, name, provider, model, base_url, system_prompt, temperature, max_tokens, is_active, api_key')
    .order('name', { ascending: true });
  const agents = (data ?? []).map(a => ({
    id: a.id, name: a.name, provider: a.provider, model: a.model,
    base_url: a.base_url, system_prompt: a.system_prompt,
    temperature: a.temperature, max_tokens: a.max_tokens, is_active: a.is_active,
    has_key: !!a.api_key, key_last4: a.api_key ? String(a.api_key).slice(-4) : null,
    configured: !!a.api_key,
  }));
  return NextResponse.json({ agents });
}

// POST /api/bop/ai/agents → create
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.name || !b.model) return NextResponse.json({ error: 'name and model are required' }, { status: 400 });
  if (b.is_active) await supabase.from('bop_ai_agents').update({ is_active: false }).eq('is_active', true);
  const { data, error } = await supabase.from('bop_ai_agents').insert({
    name: b.name, provider: b.provider ?? 'anthropic', model: b.model,
    api_key: b.api_key || null, base_url: b.base_url || null,
    system_prompt: b.system_prompt || null,
    temperature: b.temperature ?? 0.3, max_tokens: b.max_tokens ?? 1024,
    is_active: !!b.is_active,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
