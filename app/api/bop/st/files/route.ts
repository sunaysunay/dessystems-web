import { NextRequest, NextResponse } from 'next/server';
import { listFolder, searchFiles, uploadFile, indexFile, getAccount } from '@/lib/st/google-drive';

export const dynamic = 'force-dynamic';

// GET /api/bop/st/files?tenant=campers[&folder=<id>][&q=<search>]
export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get('tenant');
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });
  const q = req.nextUrl.searchParams.get('q');
  const folder = req.nextUrl.searchParams.get('folder') ?? undefined;
  try {
    const files = q ? await searchFiles(tenant, q) : await listFolder(tenant, folder);
    return NextResponse.json({ files });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}

// POST /api/bop/st/files — multipart: tenant, file, [folder], [linked_object_type], [linked_object_id]
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const tenant = form.get('tenant') as string | null;
  const file = form.get('file') as File | null;
  if (!tenant || !file) return NextResponse.json({ error: 'tenant and file required' }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'max 20 MB' }, { status: 413 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const entry = await uploadFile(tenant, {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      body: buf,
      folderId: (form.get('folder') as string) || undefined,
    });
    const account = await getAccount(tenant);
    if (account) {
      await indexFile(account.id, entry, {
        linkedObjectType: (form.get('linked_object_type') as string) || undefined,
        linkedObjectId: (form.get('linked_object_id') as string) || undefined,
      });
    }
    return NextResponse.json({ file: entry });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}
