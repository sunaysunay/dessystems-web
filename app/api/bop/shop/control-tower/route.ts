import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await getServerClient();

    const [
      { count: openPOCount },
      { data: openPOs },
      { count: supplierCount },
      { count: activeSupplierCount },
      { count: pendingOrderCount },
      { count: pendingReturnCount },
      { count: openInvoiceCount },
      { data: stockItems },
    ] = await Promise.all([
      supabase
        .from('shop_purchase_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'approved', 'sent', 'partially_received']),
      supabase
        .from('shop_purchase_orders')
        .select('id, po_number, status, currency, created_at, supplier:shop_suppliers(name)')
        .in('status', ['draft', 'approved', 'sent', 'partially_received'])
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('shop_suppliers')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('shop_suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('shop_orders')
        .select('*', { count: 'exact', head: true })
        .in('state', ['new', 'pending', 'confirmed', 'processing']),
      supabase
        .from('shop_returns')
        .select('*', { count: 'exact', head: true })
        .in('status', ['requested', 'received', 'inspecting']),
      supabase
        .from('shop_invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'overdue']),
      supabase
        .from('shop_stock_items')
        .select('variant_id, on_hand, reserved, reorder_point, shop_variants(sku, shop_products(name))')
        .limit(200),
    ]);

    const lowStockAlerts = (stockItems || [])
      .filter((s: any) => {
        const available = (s.on_hand ?? 0) - (s.reserved ?? 0);
        const rp = s.reorder_point ?? 0;
        return rp > 0 && available <= rp;
      })
      .map((s: any) => ({
        variant_id: s.variant_id,
        sku: s.shop_variants?.sku ?? '—',
        product_name: s.shop_variants?.shop_products?.name?.en ?? s.shop_variants?.shop_products?.name?.nl ?? '—',
        on_hand: s.on_hand ?? 0,
        reserved: s.reserved ?? 0,
        available: (s.on_hand ?? 0) - (s.reserved ?? 0),
        reorder_point: s.reorder_point ?? 0,
      }));

    // Compute PO line totals
    const poIds = (openPOs || []).map((p: any) => p.id);
    let poLineTotals: Record<string, number> = {};
    if (poIds.length > 0) {
      const { data: lines } = await supabase
        .from('shop_po_lines')
        .select('po_id, qty_ordered, unit_cost_cents')
        .in('po_id', poIds);
      for (const l of lines || []) {
        poLineTotals[l.po_id] = (poLineTotals[l.po_id] || 0) + (l.qty_ordered * l.unit_cost_cents);
      }
    }

    // Late POs: status sent and created > 30 days ago (no expected_delivery column, use lead time heuristic)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const latePOs = (openPOs || []).filter(
      (p: any) => p.status === 'sent' && p.created_at < thirtyDaysAgo
    ).length;

    return NextResponse.json({
      kpis: {
        openPOs: openPOCount ?? 0,
        latePOs,
        lowStockAlerts: lowStockAlerts.length,
        pendingOrders: pendingOrderCount ?? 0,
        totalSuppliers: supplierCount ?? 0,
        activeSuppliers: activeSupplierCount ?? 0,
        pendingReturns: pendingReturnCount ?? 0,
        openInvoices: openInvoiceCount ?? 0,
      },
      openPOs: (openPOs || []).map((p: any) => ({
        id: p.id,
        po_number: p.po_number,
        status: p.status,
        currency: p.currency,
        supplier_name: (p.supplier as any)?.name ?? '—',
        total_cents: poLineTotals[p.id] ?? 0,
        created_at: p.created_at,
      })),
      stockAlerts: lowStockAlerts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
