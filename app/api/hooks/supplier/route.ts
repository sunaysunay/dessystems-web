import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const body = await request.json();

    const { supplier_code, items } = body;

    if (!supplier_code || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'supplier_code and items array are required' },
        { status: 400 }
      );
    }

    // Look up supplier by code
    const { data: supplier, error: supErr } = await supabase
      .from('shop_suppliers')
      .select('id')
      .eq('supplier_code', supplier_code)
      .single();

    if (supErr || !supplier) {
      return NextResponse.json(
        { error: `Supplier not found: ${supplier_code}` },
        { status: 404 }
      );
    }

    let upserted = 0;
    let errors: string[] = [];

    for (const item of items) {
      const { supplier_sku, cost_price, stock_qty, description } = item;

      if (!supplier_sku) {
        errors.push('Missing supplier_sku in item');
        continue;
      }

      const { error: upsertErr } = await supabase
        .from('shop_supplier_variants')
        .upsert(
          {
            supplier_id: supplier.id,
            supplier_sku,
            cost_price,
            stock_qty,
            description,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'supplier_id,supplier_sku' }
        );

      if (upsertErr) {
        errors.push(`Failed to upsert ${supplier_sku}: ${upsertErr.message}`);
      } else {
        upserted++;
      }
    }

    // Update feed_last_synced_at on the supplier
    await supabase
      .from('shop_suppliers')
      .update({ feed_last_synced_at: new Date().toISOString() })
      .eq('id', supplier.id);

    return NextResponse.json({
      data: {
        supplier_id: supplier.id,
        upserted,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
