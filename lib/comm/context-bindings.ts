import { getServerClient } from '@/lib/supabase-server';

// BOP V2 Communication Center — context loaders + binding registry.
// Governing doc: BOP_COMM_CENTER_PLAN.md §1/§4. Mirrors EmailComposer.spec.md's
// ContextBinding contract with `companyId` renamed `tenantId` to match BOP's
// actual vocabulary (bop_tenants.tenant_id, the `?tenant=` query convention).
//
// Tenant scoping here follows the SAME convention already live across BOP V2
// (see e.g. app/api/bop/mkp/bop-listings/route.ts): the caller passes tenantId,
// resolved server-side from the ?tenant= param / session, and every query is
// filtered .eq('tenant_id', tenantId). There is no session-based RLS anywhere
// in BOP V2 yet (api-guard.ts only resolves role/uid) — this is not a gap
// unique to this module, and every bop_comm_* table already carries tenant_id
// against bop_tenants so it inherits real RLS the moment that platform-wide
// item ships. Callers (the API routes) are responsible for checking the
// caller's role/tenant assignment before invoking a loader — the loader's job
// is to never return a row outside the tenantId it was given.

export type ContextType = 'vehicle' | 'customer' | 'invoice' | 'listing' | 'sell_lead' | 'crm_lead' | 'order' | 'quotation' | 'handover';

export interface ContextData {
  scope: Record<string, Record<string, string>>; // { Vehicle: {...}, Customer: {...}, ... }
  recipients: { to: string; name: string }[];
  links: { module: string; recordId: string; label: string }[];
}

export interface ContextBinding {
  loader: (recordId: string, tenantId: number) => Promise<ContextData | null>;
  categories: string[];
  smartObjects: string[];
  primaryStyle: string;
}

function fmtMoney(amount: number | null | undefined, currency = 'EUR'): string {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amount);
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// ── Vehicle context — sales-side view of a bop_listings row ─────────────────
// Same underlying table as `listing` (bop_listings), different scope/category
// filters and smart-objects per plan §1's binding table.
async function loadVehicleContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('bop_listings')
    .select(`
      id, tenant_id, ref_no, sale_method, status, category, brand_id, model_id,
      year, condition, des_score,
      bop_brands ( name ),
      bop_models ( name ),
      bop_listing_pricing ( asking_price, currency ),
      bop_listing_content ( locale, title ),
      bop_listing_media ( url, is_cover, locale )
    `)
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) return null;

  const pricing = one<any>(data.bop_listing_pricing);
  const brand = one<any>(data.bop_brands);
  const model = one<any>(data.bop_models);
  const cover = (data.bop_listing_media as any[] | null)?.find(m => m.is_cover) ?? (data.bop_listing_media as any[] | null)?.[0];
  const contentEn = (data.bop_listing_content as any[] | null)?.find(c => c.locale === 'en') ?? (data.bop_listing_content as any[] | null)?.[0];

  return {
    scope: {
      Vehicle: {
        Id: data.id, RefNo: data.ref_no ?? '', Brand: brand?.name ?? '', Model: model?.name ?? '',
        Year: String(data.year ?? ''), Condition: data.condition ?? '', Status: data.status ?? '',
        Price: fmtMoney(pricing?.asking_price, pricing?.currency ?? 'EUR'),
        VatLabel: 'Excl. VAT / margin scheme applicable', // resolved precisely by FI once VAT-scheme field lands
        HeroImage: cover?.url ?? '',
        Title: contentEn?.title ?? `${brand?.name ?? ''} ${model?.name ?? ''}`.trim(),
        DesScore: String(data.des_score ?? ''),
      },
      // Corporate master's header structurally needs Document.Type/Number —
      // every module record can reasonably expose this facet (an offer note
      // IS a document; ref_no IS its number), so this generalizes beyond
      // just this loader rather than being a one-off patch for one template.
      Document: { Type: 'Vehicle Offer', Number: data.ref_no ?? data.id.slice(0, 8) },
    },
    recipients: [], // filled by the caller once a specific lead/customer email is known — vehicle context alone has no recipient
    links: [{ module: 'marketplace', recordId: data.id, label: data.ref_no ?? data.id }],
  };
}

// ── Customer context ─────────────────────────────────────────────────────────
async function loadCustomerContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('mdm_business_partners')
    .select('id, tenant_id, name, company_name, email, phone, status, mdm_partner_roles(role_type, is_primary)')
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) return null;

  const [firstName, ...rest] = (data.name ?? '').split(' ');
  return {
    scope: {
      Customer: {
        Id: data.id, FirstName: firstName ?? '', LastName: rest.join(' '), FullName: data.name ?? '',
        CompanyName: data.company_name ?? '', Email: data.email ?? '', Phone: data.phone ?? '',
        Status: data.status ?? '',
      },
    },
    recipients: data.email ? [{ to: data.email, name: data.name ?? data.company_name ?? data.email }] : [],
    links: [{ module: 'crm', recordId: data.id, label: data.name ?? data.company_name ?? data.id }],
  };
}

// ── Invoice context — joins its Customer so a Finance email only needs one recordId ──
async function loadInvoiceContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('fin_invoices')
    .select(`
      id, tenant_id, invoice_number, status, amount, vat_amount, currency, due_date, created_at,
      partner_id, mdm_business_partners ( id, name, company_name, email ),
      sal_quotations ( id, quote_number )
    `)
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) return null;

  const partner = one<any>(data.mdm_business_partners);
  const total = (data as any).amount !== null && (data as any).vat_amount !== null
    ? Number((data as any).amount) + Number((data as any).vat_amount)
    : (data as any).amount;

  return {
    scope: {
      Invoice: {
        Id: data.id, Number: data.invoice_number ?? '', Status: data.status ?? '',
        Amount: fmtMoney((data as any).amount, (data as any).currency ?? 'EUR'),
        VatAmount: fmtMoney((data as any).vat_amount, (data as any).currency ?? 'EUR'),
        Total: fmtMoney(total, (data as any).currency ?? 'EUR'),
        DueDate: (data as any).due_date ?? '',
      },
      Customer: {
        Id: partner?.id ?? '', FullName: partner?.name ?? '', CompanyName: partner?.company_name ?? '',
        Email: partner?.email ?? '',
      },
    },
    recipients: partner?.email ? [{ to: partner.email, name: partner.name ?? partner.company_name ?? partner.email }] : [],
    links: [{ module: 'finance', recordId: data.id, label: data.invoice_number ?? data.id }],
  };
}

// ── Listing context — marketplace-side view of the same bop_listings row ────
// Distinct from `vehicle`: different categories/smart-objects (publish state,
// channel status) even though the source table is identical (plan §1).
async function loadListingContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('bop_listings')
    .select(`
      id, tenant_id, ref_no, status, workflow_status, category, published_at,
      brand_id, model_id, bop_brands ( name ), bop_models ( name ),
      bop_listing_pricing ( asking_price, currency ),
      bop_listing_channels ( channel, status )
    `)
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) return null;

  const pricing = one<any>(data.bop_listing_pricing);
  const brand = one<any>(data.bop_brands);
  const model = one<any>(data.bop_models);
  const channels = (data.bop_listing_channels as any[] | null) ?? [];

  return {
    scope: {
      Listing: {
        Id: data.id, RefNo: data.ref_no ?? '', Status: data.status ?? '', WorkflowStatus: data.workflow_status ?? '',
        PublishedAt: data.published_at ?? '', ChannelCount: String(channels.filter(c => c.status === 'live').length),
        Channels: channels.filter(c => c.status === 'live').map(c => c.channel).join(', '),
      },
      Vehicle: {
        Brand: brand?.name ?? '', Model: model?.name ?? '',
        Price: fmtMoney(pricing?.asking_price, pricing?.currency ?? 'EUR'),
      },
    },
    recipients: [], // listing-triggered automation (e.g. listing.published) resolves recipients from the automation event payload, not here
    links: [{ module: 'marketplace', recordId: data.id, label: data.ref_no ?? data.id }],
  };
}

// ── Sell Lead context — acquisition funnel (sell_leads table) ────────────────
async function loadSellLeadContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('sell_leads')
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (!data) return null;

  const vehicle = [data.make, data.model, data.build_year ? `(${data.build_year})` : ''].filter(Boolean).join(' ');

  return {
    scope: {
      SellLead: {
        Id: data.id,
        Ref: data.ref ?? '',
        Vehicle: vehicle,
        Type: data.vehicle_type ?? '',
        Plate: data.license_plate ?? '',
        Mileage: data.mileage_km ? Number(data.mileage_km).toLocaleString('nl-NL') : '',
        Condition: data.condition ?? '',
        AskingPrice: fmtMoney(data.asking_price_eur),
        OfferAmount: fmtMoney(data.our_offer_eur),
        Status: data.status ?? '',
        Source: data.source ?? '',
      },
      Seller: {
        Name: data.seller_name ?? '',
        Email: data.seller_email ?? '',
        Phone: data.seller_phone ?? '',
        City: data.seller_city ?? '',
      },
      Document: { Type: 'Sell Lead', Number: data.ref ?? data.id.slice(0, 8) },
    },
    recipients: data.seller_email ? [{ to: data.seller_email, name: data.seller_name ?? data.seller_email }] : [],
    links: [{ module: 'sal', recordId: data.id, label: data.ref ?? data.id }],
  };
}

async function loadCrmLeadContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('crm_leads')
    .select(`
      id, tenant_id, ref_code, company_name, contact_name, stage, source, locale, notes,
      partner_id, mdm_business_partners ( id, company_name, email, phone, city, country, preferred_locale )
    `)
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!data) return null;

  const partner = one<any>(data.mdm_business_partners);

  const { data: tenant } = await supabase
    .from('bop_tenants')
    .select('name, domain')
    .eq('tenant_id', tenantId)
    .single();

  const emailFromNotes = (data.notes ?? '').match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0];
  const recipientEmail = partner?.email ?? emailFromNotes;
  const recipientName = partner?.company_name ?? data.contact_name ?? data.company_name ?? recipientEmail;

  return {
    scope: {
      Lead: {
        Id: data.id,
        RefCode: data.ref_code ?? '',
        CompanyName: data.company_name ?? '',
        ContactName: data.contact_name ?? '',
        Stage: data.stage ?? '',
        Source: data.source ?? '',
        Locale: data.locale ?? '',
        Notes: data.notes ?? '',
      },
      Partner: {
        Name: partner?.company_name ?? '',
        Email: partner?.email ?? '',
        Phone: partner?.phone ?? '',
        City: partner?.city ?? '',
        Country: partner?.country ?? '',
        PreferredLocale: partner?.preferred_locale ?? '',
      },
      Tenant: {
        Name: tenant?.name ?? '',
        Domain: tenant?.domain ?? '',
      },
      Document: { Type: 'CRM Lead', Number: data.ref_code ?? data.id.slice(0, 8) },
    },
    recipients: recipientEmail ? [{ to: recipientEmail, name: recipientName ?? recipientEmail }] : [],
    links: [{ module: 'crm', recordId: data.id, label: data.ref_code ?? data.id }],
  };
}

async function loadOrderContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('sal_orders')
    .select('*, mdm_business_partners ( id, company_name, email, phone, city, country, preferred_locale )')
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data) return null;
  const partner = one<any>(data.mdm_business_partners);
  const { data: tenant } = await supabase.from('bop_tenants').select('name, domain').eq('tenant_id', tenantId).single();
  return {
    scope: {
      Order: { Id: data.id, Number: data.number ?? '', Status: data.status ?? '', Total: String(data.total ?? 0), Locale: data.locale ?? 'en' },
      Partner: { Name: partner?.company_name ?? '', Email: partner?.email ?? '', Phone: partner?.phone ?? '', City: partner?.city ?? '', Country: partner?.country ?? '' },
      Tenant: { Name: tenant?.name ?? '', Domain: tenant?.domain ?? '' },
      Document: { Type: 'Order', Number: data.number ?? data.id.slice(0, 8) },
    },
    recipients: partner?.email ? [{ to: partner.email, name: partner.company_name ?? partner.email }] : [],
    links: [{ module: 'sal', recordId: data.id, label: data.number ?? data.id }],
  };
}

async function loadQuotationContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('sal_quotations')
    .select('*, mdm_business_partners ( id, company_name, email, phone, city, country, preferred_locale )')
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data) return null;
  const partner = one<any>(data.mdm_business_partners);
  const { data: tenant } = await supabase.from('bop_tenants').select('name, domain').eq('tenant_id', tenantId).single();
  return {
    scope: {
      Quotation: { Id: data.id, Number: data.number ?? '', Status: data.status ?? '', Total: String(data.total ?? 0), ValidityDate: data.validity_date ?? '', Locale: data.locale ?? 'en' },
      Partner: { Name: partner?.company_name ?? '', Email: partner?.email ?? '', Phone: partner?.phone ?? '', City: partner?.city ?? '', Country: partner?.country ?? '' },
      Tenant: { Name: tenant?.name ?? '', Domain: tenant?.domain ?? '' },
      Document: { Type: 'Quotation', Number: data.number ?? data.id.slice(0, 8) },
    },
    recipients: partner?.email ? [{ to: partner.email, name: partner.company_name ?? partner.email }] : [],
    links: [{ module: 'sal', recordId: data.id, label: data.number ?? data.id }],
  };
}

async function loadHandoverContext(recordId: string, tenantId: number): Promise<ContextData | null> {
  const supabase = getServerClient();
  const { data } = await supabase
    .from('sal_orders')
    .select('*, mdm_business_partners ( id, company_name, email, phone, city, country, preferred_locale )')
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data) return null;
  const partner = one<any>(data.mdm_business_partners);
  const { data: tenant } = await supabase.from('bop_tenants').select('name, domain').eq('tenant_id', tenantId).single();
  return {
    scope: {
      Order: { Id: data.id, Number: data.number ?? '', Status: data.status ?? '' },
      Partner: { Name: partner?.company_name ?? '', Email: partner?.email ?? '', Phone: partner?.phone ?? '' },
      Tenant: { Name: tenant?.name ?? '', Domain: tenant?.domain ?? '' },
      Document: { Type: 'Handover', Number: data.number ?? data.id.slice(0, 8) },
    },
    recipients: partner?.email ? [{ to: partner.email, name: partner.company_name ?? partner.email }] : [],
    links: [{ module: 'sal', recordId: data.id, label: data.number ?? data.id }],
  };
}

// Category naming: `{contextType}.{name}` (e.g. 'vehicle.offer',
// 'invoice.reminder') — consistent with bop_comm_automation.event_code's own
// dot-notation, and matches what actually goes into bop_comm_template.category.
// (The originally-supplied spec used short forms like 'offer' with no prefix;
// standardized here since bop_comm_template.category has no context_type-scoped
// uniqueness of its own — 'offer' alone could collide across contexts.)
export const CONTEXT_BINDINGS: Record<ContextType, ContextBinding> = {
  vehicle: {
    loader: loadVehicleContext,
    categories: ['vehicle.offer', 'vehicle.quote', 'vehicle.reservation', 'vehicle.sold', 'vehicle.delivery'],
    smartObjects: ['vehicle_card', 'price_box', 'spec_table'],
    primaryStyle: 'premium_automotive',
  },
  customer: {
    loader: loadCustomerContext,
    categories: ['customer.welcome', 'customer.followup', 'customer.review', 'customer.birthday'],
    smartObjects: ['customer_card', 'review_button'],
    primaryStyle: 'minimal',
  },
  invoice: {
    loader: loadInvoiceContext,
    categories: ['invoice.invoice', 'invoice.credit_note', 'invoice.reminder', 'invoice.refund'],
    smartObjects: ['invoice_summary', 'pay_button', 'line_items'],
    primaryStyle: 'corporate',
  },
  listing: {
    loader: loadListingContext,
    categories: ['listing.published', 'listing.rejected', 'listing.auction_won', 'listing.price_changed'],
    smartObjects: ['listing_card', 'countdown', 'bid_box'],
    primaryStyle: 'marketplace',
  },
  sell_lead: {
    loader: loadSellLeadContext,
    categories: ['sell_lead.received', 'sell_lead.offer', 'sell_lead.accepted', 'sell_lead.declined', 'sell_lead.admin'],
    smartObjects: ['vehicle_card', 'price_box'],
    primaryStyle: 'premium_automotive',
  },
  crm_lead: {
    loader: loadCrmLeadContext,
    categories: ['lead.reply', 'lead.first_contact', 'lead.followup', 'lead.closed'],
    smartObjects: ['lead_card'],
    primaryStyle: 'corporate',
  },
  order: {
    loader: loadOrderContext,
    categories: ['order.confirmation', 'order.ready', 'order.delivered', 'order.cancelled'],
    smartObjects: ['line_items', 'price_box'],
    primaryStyle: 'corporate',
  },
  quotation: {
    loader: loadQuotationContext,
    categories: ['quote.sent', 'quote.reminder', 'quote.accepted', 'quote.expired'],
    smartObjects: ['line_items', 'price_box'],
    primaryStyle: 'corporate',
  },
  handover: {
    loader: loadHandoverContext,
    categories: ['handover.invite', 'handover.signed', 'handover.reminder'],
    smartObjects: ['vehicle_card'],
    primaryStyle: 'corporate',
  },
};
