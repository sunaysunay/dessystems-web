import nodemailer from 'nodemailer';
import { getServerClient } from '@/lib/supabase-server';

// Shared notification side-effects for the Support Request module.
// Three events: request created, admin replied, user replied.
// Uses existing platform infra — no new providers.

function getSmtpTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.eu',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendTelegram(text: string) {
  const token = process.env.BOP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.BOP_TELEGRAM_CHAT_ID   || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-blocking */ }
}

async function sendEmail(to: string, subject: string, html: string) {
  const t = getSmtpTransport();
  if (!t) return;
  const from = process.env.SMTP_FROM || `"DES Support" <${process.env.SMTP_USER}>`;
  try { await t.sendMail({ from, to, subject, html }); } catch { /* non-blocking */ }
}

export interface SupportRequest {
  id: number;
  request_no: string;
  subject: string;
  category: string;
  priority: string;
  tenant_id: number;
  created_by: string;
}

// Called after a new request + first message are created.
// → Telegram alert to admin + email to admin SMTP_FROM address.
export async function notifyRequestCreated(req: SupportRequest, userEmail: string) {
  const catLabel: Record<string, string> = {
    access_problem: 'Access problem', bug: 'Bug', question: 'Question',
    feature_request: 'Feature request', other: 'Other',
  };
  const tgText = [
    `🆘 <b>${req.request_no}</b> — New support request`,
    `👤 ${userEmail} · Tenant ${req.tenant_id}`,
    `📂 ${catLabel[req.category] ?? req.category} · Priority: <b>${req.priority}</b>`,
    `📝 ${req.subject}`,
    `🔗 https://bop.dessystems.io/console/sys/support`,
  ].join('\n');
  await sendTelegram(tgText);

  const adminEmail = process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER || '';
  if (adminEmail) {
    await sendEmail(
      adminEmail,
      `[${req.request_no}] ${req.subject}`,
      `<p><b>${req.request_no}</b> · ${req.category} · ${req.priority}</p>
       <p>From: ${userEmail} (Tenant ${req.tenant_id})</p>
       <p>${req.subject}</p>
       <p><a href="https://bop.dessystems.io/console/sys/support">Open in BOP</a></p>`
    );
  }
}

// Called after admin posts a reply message.
// → admin_notifications row (picked up by 🔔 bell within 30s) + email to user.
export async function notifyAdminReplied(req: SupportRequest, userEmail: string, replyPreview: string) {
  const supabase = getServerClient();
  await supabase.from('admin_notifications').insert({
    tenant_id: req.tenant_id,
    title: `Admin replied to ${req.request_no}`,
    body: replyPreview.slice(0, 120),
    type: 'info',
    is_read: false,
    meta: { source: 'support', request_id: req.id, request_no: req.request_no },
  });

  if (userEmail) {
    await sendEmail(
      userEmail,
      `Re: [${req.request_no}] ${req.subject}`,
      `<p>Your support request <b>${req.request_no}</b> has a new reply from DES admin.</p>
       <p>${replyPreview}</p>
       <p>Log in to BOP to continue the conversation.</p>`
    );
  }
}

// Called after user posts a reply on an existing (non-closed) request.
// → Telegram only (admin needs to know; no in-app bell for admin yet).
export async function notifyUserReplied(req: SupportRequest, userEmail: string, replyPreview: string) {
  const tgText = [
    `↩️ <b>${req.request_no}</b> — User replied`,
    `👤 ${userEmail} · Tenant ${req.tenant_id}`,
    `📝 ${replyPreview.slice(0, 120)}`,
    `🔗 https://bop.dessystems.io/console/sys/support`,
  ].join('\n');
  await sendTelegram(tgText);
}
