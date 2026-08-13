import nodemailer from 'nodemailer';
import { getServerClient } from '@/lib/supabase-server';
import { CONTEXT_BINDINGS, type ContextType } from './context-bindings';
import { resolveVariables, resolveTemplateFields } from './resolver';
import { getCompiledTemplate } from './compile';

// BOP V2 Communication Center — send flow (Phase 6).
// Governing doc: BOP_COMM_CENTER_PLAN.md §2/§4/§8.
//
// DEVIATION FROM THE SUPPLIED SPEC, FLAGGED: EmailComposer.spec.md assumes
// Resend as the provider (resend.emails.send, Resend webhooks). The platform's
// actual live sending infra is nodemailer/SMTP (Zoho) — lib/bop-mailer.ts, the
// dessystems.io contact form, and the existing bop_email_* system all use it.
// Introducing Resend would mean a brand-new provider/API-key/billing
// relationship nothing else here uses. send() below uses nodemailer instead.
// One real cost: Resend gives open/click tracking for free via webhook; plain
// SMTP does not. opened_at/clicked_at stay in the schema (already documented
// as "best-effort only, never assumed") but go unpopulated until either a
// tracking-pixel/link-rewrite layer is added, or Resend is deliberately
// adopted later as a dedicated transactional provider — a decision for the
// user, not something to default into silently.

export class UnboundVariablesError extends Error {
  constructor(public missing: string[]) {
    super(`Missing variables, send blocked: ${missing.join(', ')}`);
  }
}

export interface SendInput {
  contextType: ContextType;
  recordId: string;
  tenantId: number;
  category: string;
  locale: string;
  brandId?: string;
  toOverride?: { to: string; name?: string }[]; // e.g. composer lets the user pick a different recipient than the loader default
}

// Cheap, deterministic Pre-Send Quality Gate (plan §8 idea #3). Soft flags
// only — never blocks a send. The AI-driven tone/locale-format checks arrive
// with Phase 13's AI actions; this is the non-AI heuristic half, real today.
function qualityCheck(subject: string): string[] {
  const flags: string[] = [];
  if (subject === subject.toUpperCase() && /[A-Z]{4,}/.test(subject)) flags.push('subject_all_caps');
  if ((subject.match(/!/g) ?? []).length >= 2) flags.push('subject_excessive_punctuation');
  if (subject.trim().length === 0) flags.push('subject_empty');
  return flags;
}

function getSmtpTransport() {
  // Reuses the platform's existing SMTP env vars (same Zoho relay as
  // lib/bop-mailer.ts). bop_comm_branding.smtp_account_id is reserved for a
  // future per-brand SMTP account table (plan §7 open item) — until that
  // exists, every tenant sends through the same platform relay.
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('SMTP not configured');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.eu',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const IDENTITY_MAP: Record<string, string> = {
  crm_lead: 'LEADS',
  vehicle: 'LEADS',
  customer: 'INFO',
  invoice: 'INVOICES',
  listing: 'INFO',
  sell_lead: 'LEADS',
  order: 'ORDERS',
  quotation: 'QUOTES',
  handover: 'ORDERS',
};

export interface SendResult { historyId: string; status: 'sent' | 'failed' }

export async function send(input: SendInput): Promise<SendResult> {
  const supabase = getServerClient();
  const binding = CONTEXT_BINDINGS[input.contextType];
  const brandId = input.brandId ?? 'default';

  const ctx = await binding.loader(input.recordId, input.tenantId);
  if (!ctx) throw new Error(`${input.contextType} record ${input.recordId} not found for tenant ${input.tenantId}`);

  const identityCode = IDENTITY_MAP[input.contextType] ?? 'INFO';
  const { data: identity } = await supabase
    .from('bop_mail_identity')
    .select('from_email, from_name, reply_to, cc_email, bcc_email')
    .eq('tenant_id', input.tenantId)
    .eq('code', identityCode)
    .eq('is_active', true)
    .single();

  const compiled = await getCompiledTemplate(input.tenantId, input.category, input.locale, brandId);
  const t = compiled.templateRow;

  // Stage 3a: fill {{SLOT.Content}} with smart-object HTML (already-escaped
  // block markup) BEFORE variable resolution, so their inner {{...}} resolve
  // in the same pass. Smart-object rendering itself is Phase 14 scope (styles
  // beyond the 2 seeded now don't need it yet) — passthrough until then.
  const slotFilled = compiled.html.replace('<!-- {{SLOT.Content}} -->', '');

  // Stage 3b: resolve. Template-authored fields (subject, block content, CTA
  // label) can themselves contain {{Vehicle.X}} tokens — resolve those against
  // ctx.scope FIRST (resolveTemplateFields), then use the resolved strings as
  // `extras` for the main HTML pass. Passing raw template.* strings directly
  // leaves inner tokens unresolved in the final output (caught live in
  // testing: the compiled <mj-title> showed literal "{{Vehicle.Brand}}" until
  // this was fixed) — extras substitution is a single non-recursive pass.
  const ctaUrl = t.cta_url_pattern
    ? Object.entries(ctx.scope).reduce((u, [ns, kv]) =>
        Object.entries(kv).reduce((uu, [k, v]) => uu.split(`{{${ns}.${k}}}`).join(v), u), t.cta_url_pattern)
    : '';
  const { fields, missing: fieldMissing } = resolveTemplateFields(t, ctx.scope);
  const { html, missing: htmlMissing } = resolveVariables(slotFilled, ctx.scope, { ...fields, 'Cta.Url': ctaUrl });
  const missing = [...new Set([...fieldMissing, ...htmlMissing])];
  const resolvedSubject = fields['Email.Subject'];

  const recipients = input.toOverride ?? ctx.recipients;
  if (!recipients.length) throw new Error('No recipient resolved — pass toOverride or bind a context with an email address');

  const quality = qualityCheck(resolvedSubject);

  // No partial sends: missing content variables hard-block, matching the spec.
  if (missing.length) {
    await supabase.from('bop_comm_history').insert({
      tenant_id: input.tenantId, template_id: compiled.templateId, module: input.contextType,
      record_id: input.recordId, brand_id: brandId, to_email: recipients[0].to, to_name: recipients[0].name,
      subject: resolvedSubject, status: 'failed', missing_vars: missing, quality_flags: quality,
    });
    throw new UnboundVariablesError(missing);
  }

  const transporter = getSmtpTransport();
  const smtpFallback = process.env.SMTP_FROM || `"DES Systems" <${process.env.SMTP_USER}>`;
  const from = identity?.from_name
    ? `"${identity.from_name}" <${identity.from_email}>`
    : identity?.from_email ?? smtpFallback;

  let status: 'sent' | 'failed' = 'sent';
  let providerMessageId: string | undefined;
  try {
    const info = await transporter.sendMail({
      from,
      to: recipients.map(r => r.to).join(', '),
      subject: resolvedSubject,
      html,
      ...(identity?.reply_to ? { replyTo: identity.reply_to } : {}),
      ...(identity?.cc_email ? { cc: identity.cc_email } : {}),
      ...(identity?.bcc_email ? { bcc: identity.bcc_email } : {}),
    });
    providerMessageId = info.messageId;
  } catch (err) {
    status = 'failed';
    console.error('[bop-comm send] failed', err);
  }

  const { data: history } = await supabase.from('bop_comm_history').insert({
    tenant_id: input.tenantId, template_id: compiled.templateId, module: input.contextType,
    record_id: input.recordId, brand_id: brandId,
    to_email: recipients[0].to, to_name: recipients[0].name, subject: resolvedSubject,
    status, provider_message_id: providerMessageId, missing_vars: [], quality_flags: quality,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  }).select('id').single();

  if (!history) throw new Error('Send may have gone out but bop_comm_history insert failed — check logs');
  return { historyId: history.id, status };
}
