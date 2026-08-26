import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TENANT_ID = getTenantId('console');
const OUR_DOMAINS = ['dessystems.io', 'dessystems.com', 'dessystems.nl', 'dessystems.de'];

const IMAP_CONFIG = {
  host: process.env.IMAP_HOST || 'imappro.zoho.eu',
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: {
    user: process.env.IMAP_USER || process.env.SMTP_USER || 'info@dessystems.io',
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || '',
  },
  logger: false,
  connectionTimeout: 15000,
  greetingTimeout: 10000,
};

async function alreadyProcessed(supabase: any, messageId: string | null) {
  if (!messageId) return false;
  const { data } = await supabase
    .from('crm_events')
    .select('id')
    .eq('event_type', 'email.received')
    .filter('payload->>message_id', 'eq', messageId)
    .limit(1);
  return data && data.length > 0;
}

async function findLeadBySubject(supabase: any, subject: string, tenantId: number) {
  const refMatch = subject.match(/\[(?:#)?(?:LD-?)?(\d{3,10})\]/i);
  if (!refMatch) return null;
  const refCode = 'LD' + refMatch[1];
  const { data } = await supabase
    .from('crm_leads')
    .select('id, stage, tenant_id')
    .eq('ref_code', refCode)
    .eq('tenant_id', tenantId)
    .limit(1);
  return data?.[0] ?? null;
}

async function findLeadBySender(supabase: any, email: string, tenantId: number) {
  // Check notes for email
  const { data: noteLeads } = await supabase
    .from('crm_leads')
    .select('id, stage, tenant_id')
    .eq('tenant_id', tenantId)
    .ilike('notes', '%' + email + '%')
    .limit(5);
  if (noteLeads?.length) return noteLeads[0];

  // Check prior outbound emails
  const { data: eventMatch } = await supabase
    .from('crm_events')
    .select('lead_id')
    .eq('event_type', 'email.sent')
    .eq('tenant_id', tenantId)
    .filter('payload->>to', 'eq', email)
    .not('lead_id', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1);
  if (eventMatch?.length) {
    const { data: lead } = await supabase
      .from('crm_leads')
      .select('id, stage, tenant_id')
      .eq('id', eventMatch[0].lead_id)
      .single();
    if (lead) return lead;
  }

  // Check mdm_business_partners
  const { data: partnerLeads } = await supabase
    .from('crm_leads')
    .select('id, stage, tenant_id, partner_id')
    .eq('tenant_id', tenantId)
    .not('partner_id', 'is', null)
    .limit(200);
  if (partnerLeads?.length) {
    const partnerIds = partnerLeads.map((l: any) => l.partner_id).filter(Boolean);
    const { data: partners } = await supabase
      .from('mdm_business_partners')
      .select('id, email')
      .in('id', partnerIds)
      .eq('email', email);
    if (partners?.length) {
      const matched = partnerLeads.find((l: any) => l.partner_id === partners[0].id);
      if (matched) return matched;
    }
  }

  return null;
}

// GET: poll status / last sync info
export async function GET() {
  const supabase = getServerClient();
  const { data: lastEvents } = await supabase
    .from('crm_events')
    .select('id, occurred_at, summary, payload')
    .eq('event_type', 'email.received')
    .order('occurred_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    status: 'ok',
    imap_user: IMAP_CONFIG.auth.user,
    last_received: lastEvents ?? [],
  });
}

// POST: trigger manual sync
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json().catch(() => ({}));
  const tenantId = Number(body.tenant_id) || TENANT_ID;
  const windowHours = Math.min(Number(body.window_hours) || 48, 168);

  if (!IMAP_CONFIG.auth.pass) {
    return NextResponse.json({ error: 'IMAP credentials not configured' }, { status: 500 });
  }

  const client = new ImapFlow(IMAP_CONFIG as any);
  const results = { processed: 0, skipped: 0, unmatched: 0, errors: [] as string[] };

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const uids = await client.search({ since }, { uid: true });
    const batch = (uids || []).slice(0, 80);

    if (!batch.length) {
      await client.logout().catch(() => {});
      return NextResponse.json({ ...results, message: 'No emails in window' });
    }

    const candidates: any[] = [];

    for await (const msg of client.fetch(batch, { envelope: true, source: true }, { uid: true })) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source as any);
      const subject = parsed.subject || '';
      const fromAddress = (parsed.from?.value?.[0]?.address || parsed.from?.text || '').toLowerCase();
      const receivedAt = parsed.date?.toISOString() || new Date().toISOString();
      const messageId = parsed.messageId || null;
      const htmlBody = parsed.html || null;
      const textBody = (parsed.text || '').trim();

      if (OUR_DOMAINS.some(d => fromAddress.endsWith('@' + d))) continue;

      candidates.push({ subject, fromAddress, receivedAt, messageId, htmlBody, textBody: textBody.slice(0, 3000) });
    }

    for (const item of candidates) {
      if (await alreadyProcessed(supabase, item.messageId)) {
        results.skipped++;
        continue;
      }

      let lead = await findLeadBySubject(supabase, item.subject, tenantId);
      if (!lead) lead = await findLeadBySender(supabase, item.fromAddress, tenantId);

      if (!lead) {
        results.unmatched++;
        continue;
      }

      const { error } = await supabase.from('crm_events').insert({
        tenant_id: lead.tenant_id || tenantId,
        lead_id: lead.id,
        event_type: 'email.received',
        actor_type: 'external',
        actor_id: item.fromAddress,
        summary: 'Email from ' + item.fromAddress + ': ' + (item.subject || '(no subject)').slice(0, 200),
        payload: {
          from: item.fromAddress,
          subject: item.subject,
          body_html: item.htmlBody?.slice(0, 50000) ?? null,
          body_text: item.textBody,
          received_at: item.receivedAt,
          message_id: item.messageId,
        },
        is_internal: false,
      });

      if (error) {
        results.errors.push(error.message);
        continue;
      }

      if (lead.stage === 'new') {
        await supabase.from('crm_leads').update({ stage: 'triaged', updated_at: new Date().toISOString() }).eq('id', lead.id);
        await supabase.from('crm_events').insert({
          tenant_id: lead.tenant_id || tenantId,
          lead_id: lead.id,
          event_type: 'stage.changed',
          actor_type: 'system',
          actor_id: 'imap-poller',
          summary: 'Auto-triaged on customer reply',
          payload: { from: 'new', to: 'triaged', trigger: 'inbound_email' },
          is_internal: true,
        });
      }

      results.processed++;
    }

    await client.logout().catch(() => {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message, ...results }, { status: 500 });
  }

  return NextResponse.json(results);
}
