import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/api-guard';
import { renderBopEmail } from '@/lib/bop-email';
import { sendBopMail, smtpConfigured } from '@/lib/bop-mailer';

export const dynamic = 'force-dynamic';

// POST /api/bop/sys/email/reset-link  { email, tenant_id?, locale?, send? }
// Generates a Supabase recovery link, renders the branded password_reset email,
// and (if SMTP configured & send!==false) sends it. super_admin only.
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden — super_admin only' }, { status: 403 });
  const b = await req.json();
  const email: string = b.email;
  const tenant = Number(b.tenant_id ?? 0);
  const wantSend: boolean = b.send !== false;
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const supabase = getServerClient();

  // Locale: explicit override → the user's own defined language (bop_user_profiles) → 'en'
  let locale: string = b.locale ?? '';
  if (!locale) {
    const { data: prof } = await supabase.from('bop_user_profiles').select('language').eq('email', email).maybeSingle();
    locale = prof?.language || 'en';
  }
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const link = (data as any)?.properties?.action_link ?? null;

  const rendered = await renderBopEmail(tenant, 'password_reset', locale, {
    user_name: email.split('@')[0], user_email: email, action_url: link, reset_link: link,
  });

  let sent = false;
  let sendError: string | null = null;
  if (wantSend && smtpConfigured() && rendered.subject && rendered.html) {
    try { await sendBopMail(email, rendered.subject, rendered.html); sent = true; }
    catch (e: any) { sendError = e.message ?? String(e); }
  }

  await supabase.from('bop_email_log').insert({
    tenant_id: tenant, email_type: 'password_reset', locale, to_email: email,
    subject: rendered.subject, status: sent ? 'sent' : (sendError ? 'failed' : 'generated'),
    provider: smtpConfigured() ? (process.env.SMTP_HOST ?? 'smtp') : 'none',
    error: sendError, meta: { sent, smtp: smtpConfigured() },
  });

  return NextResponse.json({
    link, subject: rendered.subject, html: rendered.html,
    sent, smtp_configured: smtpConfigured(), error: sendError,
  });
}
