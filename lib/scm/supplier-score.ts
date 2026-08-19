import { getServerClient } from '@/lib/supabase-server';

export async function updateSupplierScores() {
  const supabase = getServerClient();
  const { data: suppliers } = await supabase.from('shop_suppliers').select('id');
  if (!suppliers?.length) return { updated: 0 };

  let updated = 0;
  for (const supplier of suppliers) {
    const [{ count: poCount }, { count: receiptCount }, { data: invoices }] = await Promise.all([
      supabase.from('shop_purchase_orders').select('id', { count: 'exact', head: true }).eq('supplier_id', supplier.id),
      supabase.from('shop_goods_receipts').select('id', { count: 'exact', head: true }).eq('supplier_id', supplier.id),
      supabase.from('shop_supplier_invoices').select('match_status').eq('supplier_id', supplier.id),
    ]);

    const totalPOs = poCount ?? 0;
    const totalReceipts = receiptCount ?? 0;
    const matchedInvoices = (invoices ?? []).filter(i => i.match_status === 'full').length;
    const totalInvoices = (invoices ?? []).length;

    let score = 50;
    if (totalPOs > 0) {
      const deliveryRate = totalReceipts / totalPOs;
      score += deliveryRate * 25;
    }
    if (totalInvoices > 0) {
      const matchRate = matchedInvoices / totalInvoices;
      score += matchRate * 25;
    }
    score = Math.min(100, Math.max(0, Math.round(score * 100) / 100));

    await supabase.from('shop_suppliers').update({
      score,
      score_updated_at: new Date().toISOString(),
    }).eq('id', supplier.id);

    updated++;
  }

  return { updated, timestamp: new Date().toISOString() };
}
