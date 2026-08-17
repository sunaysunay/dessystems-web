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
    const syncedAt = new Date().toISOString();

    for (const item of items) {
      const { supplier_sku, cost_price, stock_qty, description, currency } = item;

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
            // The column is feed_stock_qty. This wrote stock_qty, which does
            // not exist, so PostgREST rejected every row and the feed had a
            // 100% failure rate.
            feed_stock_qty: stock_qty,
            currency: currency ?? 'EUR',
            description,
            // Per-variant sync stamp — staleness is judged per variant, not
            // only per supplier.
            feed_synced_at: syncedAt,
            updated_at: syncedAt,
          },
          { onConflict: 'supplier_id,supplier_sku' }
        );

      if (upsertErr) {
        errors.push(`Failed to upsert ${supplier_sku}: ${upsertErr.message}`);
      } else {
        upserted++;
      }
    }

    // Only stamp the supplier as synced if something actually landed —
    // otherwise a totally failed feed still looks fresh and the staleness
    // alert never fires.
    if (upserted > 0) {
      const { error: supUpdErr } = await supabase
        .from('shop_suppliers')
        .update({ feed_last_synced_at: syncedAt })
        .eq('id', supplier.id);

      if (supUpdErr) {
        errors.push(`Failed to update supplier sync time: ${supUpdErr.message}`);
      }
    }

    const responseBody = {
      data: {
        supplier_id: supplier.id,
        received: items.length,
        upserted,
        failed: items.length - upserted,
        errors: errors.length > 0 ? errors : undefined,
      },
    };

    // A feed where nothing landed is a failure, not a success. Returning 200
    // told senders their push had worked while every row was being rejected.
    if (upserted === 0 && items.length > 0) {
      return NextResponse.json(responseBody, { status: 422 });
    }
    return NextResponse.json(responseBody, { status: errors.length > 0 ? 207 : 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
