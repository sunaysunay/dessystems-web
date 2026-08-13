import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { return_id, return_line_id, inspected_by, disposition, condition_grade, notes, photo_urls } = body;

  if (!return_id || !disposition) {
    return NextResponse.json({ error: 'return_id and disposition are required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: inspection, error: insErr } = await supabase
    .from('shop_return_inspections')
    .insert({
      return_id,
      return_line_id: return_line_id ?? null,
      inspected_by: inspected_by ?? null,
      disposition,
      condition_grade: condition_grade ?? null,
      notes: notes ?? null,
      photo_urls: photo_urls ?? null,
      inspected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  if (disposition === 'restock') {
    await supabase
      .from('shop_returns')
      .update({ status: 'inspected' })
      .eq('id', return_id);
  }

  const { data: lines } = await supabase
    .from('shop_return_lines')
    .select('id')
    .eq('return_id', return_id);

  if (lines && lines.length > 0) {
    const lineIds = lines.map((l) => l.id);

    const { data: inspections } = await supabase
      .from('shop_return_inspections')
      .select('return_line_id, disposition')
      .eq('return_id', return_id)
      .in('return_line_id', lineIds);

    if (inspections) {
      const inspectedLineIds = new Set(inspections.map((i) => i.return_line_id));
      const allInspected = lineIds.every((id) => inspectedLineIds.has(id));
      const allRestock = inspections.every((i) => i.disposition === 'restock');

      if (allInspected && allRestock) {
        await supabase
          .from('shop_returns')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', return_id);
      }
    }
  }

  return NextResponse.json({ inspection }, { status: 201 });
}
