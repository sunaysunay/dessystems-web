import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// POST /api/bop/comm/ai/action — improve|luxury|shorter|translate|generate_locales
// Governing docs: EmailComposer.spec.md §5 (aiAction contract) +
// BOP_COMM_CENTER_PLAN.md §5/§8#1 (generate_locales, the fold-in extension).
//
// Reuses bop_ai_agents — the SAME table and provider-dispatch pattern already
// live in /api/bop/ai/chat (anthropic/google, active-agent fallback,
// "not configured" graceful response) — no new AI infra invented here.
//
// Constraint from the spec: AI edits only the editable body/heading text,
// never structure/branding, and must not emit new {{...}} tokens outside the
// template's already-declared variable set. Enforced here by only ever
// sending the plain body text to the model (never the compiled HTML) and by
// prompting explicitly to preserve any {{Namespace.Key}} tokens verbatim.

type AiAction = 'improve' | 'luxury' | 'shorter' | 'translate' | 'generate_locales';

const ACTION_PROMPTS: Record<Exclude<AiAction, 'translate' | 'generate_locales'>, string> = {
  improve: 'Improve this marketing email copy — clearer, more persuasive, same length roughly. Keep every {{Namespace.Key}} token EXACTLY as written, do not translate or alter them. Return only the revised text, no preamble.',
  luxury: 'Rewrite this copy in a more premium, luxury tone — editorial, confident, understated. Keep every {{Namespace.Key}} token EXACTLY as written. Return only the revised text, no preamble.',
  shorter: 'Shorten this copy by roughly half while keeping the key message. Keep every {{Namespace.Key}} token EXACTLY as written. Return only the revised text, no preamble.',
};

async function callAgent(agent: any, system: string, userText: string): Promise<string> {
  if (agent.provider === 'anthropic') {
    const r = await fetch(`${agent.base_url ?? 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': agent.api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: agent.model, max_tokens: agent.max_tokens ?? 1024, system, messages: [{ role: 'user', content: userText }] }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message ?? `AI error ${r.status}`);
    return Array.isArray(j.content) ? j.content.map((c: any) => c.text ?? '').join('') : '';
  }
  if (agent.provider === 'google' || agent.provider === 'gemini') {
    const base = (agent.base_url ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
    const r = await fetch(`${base}/v1beta/models/${agent.model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': agent.api_key },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\n${userText}` }] }] }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message ?? `AI error ${r.status}`);
    return j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  }
  throw new Error(`Unsupported provider "${agent.provider}"`);
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const { action, text, targetLocale, templateId, targetLocales } = body as {
    action: AiAction; text?: string; targetLocale?: string; templateId?: string; targetLocales?: string[];
  };

  const { data: agent } = await supabase.from('bop_ai_agents').select('*').eq('is_active', true).maybeSingle();
  if (!agent || !agent.api_key) {
    return NextResponse.json({ configured: false, error: 'No AI agent configured — set one active with credentials in bop_ai_agents (see sql/bop_v2/10_ai_agents.sql).' }, { status: 200 });
  }

  try {
    if (action === 'translate') {
      if (!text || !targetLocale) return NextResponse.json({ error: 'text and targetLocale are required' }, { status: 400 });
      const system = `Translate this email copy to locale "${targetLocale}". Keep every {{Namespace.Key}} token EXACTLY as written — never translate the token itself, only surrounding text. Return only the translated text, no preamble.`;
      const result = await callAgent(agent, system, text);
      return NextResponse.json({ configured: true, result: result.trim() });
    }

    if (action === 'generate_locales') {
      // Plan §5: takes the canonical template row, proposes NEW rows for each
      // target locale that doesn't already exist — never overwrites an
      // existing (possibly human-edited) translation.
      if (!templateId || !targetLocales?.length) return NextResponse.json({ error: 'templateId and targetLocales are required' }, { status: 400 });
      const { data: source } = await supabase.from('bop_comm_template').select('*').eq('id', templateId).maybeSingle();
      if (!source) return NextResponse.json({ error: 'source template not found' }, { status: 404 });

      const { data: existing } = await supabase.from('bop_comm_template')
        .select('locale').eq('tenant_id', source.tenant_id).eq('category', source.category).in('locale', targetLocales);
      const already = new Set((existing ?? []).map(r => r.locale));
      const toGenerate = targetLocales.filter(l => !already.has(l));

      const created: string[] = [];
      const skipped = [...already];
      for (const locale of toGenerate) {
        const fields = ['subject', 'preheader', 'block_eyebrow', 'block_heading', 'block_body', 'cta_label'] as const;
        const translated: Record<string, string> = {};
        for (const f of fields) {
          if (!source[f]) { translated[f] = source[f]; continue; }
          const system = `Translate this email field to locale "${locale}". Keep every {{Namespace.Key}} token EXACTLY as written. Return only the translated text, no preamble.`;
          translated[f] = (await callAgent(agent, system, source[f])).trim();
        }
        await supabase.from('bop_comm_template').insert({
          tenant_id: source.tenant_id, category: source.category, context_type: source.context_type,
          master_style_code: source.master_style_code, locale, is_active: source.is_active,
          cta_url_pattern: source.cta_url_pattern, smart_objects: source.smart_objects, cta_rules: source.cta_rules,
          ...translated,
        });
        created.push(locale);
      }
      return NextResponse.json({ configured: true, created, skipped });
    }

    // improve | luxury | shorter
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });
    const prompt = ACTION_PROMPTS[action as keyof typeof ACTION_PROMPTS];
    if (!prompt) return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    const result = await callAgent(agent, prompt, text);
    return NextResponse.json({ configured: true, result: result.trim() });
  } catch (err) {
    console.error('[api/bop/comm/ai/action]', err);
    return NextResponse.json({ configured: true, error: err instanceof Error ? err.message : 'AI action failed' }, { status: 500 });
  }
}
