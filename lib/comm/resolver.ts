import { getServerClient } from '@/lib/supabase-server';
import type { ContextData } from './context-bindings';

// BOP V2 Communication Center — variable resolver + tenant/locale fallback chain.
// Governing doc: BOP_COMM_CENTER_PLAN.md §2/§4. Pure, auditable, injection-safe —
// no template engine, flat {{Namespace.Key}} token replace only.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currentTokens(): Record<string, string> {
  const now = new Date();
  return {
    Date: now.toLocaleDateString('en-GB'),
    Year: String(now.getFullYear()),
    Time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

export interface ResolveResult { html: string; missing: string[] }

// Template-authored fields (subject, block content, CTA label) can themselves
// contain {{Vehicle.X}}-style tokens (e.g. subject: "Your {{Vehicle.Brand}}
// offer"). Those must resolve against ctx.scope BEFORE being handed to the
// main resolveVariables() pass as `extras` — resolveVariables does a single
// regex pass and does not recursively re-scan substituted values, so an
// unresolved token inside an extras value survives verbatim into the final
// HTML (caught live: the compiled <mj-title> showed literal
// "{{Vehicle.Brand}} {{Vehicle.Model}}" until this was fixed). Callers (send.ts,
// compose/preview) should use this instead of passing raw template.* strings.
export function resolveTemplateFields(
  t: Record<string, any>,
  scope: ContextData['scope']
): { fields: Record<string, string>; missing: string[] } {
  const keys: [string, string | null][] = [
    ['Block.Eyebrow', t.block_eyebrow], ['Block.Heading', t.block_heading], ['Block.Body', t.block_body],
    ['Cta.Label', t.cta_label], ['Email.Subject', t.subject], ['Email.Preheader', t.preheader],
  ];
  const fields: Record<string, string> = {};
  const missing: string[] = [];
  for (const [name, raw] of keys) {
    const r = resolveVariables(raw ?? '', scope);
    fields[name] = r.html;
    missing.push(...r.missing);
  }
  return { fields, missing };
}

// {{Vehicle.Price}} -> scope.Vehicle.Price ; unknown token -> '' + logged in `missing`.
// ALWAYS escapes resolved values — customer-supplied names/content are untrusted.
export function resolveVariables(
  html: string,
  scope: ContextData['scope'],
  extras: Record<string, string> = {}
): ResolveResult {
  const missing: string[] = [];
  const current = currentTokens();

  const out = html.replace(/\{\{\s*([A-Za-z]+)\.([A-Za-z]+)\s*\}\}/g, (_m, ns: string, key: string) => {
    if (ns === 'Current') return escapeHtml(current[key] ?? '');
    const extraKey = `${ns}.${key}`;
    if (extras[extraKey] !== null) return escapeHtml(extras[extraKey]);
    const v = scope?.[ns]?.[key];
    if (v === null) {
      missing.push(extraKey);
      return '';
    }
    return escapeHtml(v);
  });

  // Any surviving $TOKEN means branding injection (stage 1) didn't run before
  // this resolver — that's a server-stage bug, not a missing content variable.
  const strayBranding = out.match(/\$[A-Z_]+/g);
  if (strayBranding?.length) {
    throw new Error(`resolveVariables: unresolved branding token(s) survived to stage 3: ${strayBranding.join(', ')} — branding injection must run before mjml compile`);
  }

  return { html: out, missing };
}

// ── Tenant + locale fallback chain (mirrors resolveBopEmail's live pattern) ──
// pick(tenantId, code) ?? pick(0, code)                                  — styles
// pick(tenantId, category, locale) ?? pick(tenantId, category, 'en')
//   ?? pick(0, category, locale) ?? pick(0, category, 'en')              — templates

export async function resolveMasterStyle(tenantId: number, code: string) {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('bop_comm_master_style')
    .select('*')
    .in('tenant_id', [tenantId, 0])
    .eq('code', code)
    .eq('is_active', true);

  const rows = data ?? [];
  return rows.find(r => r.tenant_id === tenantId) ?? rows.find(r => r.tenant_id === 0) ?? null;
}

export async function resolveTemplate(tenantId: number, category: string, locale: string) {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('bop_comm_template')
    .select('*')
    .in('tenant_id', [tenantId, 0])
    .eq('category', category)
    .in('locale', [locale, 'en'])
    .eq('is_active', true);

  const rows = data ?? [];
  const pick = (t: number, l: string) => rows.find(r => r.tenant_id === t && r.locale === l);
  return pick(tenantId, locale) ?? pick(tenantId, 'en') ?? pick(0, locale) ?? pick(0, 'en') ?? null;
}

export async function resolveBranding(tenantId: number, brandId = 'default') {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('bop_comm_branding')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('brand_id', brandId)
    .maybeSingle();
  return data ?? null;
}
