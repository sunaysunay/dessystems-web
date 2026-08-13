import mjml2html from 'mjml';
import { createHash } from 'node:crypto';
import { getServerClient } from '@/lib/supabase-server';
import { resolveMasterStyle, resolveTemplate, resolveBranding } from './resolver';

// BOP V2 Communication Center — 3-stage render pipeline, stages 1+2.
// Governing doc: BOP_COMM_CENTER_PLAN.md §2/§4.
//
//   1. BRANDING   inject bop_comm_branding tokens into master_style.mjml_source -> $TOKENS gone
//   2. COMPILE    await mjml2html(mjml)                                         -> table HTML, {{vars}} intact
//                 (cached per template_id:brand_id:contentHash — compile is
//                 expensive, must never run per recipient)
//   3. RESOLVE    fillSmartObjects then resolveVariables(html, scope)           -> stage 3, in send.ts (Phase 6)

const BRANDING_TOKEN_MAP: Record<string, string> = {
  $LOGO_URL: 'logo_url', $PRIMARY: 'primary_color', $SECONDARY: 'secondary_color',
  $FONT: 'font_stack', $BTN_RADIUS: 'btn_radius', $COMPANY: 'company_name',
  $ADDRESS: 'address', $DOMAIN: 'domain', $SUPPORT_EMAIL: 'support_email', $UNSUB_URL: 'unsub_url',
};

function injectBranding(mjmlSource: string, branding: Record<string, any> | null): string {
  let out = mjmlSource;
  for (const [token, col] of Object.entries(BRANDING_TOKEN_MAP)) {
    const value = branding?.[col] ?? '';
    // split/join, not regex-replace-all — token contains regex metachars ($)
    out = out.split(token).join(String(value));
  }
  return out;
}

function contentHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 24);
}

export interface CompiledTemplate {
  html: string;           // table HTML, {{Vars}} + {{SLOT.Content}} still present
  templateId: string;
  templateRow: Record<string, any>;
  brandId: string;
  tenantId: number;
}

// Stage 1+2, cached. Resolves style/template/branding via the tenant->0
// fallback chain (resolver.ts), injects branding, compiles, writes cache.
export async function getCompiledTemplate(
  tenantId: number,
  category: string,
  locale: string,
  brandId = 'default'
): Promise<CompiledTemplate> {
  const supabase = getServerClient();

  const template = await resolveTemplate(tenantId, category, locale);
  if (!template) throw new Error(`No template found for category="${category}" locale="${locale}" tenant=${tenantId} (checked tenant + platform-default fallback)`);

  const [style, branding] = await Promise.all([
    resolveMasterStyle(tenantId, template.master_style_code),
    resolveBranding(tenantId, brandId),
  ]);
  if (!style) throw new Error(`No master style "${template.master_style_code}" found for tenant=${tenantId} (checked tenant + platform-default fallback)`);

  const hash = contentHash(style.mjml_source + JSON.stringify(branding ?? {}) + JSON.stringify(template));
  const cacheKey = `${template.id}:${brandId}:${hash}`;

  const { data: cached } = await supabase
    .from('bop_comm_compile_cache')
    .select('html')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (cached?.html) {
    return { html: cached.html, templateId: template.id, templateRow: template, brandId, tenantId };
  }

  const brandedMjml = injectBranding(style.mjml_source, branding);
  const result = await mjml2html(brandedMjml, { validationLevel: 'soft' });

  if (result.errors?.length) {
    // soft validation still returns html; log but don't block — matches the
    // masters' own comment ("validationLevel:'soft'"). Hard MJML syntax errors
    // (not soft warnings) would leave html empty, which we do treat as fatal.
    console.warn('[bop-comm compile] mjml soft warnings', category, locale, result.errors.map((e: { formattedMessage: string }) => e.formattedMessage));
  }
  if (!result.html) {
    throw new Error(`mjml2html produced no output for template "${category}"/"${locale}" tenant=${tenantId} — check master style "${template.master_style_code}" for hard syntax errors`);
  }

  await supabase.from('bop_comm_compile_cache').upsert({
    cache_key: cacheKey, tenant_id: tenantId, html: result.html,
  });

  return { html: result.html, templateId: template.id, templateRow: template, brandId, tenantId };
}
