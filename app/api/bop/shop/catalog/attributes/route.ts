import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getServerClient();
  const { data: groups, error } = await supabase
    .from('shop_attribute_groups')
    .select('*, attributes:shop_attributes(*)')
    .order('position')
    .order('position', { referencedTable: 'shop_attributes' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const supabase = getServerClient();

  if (action === 'upsert_group') {
    const { code, name, position } = body;
    const { data, error } = await supabase
      .from('shop_attribute_groups')
      .upsert({ code, name, position }, { onConflict: 'code' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group: data });
  }

  if (action === 'upsert_attribute') {
    const { code, group_id, name, data_type, unit, enum_values, is_filterable, is_comparable, position } = body;
    const { data, error } = await supabase
      .from('shop_attributes')
      .upsert({ code, group_id, name, data_type, unit, enum_values, is_filterable, is_comparable, position }, { onConflict: 'code' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attribute: data });
  }

  if (action === 'set_variant_values') {
    const { variant_id, values } = body as {
      variant_id: string;
      values: { attribute_id: string; value_num?: number; value_text?: string; value_bool?: boolean; value_enum?: string }[];
    };

    if (!variant_id || !Array.isArray(values)) {
      return NextResponse.json({ error: 'variant_id and values[] are required' }, { status: 400 });
    }

    // Delete existing values then insert new
    const { error: delErr } = await supabase
      .from('shop_variant_attribute_values')
      .delete()
      .eq('variant_id', variant_id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (values.length > 0) {
      const rows = values.map(v => ({ variant_id, ...v }));
      const { error: insErr } = await supabase
        .from('shop_variant_attribute_values')
        .insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_group') {
    const { id } = body;
    const { error } = await supabase.from('shop_attribute_groups').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_attribute') {
    const { id } = body;
    const { error } = await supabase.from('shop_attributes').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
