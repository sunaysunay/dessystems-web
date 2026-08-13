import type { ContextData, ContextBinding } from './context-bindings';
import { getServerClient } from '@/lib/supabase-server';

export async function loadHandoverContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();

  const { data } = await supabase
    .from('sal_orders')
    .select(`
      id, order_number, status, delivery_date, notes, created_at,
      mdm_business_partners ( id, name, company_name, email ),
      ast_assets ( id, make, model, vin, license_plate, mileage_km, color, year )
    `)
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) return null;

  const partner = Array.isArray(data.mdm_business_partners)
    ? data.mdm_business_partners[0] ?? null
    : data.mdm_business_partners;

  const asset = Array.isArray(data.ast_assets)
    ? data.ast_assets[0] ?? null
    : data.ast_assets;

  const vehicleLabel = [asset?.make, asset?.model, asset?.year ? `(${asset.year})` : '']
    .filter(Boolean)
    .join(' ');

  return {
    scope: {
      Vehicle: {
        Id: asset?.id ?? '',
        Brand: asset?.make ?? '',
        Model: asset?.model ?? '',
        Year: String(asset?.year ?? ''),
        VIN: asset?.vin ?? '',
        LicensePlate: asset?.license_plate ?? '',
        Mileage: asset?.mileage_km ? Number(asset.mileage_km).toLocaleString('nl-NL') : '',
        Color: asset?.color ?? '',
        Label: vehicleLabel,
      },
      Customer: {
        Id: partner?.id ?? '',
        FullName: partner?.name ?? '',
        CompanyName: partner?.company_name ?? '',
        Email: partner?.email ?? '',
      },
      Order: {
        Id: data.id,
        Number: data.order_number ?? '',
        Status: data.status ?? '',
        DeliveryDate: data.delivery_date ?? '',
      },
      Document: {
        Type: 'Delivery Certificate',
        Number: data.order_number ?? data.id.slice(0, 8),
      },
    },
    recipients: partner?.email
      ? [{ to: partner.email, name: partner.name ?? partner.company_name ?? partner.email }]
      : [],
    links: [{ module: 'sal', recordId: data.id, label: data.order_number ?? data.id }],
  };
}

export const HANDOVER_BINDING: ContextBinding = {
  loader: loadHandoverContext,
  categories: ['handover.invite', 'handover.signed', 'handover.reminder'],
  smartObjects: ['vehicle_card'],
  primaryStyle: 'corporate',
};
