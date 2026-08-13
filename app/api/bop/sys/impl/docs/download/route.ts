import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const name = searchParams.get('name') ?? 'download';

  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

  const { data, error } = await supabase.storage.from('impl-docs').download(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'not found' }, { status: 404 });

  const buf = Buffer.from(await data.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(buf.length),
    },
  });
}
