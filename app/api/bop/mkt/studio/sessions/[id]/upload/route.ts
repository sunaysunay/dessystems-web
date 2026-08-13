// app/api/bop/mkt/studio/sessions/[id]/upload/route.ts
// Returns signed upload URLs for originals; client uploads direct to Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// POST { files: [{ position: number, filename: string, contentType: string }] }
// Returns signed upload URLs + creates bop_studio_images rows
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const files: { position: number; filename: string; contentType: string }[] = body.files ?? [];

  if (!files.length || files.length > 10) {
    return NextResponse.json({ error: 'Provide 1–10 files' }, { status: 400 });
  }

  const sb = getServerClient();

  // Verify session ownership
  const { data: session, error: sessionErr } = await sb
    .from('bop_studio_sessions')
    .select('id')
    .eq('id', id)
    .eq('created_by', uid)
    .single();
  if (sessionErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const results: { position: number; signedUrl: string; path: string; imageId: string }[] = [];

  for (const f of files) {
    const ext = f.contentType === 'image/webp' ? 'webp' : f.contentType === 'image/png' ? 'png' : 'jpg';
    const path = `${id}/original/${f.position}.${ext}`;

    // Create signed upload URL (valid 10 min)
    const { data: signed, error: signErr } = await sb.storage
      .from('studio')
      .createSignedUploadUrl(path);

    if (signErr || !signed) {
      return NextResponse.json({ error: `Storage error: ${signErr?.message ?? 'unknown'}` }, { status: 500 });
    }

    // Upsert image row
    const { data: img, error: imgErr } = await sb
      .from('bop_studio_images')
      .upsert({ session_id: id, position: f.position, original_path: path, status: 'pending' }, { onConflict: 'session_id,position' })
      .select('id')
      .single();

    if (imgErr || !img) {
      return NextResponse.json({ error: `Image row error: ${imgErr?.message}` }, { status: 500 });
    }

    results.push({ position: f.position, signedUrl: signed.signedUrl, path, imageId: img.id });
  }

  return NextResponse.json({ uploads: results });
}
