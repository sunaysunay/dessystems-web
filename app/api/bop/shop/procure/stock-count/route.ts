import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('shop_stock_counts')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();

    const { name, location, counted_by, lines } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'At least one count line is required' },
        { status: 400 }
      );
    }

    // Create stock count header
    const { data: stockCount, error: scErr } = await supabase
      .from('shop_stock_counts')
      .insert({
        name: name || `Count ${new Date().toISOString().slice(0, 10)}`,
        location,
        counted_by,
        status: 'draft',
      })
      .select()
      .single();

    if (scErr) {
      return NextResponse.json({ error: scErr.message }, { status: 500 });
    }

    // Insert count lines with auto-calculated variance
    const lineInserts = lines.map((line: any) => ({
      stock_count_id: stockCount.id,
      variant_id: line.variant_id,
      sku: line.sku,
      system_qty: line.system_qty || 0,
      counted_qty: line.counted_qty || 0,
      variance: (line.counted_qty || 0) - (line.system_qty || 0),
    }));

    const { data: insertedLines, error: linesErr } = await supabase
      .from('shop_stock_count_lines')
      .insert(lineInserts)
      .select();

    if (linesErr) {
      return NextResponse.json({ error: linesErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { data: { ...stockCount, lines: insertedLines } },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Fetch current stock count
    const { data: current, error: fetchErr } = await supabase
      .from('shop_stock_counts')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Stock count not found' }, { status: 404 });
    }

    const validTransitions: Record<string, string[]> = {
      draft: ['counting'],
      counting: ['review'],
      review: ['posted'],
    };

    if (status && status !== current.status) {
      const allowed = validTransitions[current.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from '${current.status}' to '${status}'` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // When posting, calculate variance_total and set posted_at
    if (status === 'posted') {
      updates.posted_at = new Date().toISOString();

      const { data: lines } = await supabase
        .from('shop_stock_count_lines')
        .select('variance')
        .eq('stock_count_id', id);

      if (lines) {
        updates.variance_total = lines.reduce(
          (sum: number, l: any) => sum + (l.variance || 0),
          0
        );
      }
    }

    const { data, error } = await supabase
      .from('shop_stock_counts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
