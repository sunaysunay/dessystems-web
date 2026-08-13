import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerRole, callerUid } from '@/lib/api-guard';
import { sendBopMail, smtpConfigured } from '@/lib/bop-mailer';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function canAccess() {
  const role = await callerRole();
  return role === 'super_admin' || role === 'platform_admin';
}

// ── GET /api/bop/ds/applications ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await canAccess())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';
  const limit  = Math.min(Number(searchParams.get('limit') ?? 50), 200);

  const query = sb
    .from('dos_dealer_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ applications: data ?? [] });
}

// ── POST /api/bop/ds/applications ─── approve or reject ──────────────────────
export async function POST(req: NextRequest) {
  if (!(await canAccess())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { id, action, review_notes, tenant_id } = body ?? {};

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action (approve|reject) required' }, { status: 400 });
  }

  const sb  = getServerClient();
  const adm = adminClient();

  // Load the application
  const { data: app, error: fetchErr } = await sb
    .from('dos_dealer_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !app) return NextResponse.json({ error: 'application not found' }, { status: 404 });
  if (app.status !== 'pending') return NextResponse.json({ error: 'already reviewed' }, { status: 409 });

  const reviewerEmail = await callerUid(); // uid cookie holds email in this stack

  if (action === 'approve') {
    // 1. Determine or create tenant
    let assignedTenant = tenant_id ?? null;
    if (!assignedTenant) {
      // Auto-assign: next available ID in 300s range (desmobil dealer tier)
      const { data: maxRow } = await sb
        .from('bop_tenants')
        .select('tenant_id')
        .gte('tenant_id', 301)
        .lt('tenant_id', 400)
        .order('tenant_id', { ascending: false })
        .limit(1)
        .single();
      assignedTenant = (maxRow?.tenant_id ?? 300) + 1;

      await adm.from('bop_tenants').insert({
        tenant_id: assignedTenant,
        name: app.company_name ?? app.email.split('@')[0],
        domain: null,
        business_type: 'dealer',
        active: true,
        sort_order: assignedTenant,
      }).select();
    }

    // 2. Update user profile role → dealer_manager, default_tenant → assignedTenant
    if (app.user_id) {
      await adm.from('bop_user_profiles')
        .update({ role: 'dealer_manager', default_tenant: assignedTenant })
        .eq('user_id', app.user_id);

      // Link user to tenant
      await adm.from('bop_user_tenants')
        .upsert({ user_id: app.user_id, tenant_id: assignedTenant, is_default: true },
                 { onConflict: 'user_id,tenant_id' });
    }

    // 3. Mark application approved
    await adm.from('dos_dealer_applications').update({
      status: 'approved',
      tenant_id: assignedTenant,
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
      review_notes: review_notes ?? null,
    }).eq('id', id);

    // 4. Send approval email to applicant
    if (smtpConfigured()) {
      const localeMap: Record<string, { subject: string; greeting: string; body: string; cta: string; note: string }> = {
        nl: {
          subject: 'Uw aanvraag is goedgekeurd — DESMOBIL',
          greeting: `Hallo${app.company_name ? ` ${app.company_name}` : ''},`,
          body: 'Uw zakelijke aanvraag is beoordeeld en goedgekeurd. U heeft nu toegang tot het DESMOBIL Dealer Portal.',
          cta: 'Open Dealer Portal',
          note: 'Log in met uw geregistreerde e-mailadres en het wachtwoord dat u bij de aanvraag heeft ingesteld.',
        },
        de: {
          subject: 'Ihr Antrag wurde genehmigt — DESMOBIL',
          greeting: `Hallo${app.company_name ? ` ${app.company_name}` : ''},`,
          body: 'Ihr Geschäftsantrag wurde geprüft und genehmigt. Sie haben jetzt Zugang zum DESMOBIL Händlerportal.',
          cta: 'Händlerportal öffnen',
          note: 'Melden Sie sich mit Ihrer registrierten E-Mail-Adresse und dem bei der Anmeldung gesetzten Passwort an.',
        },
        fr: {
          subject: 'Votre demande a été approuvée — DESMOBIL',
          greeting: `Bonjour${app.company_name ? ` ${app.company_name}` : ''},`,
          body: 'Votre demande professionnelle a été examinée et approuvée. Vous avez maintenant accès au Portail Concessionnaire DESMOBIL.',
          cta: 'Ouvrir le Portail',
          note: 'Connectez-vous avec votre adresse e-mail enregistrée et le mot de passe défini lors de votre inscription.',
        },
        tr: {
          subject: 'Başvurunuz onaylandı — DESMOBIL',
          greeting: `Merhaba${app.company_name ? ` ${app.company_name}` : ''},`,
          body: 'İşletme başvurunuz incelendi ve onaylandı. Artık DESMOBIL Bayi Portalına erişiminiz var.',
          cta: 'Bayi Portalını Aç',
          note: 'Kayıtlı e-posta adresiniz ve başvuru sırasında belirlediğiniz şifre ile giriş yapabilirsiniz.',
        },
      };
      const l = localeMap[app.locale] ?? {
        subject: 'Your application has been approved — DESMOBIL',
        greeting: `Hello${app.company_name ? ` ${app.company_name}` : ''},`,
        body: 'Your Business application has been reviewed and approved. You now have access to the DESMOBIL Dealer Portal.',
        cta: 'Open Dealer Portal',
        note: 'Log in with your registered email address and the password you set during registration.',
      };

      const portalUrl = process.env.DEALER_PORTAL_URL ?? 'https://bop.dessystems.io';

      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
  <div style="background:#111827;padding:18px 24px;border-radius:10px 10px 0 0">
    <span style="color:#fff;font-size:20px;font-weight:800">DES<span style="color:#ea580c">MOBIL</span></span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;padding:32px">
    <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px">✅</div>
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;text-align:center">Application Approved</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;text-align:center">${app.email}</p>
    <p style="margin:0 0 12px;font-size:14px">${l.greeting}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6">${l.body}</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${portalUrl}" style="display:inline-block;background:#ea580c;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none">${l.cta}</a>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:20px 0">
      <p style="margin:0;font-size:13px;color:#166534;font-weight:600">${l.note}</p>
    </div>
    ${app.company_name ? `<table style="border-collapse:collapse;width:100%;background:#f9fafb;border-radius:8px;margin-top:20px">
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:12px">Company</td><td style="padding:8px 12px;font-size:13px;font-weight:600">${app.company_name}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:12px">Tenant ID</td><td style="padding:8px 12px;font-size:13px;font-weight:600">${assignedTenant}</td></tr>
    </table>` : ''}
    ${review_notes ? `<p style="margin:20px 0 0;font-size:13px;color:#6b7280"><strong>Note from team:</strong> ${review_notes}</p>` : ''}
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:14px">DESMOBIL — European Vehicle Marketplace · desmobil.com</p>
</div>`;

      try { await sendBopMail(app.email, l.subject, html); }
      catch (e: any) { console.error('[ds/applications] approval email failed:', e?.message ?? e); }
    }

    return NextResponse.json({ ok: true, action: 'approved', tenant_id: assignedTenant });

  } else {
    // REJECT
    await adm.from('dos_dealer_applications').update({
      status: 'rejected',
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
      review_notes: review_notes ?? null,
    }).eq('id', id);

    // Send rejection email
    if (smtpConfigured()) {
      const subject = 'Regarding your DESMOBIL dealer application';
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
  <div style="background:#111827;padding:18px 24px;border-radius:10px 10px 0 0">
    <span style="color:#fff;font-size:20px;font-weight:800">DES<span style="color:#ea580c">MOBIL</span></span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:700">Application Update</h1>
    <p style="margin:0 0 12px;font-size:14px">Hello${app.company_name ? ` ${app.company_name}` : ''},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6">Thank you for your interest in the DESMOBIL Dealer Portal. After reviewing your application, we are unable to approve your account at this time.</p>
    ${review_notes ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:20px 0"><p style="margin:0;font-size:13px;color:#991b1b"><strong>Reason:</strong> ${review_notes}</p></div>` : ''}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">If you believe this is an error or wish to reapply, please contact us at <a href="mailto:info@desmobil.com" style="color:#ea580c">info@desmobil.com</a>.</p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:14px">DESMOBIL — European Vehicle Marketplace · desmobil.com</p>
</div>`;
      try { await sendBopMail(app.email, subject, html); }
      catch (e: any) { console.error('[ds/applications] rejection email failed:', e?.message ?? e); }
    }

    return NextResponse.json({ ok: true, action: 'rejected' });
  }
}
