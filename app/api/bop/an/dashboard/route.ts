import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') ?? '30');
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [
    { data: invoices },
    { data: quotes },
    { data: assets },
    { data: leads },
    { data: partners },
    { data: listings },
  ] = await Promise.all([
    supabase.from('fin_invoices').select('status, gross, due_date').gte('created_at', since),
    supabase.from('sal_quotations').select('status, gross').gte('created_at', since),
    supabase.from('ast_assets').select('status, asking_price, cost_price'),
    supabase.from('crm_leads').select('stage, expected_value').gte('created_at', since),
    supabase.from('mdm_business_partners').select('id').gte('created_at', since),
    supabase.from('mkp_listings').select('status, channel'),
  ]);

  const inv = invoices ?? [];
  const q   = quotes ?? [];
  const ast = assets ?? [];
  const ld  = leads ?? [];
  const ls  = listings ?? [];

  const now = new Date().toISOString().split('T')[0];

  return NextResponse.json({
    // Finance
    invoiced:       inv.reduce((s, i) => s + (i.gross ?? 0), 0),
    collected:      inv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.gross ?? 0), 0),
    open_ar:        inv.filter(i => !['paid','cancelled'].includes(i.status)).reduce((s, i) => s + (i.gross ?? 0), 0),
    overdue_count:  inv.filter(i => ['sent','partial'].includes(i.status) && i.due_date < now).length,
    overdue_amount: inv.filter(i => ['sent','partial'].includes(i.status) && i.due_date < now).reduce((s, i) => s + (i.gross ?? 0), 0),
    invoices_issued: inv.length,
    // Quotes
    quote_pipeline: q.filter(i => ['draft','sent'].includes(i.status)).reduce((s, i) => s + (i.gross ?? 0), 0),
    quotes_created: q.length,
    quotes_won:     q.filter(i => i.status === 'accepted').length,
    // Inventory
    stock_total:     ast.length,
    stock_published: ast.filter(a => a.status === 'available').length,
    stock_reserved:  ast.filter(a => a.status === 'reserved').length,
    stock_value:     ast.reduce((s, a) => s + (a.asking_price ?? 0), 0),
    // CRM
    leads_active:   ld.filter(l => !['won','lost'].includes(l.stage)).length,
    leads_won:      ld.filter(l => l.stage === 'won').length,
    leads_pipeline: ld.filter(l => !['won','lost'].includes(l.stage)).reduce((s, l) => s + (l.expected_value ?? 0), 0),
    new_partners:   (partners ?? []).length,
    // Marketplace
    listings_total:    ls.length,
    listings_published: ls.filter(l => l.status === 'published').length,
    listings_expired:  ls.filter(l => l.status === 'expired').length,
    channels_active:   [...new Set(ls.filter(l => l.status === 'published').map(l => l.channel))].length,
  });
}
