import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ collections: [] });
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true, message: 'Collections not yet implemented' });
}
