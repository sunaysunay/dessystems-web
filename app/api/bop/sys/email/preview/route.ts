import { NextRequest, NextResponse } from 'next/server';
import { renderBopEmail } from '@/lib/bop-email';

export const dynamic = 'force-dynamic';

// GET /api/bop/sys/email/preview?type=password_reset&tenant=200&locale=nl → rendered HTML
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const type = p.get('type') ?? 'password_reset';
  const tenant = Number(p.get('tenant') ?? '0');
  const locale = p.get('locale') ?? 'en';
  const sample = 'https://bop.dessystems.io/reset?token=SAMPLE';
  const { subject, html, missing } = await renderBopEmail(tenant, type, locale, {
    user_name: 'Sample User', user_email: 'user@example.com', action_url: sample, reset_link: sample,
  });
  if (missing) return NextResponse.json({ error: `no template for ${type}/${locale}` }, { status: 404 });
  return new NextResponse(`<!-- subject: ${subject} -->\n${html}`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
