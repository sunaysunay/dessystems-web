import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { buildHandoverHtml } from '@/lib/documents/handover-template';
import { resolveLocale } from '@/lib/comm/resolve-locale';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  let body: {
    signatureDataUrl: string;
    signerName: string;
    signerRole: 'customer' | 'dealer';
    tenantId: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.signatureDataUrl || !body.signerName || !body.signerRole || !body.tenantId) {
    return NextResponse.json({ error: 'Missing required fields: signatureDataUrl, signerName, signerRole, tenantId' }, { status: 400 });
  }

  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const signedAt = new Date().toISOString();

  const newSignature = {
    signatureDataUrl: body.signatureDataUrl,
    signerName: body.signerName,
    signerRole: body.signerRole,
    signedAt,
    ipAddress,
    userAgent,
  };

  const { data: order, error: fetchError } = await supabase
    .from('sal_orders')
    .select(`
      id, order_number, status, delivery_date, notes, handover_signatures, tenant_id,
      created_at, updated_at,
      mdm_business_partners ( id, name, company_name, email, street, city, postal_code, country ),
      ast_assets ( id, make, model, vin, license_plate, mileage_km, color, year ),
      bop_tenants:tenant_id ( tenant_id, company_name, address, logo_url, kvk_number, default_language )
    `)
    .eq('id', id)
    .eq('tenant_id', body.tenantId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: fetchError?.message ?? 'Order not found' }, { status: 404 });
  }

  const existingSignatures: any[] = Array.isArray(order.handover_signatures)
    ? order.handover_signatures
    : [];
  const updatedSignatures = [...existingSignatures.filter((s: any) => s.signerRole !== body.signerRole), newSignature];

  const { error: updateError } = await supabase
    .from('sal_orders')
    .update({
      handover_signatures: updatedSignatures,
      updated_at: signedAt,
    })
    .eq('id', id)
    .eq('tenant_id', body.tenantId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const partner = Array.isArray(order.mdm_business_partners)
    ? order.mdm_business_partners[0] ?? null
    : order.mdm_business_partners;

  const asset = Array.isArray(order.ast_assets)
    ? order.ast_assets[0] ?? null
    : order.ast_assets;

  const tenant = Array.isArray((order as any).bop_tenants)
    ? (order as any).bop_tenants[0] ?? null
    : (order as any).bop_tenants;

  const partnerAddress = partner
    ? [partner.street, partner.postal_code, partner.city, partner.country].filter(Boolean).join(', ')
    : undefined;

  const locale = await resolveLocale({
    tenantId: body.tenantId,
    partnerCountry: partner?.country,
  });

  const handoverData = {
    locale,
    tenantName: tenant?.company_name ?? '',
    tenantAddress: tenant?.address,
    tenantLogo: tenant?.logo_url,
    tenantKvk: tenant?.kvk_number,
    customerName: partner?.name ?? partner?.company_name ?? '',
    customerAddress: partnerAddress || undefined,
    vehicleBrand: asset?.make ?? '',
    vehicleModel: asset?.model ?? '',
    vehicleVin: asset?.vin,
    vehicleLicensePlate: asset?.license_plate,
    vehicleMileage: asset?.mileage_km ? Number(asset.mileage_km) : undefined,
    vehicleColor: asset?.color,
    vehicleYear: asset?.year ? Number(asset.year) : undefined,
    orderNumber: order.order_number,
    deliveryDate: order.delivery_date ?? order.updated_at ?? order.created_at,
    notes: order.notes,
  };

  const html = buildHandoverHtml(handoverData, updatedSignatures);

  const renderDir = '/tmp/des-pdf-render';
  mkdirSync(renderDir, { recursive: true });

  const fileId = randomUUID();
  const htmlPath = `${renderDir}/${fileId}.html`;
  const pdfPath = `${renderDir}/${fileId}.pdf`;

  writeFileSync(htmlPath, html, 'utf-8');

  try {
    execSync(
      `google-chrome --headless --no-sandbox --disable-gpu --print-to-pdf=${pdfPath} file://${htmlPath}`,
      { timeout: 15_000, stdio: 'pipe' },
    );
  } catch {
    try { unlinkSync(htmlPath); } catch {}
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }

  try { unlinkSync(htmlPath); } catch {}

  const pdfBuffer = readFileSync(pdfPath);

  const storagePath = `handover/${body.tenantId}/${id}/${fileId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  try { unlinkSync(pdfPath); } catch {}

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(storagePath);

  await supabase
    .from('sal_orders')
    .update({ handover_pdf_path: storagePath })
    .eq('id', id)
    .eq('tenant_id', body.tenantId);

  return NextResponse.json({
    success: true,
    pdfUrl: publicUrl?.publicUrl ?? storagePath,
  });
}
