import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'csv';
  if (format !== 'csv') {
    return NextResponse.json({ error: `format "${format}" not supported — use csv` }, { status: 400 });
  }
  const csvUrl = new URL('/api/bop/shop/catalog/import/csv', req.url);
  const res = await fetch(csvUrl.toString(), {
    method: 'POST',
    headers: Object.fromEntries(req.headers),
    body: await req.arrayBuffer(),
  });
  return new NextResponse(res.body, { status: res.status, headers: { 'content-type': 'application/json' } });
}
