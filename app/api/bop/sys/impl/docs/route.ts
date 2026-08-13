import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const BUCKET = 'impl-docs';
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB per program

export async function GET(req: NextRequest) {
  noStore();
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get('program_id');
  if (!programId) return NextResponse.json({ error: 'program_id required' }, { status: 400 });

  const prefix = `${programId}/`;
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files = (data ?? [])
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => ({
      name: f.name,
      path: `${prefix}${f.name}`,
      size: (f.metadata as Record<string, unknown>)?.size ?? 0,
      mimetype: (f.metadata as Record<string, unknown>)?.mimetype ?? '',
      created_at: f.created_at,
    }));

  const totalSize = files.reduce((s, f) => s + (Number(f.size) || 0), 0);
  return NextResponse.json({ files, totalSize, maxSize: MAX_TOTAL_BYTES });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();

  const formData = await req.formData();
  const programId = formData.get('program_id') as string;
  const docType = formData.get('doc_type') as string; // 'ai_spec' or 'impl_plan'
  const file = formData.get('file') as File | null;

  if (!programId || !file) {
    return NextResponse.json({ error: 'program_id and file required' }, { status: 400 });
  }

  // Check current total size
  const prefix = `${programId}/`;
  const { data: existing } = await supabase.storage.from(BUCKET).list(prefix);
  const currentTotal = (existing ?? [])
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .reduce((s, f) => s + (Number((f.metadata as Record<string, unknown>)?.size) || 0), 0);

  if (currentTotal + file.size > MAX_TOTAL_BYTES) {
    const remainMB = ((MAX_TOTAL_BYTES - currentTotal) / 1024 / 1024).toFixed(1);
    return NextResponse.json({
      error: `Upload would exceed 10 MB limit. ${remainMB} MB remaining.`,
    }, { status: 400 });
  }

  // Prefix filename with doc type for easy identification
  const typeMap: Record<string, string> = { ai_spec: 'ai-spec', impl_plan: 'impl-plan', user_manual: 'user-manual', test_scenario: 'test-scenario' };
  const safeType = typeMap[docType] ?? 'doc';
  const fileName = `${safeType}_${file.name}`;
  const filePath = `${prefix}${fileName}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buf, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, path: filePath, name: fileName });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerClient();
  const { path } = await req.json();
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
