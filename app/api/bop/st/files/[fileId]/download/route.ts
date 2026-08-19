import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/st/google-drive';

export const dynamic = 'force-dynamic';

// GET /api/bop/st/files/<driveFileId>/download?tenant=campers — stream file content
export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const tenant = req.nextUrl.searchParams.get('tenant');
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });
  try {
    const { stream, meta } = await getFileStream(tenant, fileId);
    const headers = new Headers({
      'Content-Type': meta.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${(meta.name ?? 'file').replace(/"/g, '')}"`,
    });
    if (meta.size) headers.set('Content-Length', String(meta.size));
    return new NextResponse(stream as unknown as ReadableStream, { headers });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}
