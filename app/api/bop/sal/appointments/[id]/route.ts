import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { renderBopEmail } from '@/lib/bop-email';
import { sendBopMail, smtpConfigured } from '@/lib/bop-mailer';

export const dynamic = 'force-dynamic';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data, error } = await sb
    .from('bop_appointments')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ appointment: data });
}

// PATCH — update status and/or internal_notes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const sendEmail = body.send_email === true;
  const allowed = ['status', 'internal_notes', 'confirmed_at', 'completed_at'];
  const patch: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if (patch.status === 'confirmed' && !('confirmed_at' in body)) {
    patch.confirmed_at = new Date().toISOString();
  }
  if (patch.status === 'completed' && !('completed_at' in body)) {
    patch.completed_at = new Date().toISOString();
  }
  if (patch.status === 'pending') {
    patch.confirmed_at = null;
    patch.completed_at = null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }
  const sb = getServerClient();
  const { data, error } = await sb
    .from('bop_appointments')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let emailSent = false;
  if (sendEmail && data?.email && (patch.status === 'confirmed' || patch.status === 'cancelled')) {
    const emailType = patch.status === 'confirmed' ? 'booking_confirm' : 'booking_cancel';
    try {
      emailSent = await sendStatusEmail(data, emailType);
    } catch (err: any) {
      console.error(`[SA007] ${emailType} email failed:`, err?.message);
    }
  }

  if (patch.status) {
    try {
      const { data: lead } = await sb
        .from('crm_leads')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('source', 'appointment')
        .ilike('title', `%${data.name}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      await sb.from('crm_activities').insert({
        lead_id: lead?.id ?? null,
        type: patch.status === 'confirmed' ? 'note' : 'note',
        subject: `Appointment ${patch.status} — ${data.ref}`,
        body: `Status changed to ${patch.status}${emailSent ? ' (confirmation email sent)' : ''}.\nCustomer: ${data.name} (${data.email ?? '—'})\nDate: ${data.date} ${String(data.time_slot).slice(0, 5)}`,
        actor_email: 'console@dessystems.io',
        done: true,
      });
    } catch (e: any) {
      console.error('[SA007] crm_activities log:', e?.message);
    }
  }

  return NextResponse.json({ appointment: data, emailSent });
}

function fmtDateDMY(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

async function sendStatusEmail(appt: any, emailType: string): Promise<boolean> {
  if (!smtpConfigured()) return false;

  const sb = getServerClient();
  const locale = appt.locale ?? 'en';
  const firstName = (appt.name ?? '').split(/\s/)[0];
  const purposeLabel = (appt.inspection_type ?? '').replace(/_/g, ' ');
  const timeSlot = String(appt.time_slot ?? '').slice(0, 5);
  const dateFormatted = fmtDateDMY(appt.date ?? '');

  const vars: Record<string, string> = {
    ref_code: appt.ref ?? '',
    first_name: firstName,
    booking_date: dateFormatted,
    booking_time: timeSlot,
    service: purposeLabel,
    customer_name: appt.name ?? '',
  };

  const { subject, html, missing } = await renderBopEmail(TENANT_ID, emailType, locale, vars);
  if (missing || !subject) {
    console.warn(`[SA007] ${emailType} template not found for tenant`, TENANT_ID);
    return false;
  }

  let status = 'failed';
  let messageId: string | null = null;
  try {
    messageId = await sendBopMail(appt.email, subject, html);
    status = 'sent';
  } catch (e: any) {
    console.error(`[SA007] sendBopMail failed:`, e?.message);
  }

  try {
    await sb.from('bop_comm_history').insert({
      tenant_id: TENANT_ID,
      module: 'appointment',
      record_id: appt.id,
      to_email: appt.email,
      subject,
      status,
      provider_message_id: messageId,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (e: any) {
    console.error('[SA007] comm_history log failed:', e?.message);
  }

  return status === 'sent';
}
