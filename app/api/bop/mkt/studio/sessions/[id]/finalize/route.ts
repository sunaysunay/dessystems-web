// app/api/bop/mkt/studio/sessions/[id]/finalize/route.ts
// Copy studio_master + exports into bop_listing_media (if listing_id set)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const sb = getServerClient();

  const { data: session, error: sErr } = await sb
    .from('bop_studio_sessions')
    .select('*, bop_studio_images(*, bop_studio_steps(*))')
    .eq('id', id)
    .eq('created_by', uid)
    .single();

  if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'review') {
    return NextResponse.json({ error: 'Session must be in "review" status to finalize' }, { status: 409 });
  }
  if (!session.listing_id) {
    return NextResponse.json({ error: 'Session has no listing_id — set it before finalizing' }, { status: 400 });
  }

  const images = session.bop_studio_images ?? [];
  let saved = 0;

  // Get current max sort_order for the listing
  const { data: maxRow } = await sb
    .from('bop_listing_media')
    .select('sort_order')
    .eq('listing_id', session.listing_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextSort = (maxRow?.sort_order ?? -1) + 1;

  for (const img of images) {
    if (img.status !== 'done') continue;

    const steps = img.bop_studio_steps ?? [];
    const exportStep = steps.find((s: { step_no: number }) => s.step_no === 4);
    const brandStep  = steps.find((s: { step_no: number }) => s.step_no === 3);

    const masterPath: string | undefined = (brandStep?.output as { resultPath?: string } | null)?.resultPath;
    const exportPaths: string[] = (exportStep?.output as { targets?: string[] } | null)?.targets ?? [];

    // Insert studio_master row
    if (masterPath) {
      const { data: { publicUrl } } = sb.storage.from('studio').getPublicUrl(masterPath);
      await sb.from('bop_listing_media').insert({
        listing_id: session.listing_id,
        media_type: 'photo',
        url: publicUrl,
        is_cover: false,
        sort_order: nextSort++,
        label: `studio_master_${img.position}`,
        variant_kind: 'studio_master',
        studio_session_id: session.id,
      });
      saved++;
    }

    // Insert export variant rows
    for (const exportPath of exportPaths) {
      const targetCode = exportPath.split('/').pop()?.split('.')[0] ?? 'website';
      const { data: { publicUrl } } = sb.storage.from('studio').getPublicUrl(exportPath);
      await sb.from('bop_listing_media').insert({
        listing_id: session.listing_id,
        media_type: 'photo',
        url: publicUrl,
        is_cover: false,
        sort_order: nextSort++,
        label: `studio_export_${targetCode}_${img.position}`,
        variant_kind: 'studio_export',
        export_target: targetCode,
        studio_session_id: session.id,
      });
    }
  }

  await sb
    .from('bop_studio_sessions')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true, saved_images: saved });
}
