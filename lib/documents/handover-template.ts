import type { SupportedLocale } from '@/lib/comm/resolve-locale';

export interface HandoverData {
  locale: SupportedLocale;
  tenantName: string;
  tenantAddress?: string;
  tenantLogo?: string;
  tenantKvk?: string;
  customerName: string;
  customerAddress?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVin?: string;
  vehicleLicensePlate?: string;
  vehicleMileage?: number;
  vehicleColor?: string;
  vehicleYear?: number;
  orderNumber?: string;
  deliveryDate: string;
  accessories?: string[];
  damages?: string[];
  notes?: string;
}

export interface HandoverSignature {
  signatureDataUrl: string;
  signerName: string;
  signerRole: 'customer' | 'dealer';
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

const LABELS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    title: 'Delivery Certificate',
    vehicleDetails: 'Vehicle Details',
    brand: 'Brand',
    model: 'Model',
    vin: 'VIN',
    licensePlate: 'License Plate',
    mileage: 'Mileage (km)',
    color: 'Color',
    year: 'Year',
    orderRef: 'Order Reference',
    accessories: 'Accessories',
    damageReport: 'Damage Report',
    noDamages: 'No damages reported.',
    notes: 'Notes',
    customerSignature: 'Customer Signature',
    dealerSignature: 'Dealer Signature',
    name: 'Name',
    date: 'Date',
    signature: 'Signature',
    deliveryDate: 'Delivery Date',
    customer: 'Customer',
    address: 'Address',
    kvk: 'KVK',
    eidasFooter: 'This document constitutes a digitally signed delivery certificate in accordance with EU Regulation 910/2014 (eIDAS). The signatures above were captured electronically.',
    generatedAt: 'Generated at',
  },
  nl: {
    title: 'Afleverbon',
    vehicleDetails: 'Voertuiggegevens',
    brand: 'Merk',
    model: 'Model',
    vin: 'Chassisnummer',
    licensePlate: 'Kenteken',
    mileage: 'Kilometerstand',
    color: 'Kleur',
    year: 'Bouwjaar',
    orderRef: 'Orderreferentie',
    accessories: 'Accessoires',
    damageReport: 'Schaderapport',
    noDamages: 'Geen schade gemeld.',
    notes: 'Opmerkingen',
    customerSignature: 'Handtekening Klant',
    dealerSignature: 'Handtekening Dealer',
    name: 'Naam',
    date: 'Datum',
    signature: 'Handtekening',
    deliveryDate: 'Afleverdatum',
    customer: 'Klant',
    address: 'Adres',
    kvk: 'KVK',
    eidasFooter: 'Dit document vormt een digitaal ondertekend afleveringscertificaat in overeenstemming met EU-verordening 910/2014 (eIDAS). De bovenstaande handtekeningen zijn elektronisch vastgelegd.',
    generatedAt: 'Gegenereerd op',
  },
  de: {
    title: 'Übergabeprotokoll',
    vehicleDetails: 'Fahrzeugdaten',
    brand: 'Marke',
    model: 'Modell',
    vin: 'Fahrgestellnummer',
    licensePlate: 'Kennzeichen',
    mileage: 'Kilometerstand',
    color: 'Farbe',
    year: 'Baujahr',
    orderRef: 'Bestellreferenz',
    accessories: 'Zubehör',
    damageReport: 'Schadensbericht',
    noDamages: 'Keine Schäden gemeldet.',
    notes: 'Anmerkungen',
    customerSignature: 'Unterschrift Kunde',
    dealerSignature: 'Unterschrift Händler',
    name: 'Name',
    date: 'Datum',
    signature: 'Unterschrift',
    deliveryDate: 'Lieferdatum',
    customer: 'Kunde',
    address: 'Adresse',
    kvk: 'Handelsregister',
    eidasFooter: 'Dieses Dokument stellt ein digital unterzeichnetes Übergabeprotokoll gemäß EU-Verordnung 910/2014 (eIDAS) dar. Die obigen Unterschriften wurden elektronisch erfasst.',
    generatedAt: 'Erstellt am',
  },
  fr: {
    title: 'Bon de livraison',
    vehicleDetails: 'Détails du véhicule',
    brand: 'Marque',
    model: 'Modèle',
    vin: 'Numéro de châssis',
    licensePlate: "Plaque d'immatriculation",
    mileage: 'Kilométrage',
    color: 'Couleur',
    year: 'Année',
    orderRef: 'Référence de commande',
    accessories: 'Accessoires',
    damageReport: 'Rapport de dommages',
    noDamages: 'Aucun dommage signalé.',
    notes: 'Remarques',
    customerSignature: 'Signature du client',
    dealerSignature: 'Signature du concessionnaire',
    name: 'Nom',
    date: 'Date',
    signature: 'Signature',
    deliveryDate: 'Date de livraison',
    customer: 'Client',
    address: 'Adresse',
    kvk: 'Registre du commerce',
    eidasFooter: "Ce document constitue un certificat de livraison signé numériquement conformément au règlement UE 910/2014 (eIDAS). Les signatures ci-dessus ont été saisies électroniquement.",
    generatedAt: 'Généré le',
  },
  tr: {
    title: 'Teslimat Belgesi',
    vehicleDetails: 'Araç Bilgileri',
    brand: 'Marka',
    model: 'Model',
    vin: 'Şasi Numarası',
    licensePlate: 'Plaka',
    mileage: 'Kilometre',
    color: 'Renk',
    year: 'Yıl',
    orderRef: 'Sipariş Referansı',
    accessories: 'Aksesuarlar',
    damageReport: 'Hasar Raporu',
    noDamages: 'Hasar bildirilmedi.',
    notes: 'Notlar',
    customerSignature: 'Müşteri İmzası',
    dealerSignature: 'Bayi İmzası',
    name: 'Ad',
    date: 'Tarih',
    signature: 'İmza',
    deliveryDate: 'Teslimat Tarihi',
    customer: 'Müşteri',
    address: 'Adres',
    kvk: 'Ticaret Sicili',
    eidasFooter: 'Bu belge, AB Yönetmeliği 910/2014 (eIDAS) uyarınca dijital olarak imzalanmış bir teslimat belgesidir. Yukarıdaki imzalar elektronik olarak alınmıştır.',
    generatedAt: 'Oluşturulma tarihi',
  },
};

function esc(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function detailRow(label: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  return `<tr><td style="padding:6px 12px;font-weight:600;border:1px solid #d0d0d0;background:#f8f9fa;width:200px">${esc(label)}</td><td style="padding:6px 12px;border:1px solid #d0d0d0">${esc(String(value))}</td></tr>`;
}

function signatureBlock(l: Record<string, string>, role: 'customer' | 'dealer', sig?: HandoverSignature): string {
  const title = role === 'customer' ? l.customerSignature : l.dealerSignature;
  const sigImage = sig
    ? `<img src="${esc(sig.signatureDataUrl)}" style="max-width:280px;max-height:100px;display:block;margin:8px 0" alt="${esc(title)}" />`
    : '<div style="height:80px;border-bottom:1px solid #333;margin:8px 0"></div>';
  const sigName = sig ? esc(sig.signerName) : '';
  const sigDate = sig ? esc(sig.signedAt) : '';

  return `
    <div style="flex:1;min-width:260px">
      <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#555">${esc(title)}</h3>
      ${sigImage}
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr><td style="padding:4px 0;color:#777;width:80px">${esc(l.name)}:</td><td>${sigName}</td></tr>
        <tr><td style="padding:4px 0;color:#777">${esc(l.date)}:</td><td>${sigDate}</td></tr>
      </table>
    </div>`;
}

export function buildHandoverHtml(data: HandoverData, signatures?: HandoverSignature[]): string {
  const l = LABELS[data.locale] ?? LABELS.en;
  const customerSig = signatures?.find(s => s.signerRole === 'customer');
  const dealerSig = signatures?.find(s => s.signerRole === 'dealer');
  const mileageFormatted = data.vehicleMileage != null
    ? new Intl.NumberFormat(data.locale === 'en' ? 'en-GB' : `${data.locale}-${data.locale.toUpperCase()}`).format(data.vehicleMileage)
    : undefined;

  const accessoriesHtml = data.accessories && data.accessories.length > 0
    ? `<div style="margin-top:24px">
        <h2 style="font-size:15px;margin:0 0 8px;color:#222">${esc(l.accessories)}</h2>
        <ul style="margin:0;padding-left:20px;font-size:13px">${data.accessories.map(a => `<li style="padding:2px 0">${esc(a)}</li>`).join('')}</ul>
      </div>`
    : '';

  const damagesHtml = `<div style="margin-top:24px">
    <h2 style="font-size:15px;margin:0 0 8px;color:#222">${esc(l.damageReport)}</h2>
    ${data.damages && data.damages.length > 0
      ? `<ul style="margin:0;padding-left:20px;font-size:13px">${data.damages.map(d => `<li style="padding:2px 0;color:#c0392b">${esc(d)}</li>`).join('')}</ul>`
      : `<p style="font-size:13px;color:#777;margin:4px 0">${esc(l.noDamages)}</p>`}
  </div>`;

  const notesHtml = data.notes
    ? `<div style="margin-top:24px">
        <h2 style="font-size:15px;margin:0 0 8px;color:#222">${esc(l.notes)}</h2>
        <p style="font-size:13px;margin:4px 0;white-space:pre-wrap">${esc(data.notes)}</p>
      </div>`
    : '';

  const logoHtml = data.tenantLogo
    ? `<img src="${esc(data.tenantLogo)}" style="max-height:50px;max-width:180px" alt="${esc(data.tenantName)}" />`
    : '';

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return `<!DOCTYPE html>
<html lang="${data.locale}">
<head>
  <meta charset="utf-8" />
  <title>${esc(l.title)} — ${esc(data.orderNumber ?? '')}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 0; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="max-width:210mm;margin:0 auto;padding:20mm">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #222;padding-bottom:16px;margin-bottom:24px">
      <div>
        ${logoHtml}
        <div style="font-size:16px;font-weight:700;margin-top:4px">${esc(data.tenantName)}</div>
        ${data.tenantAddress ? `<div style="font-size:12px;color:#555">${esc(data.tenantAddress)}</div>` : ''}
        ${data.tenantKvk ? `<div style="font-size:11px;color:#777">${esc(l.kvk)}: ${esc(data.tenantKvk)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:700;color:#222">${esc(l.title)}</div>
        ${data.orderNumber ? `<div style="font-size:13px;color:#555;margin-top:4px">${esc(l.orderRef)}: ${esc(data.orderNumber)}</div>` : ''}
        <div style="font-size:13px;color:#555">${esc(l.deliveryDate)}: ${esc(data.deliveryDate)}</div>
      </div>
    </div>

    <div style="margin-bottom:24px;padding:12px;border:1px solid #e0e0e0;border-radius:4px;background:#fafafa">
      <div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${esc(l.customer)}</div>
      <div style="font-size:14px;font-weight:600">${esc(data.customerName)}</div>
      ${data.customerAddress ? `<div style="font-size:12px;color:#555">${esc(data.customerAddress)}</div>` : ''}
    </div>

    <h2 style="font-size:15px;margin:0 0 8px;color:#222">${esc(l.vehicleDetails)}</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      ${detailRow(l.brand, data.vehicleBrand)}
      ${detailRow(l.model, data.vehicleModel)}
      ${detailRow(l.vin, data.vehicleVin)}
      ${detailRow(l.licensePlate, data.vehicleLicensePlate)}
      ${detailRow(l.mileage, mileageFormatted)}
      ${detailRow(l.color, data.vehicleColor)}
      ${detailRow(l.year, data.vehicleYear)}
    </table>

    ${accessoriesHtml}
    ${damagesHtml}
    ${notesHtml}

    <div style="margin-top:40px;display:flex;gap:40px;flex-wrap:wrap">
      ${signatureBlock(l, 'dealer', dealerSig)}
      ${signatureBlock(l, 'customer', customerSig)}
    </div>

    <div style="margin-top:48px;padding-top:16px;border-top:1px solid #d0d0d0;font-size:10px;color:#888;line-height:1.6">
      <p style="margin:0">${esc(l.eidasFooter)}</p>
      <p style="margin:4px 0 0">${esc(l.generatedAt)}: ${now}</p>
    </div>

  </div>
</body>
</html>`;
}
