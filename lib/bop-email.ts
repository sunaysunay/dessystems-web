import { getServerClient } from '@/lib/supabase-server';

// Resolve template with fallback chain: (tenant,type,locale) → (tenant,type,en)
//                                       → (0,type,locale) → (0,type,en)
export async function resolveBopEmail(tenantId: number, emailType: string, locale: string) {
  const supabase = getServerClient();

  const [{ data: tmplRows }, { data: brand }, { data: map }] = await Promise.all([
    supabase.from('bop_email_template').select('*')
      .in('tenant_id', [tenantId, 0]).eq('email_type', emailType).in('locale', [locale, 'en']),
    supabase.from('bop_email_brand').select('*').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('bop_email_template_map').select('*').eq('email_type', emailType).maybeSingle(),
  ]);

  const pick = (t: number, l: string) => (tmplRows ?? []).find((r: any) => r.tenant_id === t && r.locale === l);
  const tmpl = pick(tenantId, locale) ?? pick(tenantId, 'en') ?? pick(0, locale) ?? pick(0, 'en') ?? null;

  const layoutKey = map?.base_layout_key ?? 'default';
  const { data: layout } = await supabase.from('bop_email_base_layout').select('*').eq('key', layoutKey).maybeSingle();

  return { tmpl, brand, layout, map };
}

function sub(s: string | null | undefined, vars: Record<string, any>): string {
  if (!s) return '';
  return s.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, k) => (vars[k] ?? '').toString());
}

// Render an email to { subject, html }. `vars` provides {{reset_link}}, {{user_name}}, etc.
export async function renderBopEmail(tenantId: number, emailType: string, locale: string, vars: Record<string, any> = {}) {
  const { tmpl, brand, layout } = await resolveBopEmail(tenantId, emailType, locale);
  if (!tmpl) return { subject: null as string | null, html: '', missing: true };

  const merged = { ...(brand ?? {}), ...vars };  // brand + caller vars visible to {{...}}

  // Build the content block from template fields
  const btn = tmpl.cta_label && vars.action_url
    ? `<p style="margin:22px 0;"><a href="${sub(String(vars.action_url), merged)}" style="display:inline-block;background:${brand?.primary_color ?? '#2b6cff'};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${sub(tmpl.cta_label, merged)}</a></p>`
    : '';
  const line = (v: string | null, style = '') => v ? `<p style="margin:0 0 12px;${style}">${sub(v, merged)}</p>` : '';

  const content =
    line(tmpl.greeting, 'font-weight:600;') +
    line(tmpl.intro_text) +
    btn +
    line(tmpl.body_extra) +
    (tmpl.signoff ? `<p style="margin:18px 0 0;">${sub(tmpl.signoff, merged)}<br><b>${sub(tmpl.team_name, merged)}</b></p>` : '') +
    (tmpl.disclaimer ? `<hr style="border:none;border-top:1px solid #eef0f3;margin:18px 0;"><p style="color:#9ca3af;font-size:12px;margin:0;">${sub(tmpl.disclaimer, merged)}</p>` : '');

  const layoutVars = { ...merged, content, tpl_code: tmpl.valid_until_text ?? '' };
  const html = layout?.html ? sub(layout.html, layoutVars) : content;
  const subject = sub(tmpl.subject, merged);

  return { subject, html, missing: false };
}
