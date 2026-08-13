import nodemailer from 'nodemailer';

let _t: nodemailer.Transporter | null = null;

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport(): nodemailer.Transporter | null {
  if (_t) return _t;
  if (!smtpConfigured()) return null;
  _t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.eu',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
  return _t;
}

export async function sendBopMail(to: string, subject: string, html: string): Promise<string> {
  const t = transport();
  if (!t) throw new Error('SMTP not configured');
  const from = process.env.SMTP_FROM || `"DES Systems" <${process.env.SMTP_USER}>`;
  const info = await t.sendMail({ from, to, subject, html });
  return info.response ?? 'ok';
}
