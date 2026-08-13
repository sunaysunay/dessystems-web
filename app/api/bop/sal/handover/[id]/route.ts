import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from('sal_orders')
    .select(`
      id, order_number, status, delivery_date, notes, handover_signatures,
      tenant_id, created_at, updated_at,
      mdm_business_partners (
        id, name, company_name, email, phone,
        street, city, postal_code, country
      ),
      ast_assets (
        id, make, model, vin, license_plate, mileage_km, color, year
      ),
      bop_tenants:tenant_id (
        tenant_id, company_name, address, logo_url, kvk_number
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Order not found' }, { status: 404 });
  }

  const partner = Array.isArray(data.mdm_business_partners)
    ? data.mdm_business_partners[0] ?? null
    : data.mdm_business_partners;

  const asset = Array.isArray(data.ast_assets)
    ? data.ast_assets[0] ?? null
    : data.ast_assets;

  const tenant = Array.isArray((data as any).bop_tenants)
    ? (data as any).bop_tenants[0] ?? null
    : (data as any).bop_tenants;

  const partnerAddress = partner
    ? [partner.street, partner.postal_code, partner.city, partner.country].filter(Boolean).join(', ')
    : undefined;

  const handover = {
    orderId: data.id,
    orderNumber: data.order_number,
    status: data.status,
    deliveryDate: data.delivery_date ?? data.updated_at ?? data.created_at,
    notes: data.notes,
    tenantName: tenant?.company_name ?? '',
    tenantAddress: tenant?.address,
    tenantLogo: tenant?.logo_url,
    tenantKvk: tenant?.kvk_number,
    customerName: partner?.name ?? partner?.company_name ?? '',
    customerAddress: partnerAddress || undefined,
    customerEmail: partner?.email,
    vehicleBrand: asset?.make ?? '',
    vehicleModel: asset?.model ?? '',
    vehicleVin: asset?.vin,
    vehicleLicensePlate: asset?.license_plate,
    vehicleMileage: asset?.mileage_km ? Number(asset.mileage_km) : undefined,
    vehicleColor: asset?.color,
    vehicleYear: asset?.year ? Number(asset.year) : undefined,
    signatures: data.handover_signatures ?? [],
  };

  return NextResponse.json({ handover });
}
