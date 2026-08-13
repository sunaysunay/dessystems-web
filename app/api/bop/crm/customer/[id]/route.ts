import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const [{ data: partner }, { data: leads }, { data: invoices }, { data: activities }] = await Promise.all([
    supabase.from('mdm_business_partners').select('*, mdm_partner_roles(role_type)').eq('id', id).single(),
    supabase.from('crm_leads').select('*, ast_assets(make,model,year)').eq('partner_id', id).order('created_at', { ascending: false }),
    supabase.from('fin_invoices').select('id,invoice_number,amount,status,type,created_at').eq('partner_id', id).order('created_at', { ascending: false }),
    supabase.from('crm_activities').select('*').eq('partner_id', id).order('created_at', { ascending: false }).limit(50),
  ]);
  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ partner, leads: leads ?? [], invoices: invoices ?? [], activities: activities ?? [] });
}
