import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

const DESMOBIL_URL = process.env.DESMOBIL_PREVIEW_URL ?? 'https://dev.desmobil.com';
const ADMIN_SECRET = process.env.DESMOBIL_ADMIN_SECRET ?? '';

// POST: generate a signed preview URL for desmobil
// Body: { overrides: { btw_toggle: false, ... }, page?: "/nl/vehicles" }
// Returns: { url: "https://dev.desmobil.com/api/config/ff-preview?token=...&redirect=..." }
export async function POST(req: NextRequest) {
  if (!ADMIN_SECRET) {
    return NextResponse.json({ error: 'DESMOBIL_ADMIN_SECRET not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.overrides || typeof body.overrides !== 'object') {
    return NextResponse.json({ error: 'overrides required' }, { status: 400 });
  }

  const overrides: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(body.overrides)) {
    if (typeof v === 'boolean') overrides[k] = v;
  }

  if (Object.keys(overrides).length === 0) {
    return NextResponse.json({ error: 'No valid boolean overrides' }, { status: 400 });
  }

  const payload = JSON.stringify(overrides);
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex').slice(0, 16);
  const token = `${encoded}.${sig}`;

  const page = body.page || '/nl';
  const url = `${DESMOBIL_URL}/api/config/ff-preview?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(page)}`;
  const clearUrl = `${DESMOBIL_URL}/api/config/ff-preview?redirect=${encodeURIComponent(page)}`;

  return NextResponse.json({ url, clearUrl, overrides, storefrontBase: DESMOBIL_URL });
}
