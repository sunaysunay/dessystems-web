'use client';
// SY043 — TFE Flow Viewer: interactive visual guide to the Trade Flow Engine
// object pipeline, status machines, guard rails, and doc-flow relations.
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const ACCENT = '#2563eb';
const TEAL = '#0d9488';
const AMBER = '#d97706';
const RED = '#dc2626';
const GREEN = '#16a34a';
const PURPLE = '#7c3aed';
const PINK = '#db2777';
const ORANGE = '#ea580c';

type ObjectKey = 'lead' | 'quotation' | 'order' | 'invoice' | 'handover' | 'warranty' | 'survey' | 'sell_lead';

const OBJECTS: Record<ObjectKey, {
  label: string; table: string; module: string; moduleColor: string; color: string;
  field: string; statuses: { name: string; type: 's-active' | 's-end' | 's-conv' | 's-warn' | 's-neutral' }[];
  transitions: { from: string; to: string; guard?: string; rpc?: string; note?: string }[];
  notes: string[];
}> = {
  lead: {
    label: 'Lead', table: 'crm_leads', module: 'CRM', moduleColor: PURPLE, color: PURPLE,
    field: 'stage (not status)',
    statuses: [
      { name: 'new', type: 's-active' }, { name: 'assigned', type: 's-active' },
      { name: 'contacted', type: 's-active' }, { name: 'qualified', type: 's-active' },
      { name: 'converted', type: 's-conv' }, { name: 'archived', type: 's-neutral' },
      { name: 'lost', type: 's-end' },
    ],
    transitions: [
      { from: 'new', to: 'assigned', rpc: 'bop_lead_transition()' },
      { from: 'assigned', to: 'contacted', rpc: 'bop_lead_transition()' },
      { from: 'contacted', to: 'qualified', rpc: 'bop_lead_transition()' },
      { from: 'qualified', to: 'converted', rpc: 'bop_convert_lead()', note: 'Creates Case + Quotation/Order' },
      { from: 'converted', to: 'archived', rpc: 'bop_lead_transition()' },
      { from: 'any active', to: 'lost', rpc: 'bop_lead_transition()' },
      { from: 'lost', to: 'new', rpc: 'bop_lead_transition()', note: 'Reopen' },
      { from: 'lost', to: 'archived', rpc: 'bop_lead_transition()' },
    ],
    notes: ['Guard trigger: bop_guard_stage_update()', 'Conversion creates bop_doc_flow record with relation "converted"'],
  },
  quotation: {
    label: 'Quotation', table: 'sal_quotations', module: 'SAL', moduleColor: GREEN, color: ACCENT,
    field: 'status',
    statuses: [
      { name: 'draft', type: 's-active' }, { name: 'sent', type: 's-active' },
      { name: 'viewed', type: 's-active' }, { name: 'accepted', type: 's-conv' },
      { name: 'declined', type: 's-end' }, { name: 'expired', type: 's-warn' },
      { name: 'cancelled', type: 's-end' },
    ],
    transitions: [
      { from: 'draft', to: 'sent', guard: 'snapshot_frozen', rpc: 'bop_quotation_send()' },
      { from: 'sent', to: 'viewed', rpc: 'bop_quotation_transition()' },
      { from: 'sent', to: 'accepted', guard: 'approval_token', rpc: 'bop_quotation_transition()' },
      { from: 'viewed', to: 'accepted', guard: 'approval_token', rpc: 'bop_quotation_transition()' },
      { from: 'sent/viewed', to: 'declined', guard: 'approval_token', rpc: 'bop_quotation_transition()' },
      { from: 'sent/viewed', to: 'expired', guard: 'valid_until_passed' },
      { from: 'accepted', to: 'expired', guard: 'new_version_created', note: 'Auto on new version' },
      { from: 'draft/sent', to: 'cancelled', rpc: 'bop_quotation_transition()' },
    ],
    notes: ['Versioning: new version → old expires with doc-flow "replaced"', 'Accepted quotation converts to Order with doc-flow "converted"'],
  },
  order: {
    label: 'Order', table: 'sal_orders', module: 'SAL', moduleColor: GREEN, color: GREEN,
    field: 'status',
    statuses: [
      { name: 'draft', type: 's-active' }, { name: 'confirmed', type: 's-active' },
      { name: 'customer_confirmed', type: 's-active' }, { name: 'in_preparation', type: 's-active' },
      { name: 'ready', type: 's-active' }, { name: 'handover_scheduled', type: 's-active' },
      { name: 'delivered', type: 's-conv' }, { name: 'completed', type: 's-conv' },
      { name: 'cancelled', type: 's-end' },
    ],
    transitions: [
      { from: 'draft', to: 'confirmed', guard: 'koopovereenkomst_sent', rpc: 'bop_order_confirm()', note: 'Creates OLS vehicle lock' },
      { from: 'confirmed', to: 'customer_confirmed', guard: 'approval_token', rpc: 'bop_order_transition()' },
      { from: 'customer_confirmed', to: 'in_preparation', rpc: 'bop_order_transition()' },
      { from: 'in_preparation', to: 'ready', rpc: 'bop_order_transition()' },
      { from: 'ready', to: 'handover_scheduled', guard: 'delivery_date_set', rpc: 'bop_create_handover_from_order()', note: 'Spawns Handover' },
      { from: 'handover_scheduled', to: 'delivered', rpc: 'bop_handover_complete()', note: 'Set by Handover completion' },
      { from: 'delivered', to: 'completed', guard: 'paid_in_full', rpc: 'bop_order_transition()' },
      { from: 'draft/confirmed/cust_confirmed/in_prep', to: 'cancelled', rpc: 'bop_order_cancel()', note: 'Releases OLS lock' },
    ],
    notes: ['Spawns Invoice: bop_create_invoice_from_order() — doc-flow "converted"', 'Spawns Handover: bop_create_handover_from_order() — doc-flow "converted"'],
  },
  invoice: {
    label: 'Invoice', table: 'fin_invoices', module: 'FIN', moduleColor: AMBER, color: AMBER,
    field: 'status',
    statuses: [
      { name: 'draft', type: 's-active' }, { name: 'sent', type: 's-active' },
      { name: 'partial', type: 's-warn' }, { name: 'paid', type: 's-conv' },
      { name: 'overdue', type: 's-end' }, { name: 'credited', type: 's-neutral' },
      { name: 'cancelled', type: 's-end' },
    ],
    transitions: [
      { from: 'draft', to: 'sent', guard: 'snapshot_frozen', rpc: 'bop_invoice_transition()' },
      { from: 'sent', to: 'partial', guard: 'payment_received', rpc: 'bop_invoice_transition()' },
      { from: 'sent/partial', to: 'paid', guard: 'fully_paid', rpc: 'bop_invoice_transition()' },
      { from: 'sent/partial', to: 'overdue', guard: 'past_due_date', rpc: 'bop_invoice_transition()' },
      { from: 'overdue', to: 'partial', guard: 'payment_received', rpc: 'bop_invoice_transition()', note: 'Recovery' },
      { from: 'overdue', to: 'paid', guard: 'fully_paid', rpc: 'bop_invoice_transition()', note: 'Recovery' },
      { from: 'paid', to: 'credited', guard: 'credit_note_issued', rpc: 'bop_invoice_transition()' },
      { from: 'draft/sent', to: 'cancelled', rpc: 'bop_invoice_transition()' },
    ],
    notes: ['Invoice "paid" satisfies paid_in_full guard for Order → completed'],
  },
  handover: {
    label: 'Handover', table: 'sal_handovers', module: 'SAL', moduleColor: GREEN, color: TEAL,
    field: 'status',
    statuses: [
      { name: 'scheduled', type: 's-active' }, { name: 'in_progress', type: 's-active' },
      { name: 'executed', type: 's-active' }, { name: 'completed', type: 's-conv' },
      { name: 'cancelled', type: 's-end' },
    ],
    transitions: [
      { from: 'scheduled', to: 'in_progress', rpc: 'bop_handover_transition()' },
      { from: 'in_progress', to: 'executed', guard: 'checklist_complete', rpc: 'bop_handover_transition()' },
      { from: 'executed', to: 'completed', guard: 'signature_captured', rpc: 'bop_handover_complete()', note: 'Sets Order → delivered, releases OLS lock' },
      { from: 'scheduled/in_progress', to: 'cancelled', rpc: 'bop_handover_transition()' },
    ],
    notes: ['Spawns Warranty: bop_create_warranty_from_handover() — doc-flow "spawned"', 'Spawns Survey: auto-scheduled after completion'],
  },
  warranty: {
    label: 'Warranty', table: 'sal_warranties', module: 'POST', moduleColor: PINK, color: PINK,
    field: 'status',
    statuses: [
      { name: 'active', type: 's-active' }, { name: 'claimed', type: 's-warn' },
      { name: 'expired', type: 's-neutral' }, { name: 'voided', type: 's-end' },
    ],
    transitions: [
      { from: 'active', to: 'claimed', rpc: 'manual' },
      { from: 'active', to: 'expired', rpc: 'bop_expire_warranties()', note: 'Auto when expires_at < today' },
      { from: 'any', to: 'voided', rpc: 'manual' },
    ],
    notes: ['expires_at = starts_at + term_months (default 6 months)', 'Warranty type: standard (default)'],
  },
  survey: {
    label: 'Survey', table: 'sal_surveys', module: 'POST', moduleColor: PINK, color: ORANGE,
    field: 'status',
    statuses: [
      { name: 'scheduled', type: 's-active' }, { name: 'sent', type: 's-active' },
      { name: 'completed', type: 's-conv' }, { name: 'expired', type: 's-warn' },
      { name: 'skipped', type: 's-neutral' },
    ],
    transitions: [
      { from: 'scheduled', to: 'sent', rpc: 'auto' },
      { from: 'sent', to: 'completed', rpc: 'bop_submit_survey()' },
      { from: 'any', to: 'expired', rpc: 'auto' },
      { from: 'any', to: 'skipped', rpc: 'manual' },
    ],
    notes: ['NPS ≥ 9: auto-routes to Google review (review_routed = true)', 'NPS ≤ 6: auto-escalates (escalated = true)'],
  },
  sell_lead: {
    label: 'Sell Lead', table: 'sell_leads', module: 'SAL', moduleColor: GREEN, color: ORANGE,
    field: 'status',
    statuses: [
      { name: 'new', type: 's-active' }, { name: 'reviewing', type: 's-active' },
      { name: 'offer_sent', type: 's-active' }, { name: 'negotiating', type: 's-active' },
      { name: 'accepted', type: 's-conv' }, { name: 'purchased', type: 's-conv' },
      { name: 'declined_by_us', type: 's-end' }, { name: 'rejected_by_seller', type: 's-end' },
      { name: 'expired', type: 's-warn' }, { name: 'lost', type: 's-end' },
    ],
    transitions: [
      { from: 'new', to: 'reviewing', note: 'Internal evaluation begins' },
      { from: 'reviewing', to: 'offer_sent', rpc: 'send() via Comm Center', note: 'Sends SL-002 offer email' },
      { from: 'offer_sent', to: 'negotiating', note: 'Seller counter-offers' },
      { from: 'negotiating', to: 'accepted', note: 'Seller accepts' },
      { from: 'offer_sent', to: 'accepted', note: 'Direct acceptance' },
      { from: 'accepted', to: 'purchased', note: 'Vehicle collected & paid' },
      { from: 'offer_sent/negotiating', to: 'rejected_by_seller' },
      { from: 'any active', to: 'declined_by_us', note: 'Sends SL-004 rejection email' },
      { from: 'any active', to: 'expired' },
      { from: 'any active', to: 'lost' },
    ],
    notes: [
      'State machine enforced at application layer (PATCH handler), not via RPC guard triggers',
      'Ref code: SL + YY + WW + NNN (weekly-resetting counter via bop_counter)',
      'Emails: SL-001 received, SL-002 offer, SL-003 accepted, SL-004 declined, SL-005 admin',
      'Bulk delete from SA013 only for declined_by_us and lost statuses',
      'Standalone funnel — not part of bop_doc_flow or TFE guard system',
    ],
  },
};

const DOC_FLOW = [
  { rel: 'converted', color: ACCENT, desc: 'Source became target', ex: 'Lead → Quotation, Order → Invoice' },
  { rel: 'replaced', color: AMBER, desc: 'New version supersedes old', ex: 'Quotation v1 → v2' },
  { rel: 'spawned', color: TEAL, desc: 'Source triggered creation', ex: 'Handover → Warranty' },
  { rel: 'reversed', color: RED, desc: 'Target undoes source', ex: 'Invoice → Credit Note' },
  { rel: 'partial', color: PURPLE, desc: 'Partial conversion', ex: 'Order → Deposit Invoice' },
];

const GUARDS = [
  { icon: '⛔', bg: 'bg-red-50', title: 'No Direct Status UPDATEs', desc: 'All 7 TFE tables have guard triggers. Status changes only through RPCs that call bop_set_rpc_context() first.' },
  { icon: '📋', bg: 'bg-blue-50', title: 'Full Audit Trail', desc: 'Every RPC logs to bop_status_transitions — tenant, object_type, object_id, from/to status, actor, reason.' },
  { icon: '✓', bg: 'bg-green-50', title: 'Adjacency-Table Pattern', desc: 'Each object type has its own transitions table defining allowed from→to pairs. RPCs validate before updating.' },
  { icon: '🔒', bg: 'bg-amber-50', title: 'Vehicle Locking (OLS)', desc: 'bop_object_locks reserves a vehicle on order confirmation (30-day expiry). Released on handover completion or cancel.' },
  { icon: '🔗', bg: 'bg-purple-50', title: 'Customer Approvals', desc: 'bop_customer_approvals generates link-based tokens with expiry for quotation acceptance and order confirmation.' },
  { icon: '🔍', bg: 'bg-teal-50', title: 'Doc-Flow Integrity', desc: 'bop_check_doc_flow_integrity() finds orders/invoices/handovers without a bop_doc_flow record.' },
];

const statusStyle = (type: string) => {
  switch (type) {
    case 's-active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 's-end': return 'bg-red-100 text-red-700 border-red-200';
    case 's-conv': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 's-warn': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 's-neutral': return 'bg-slate-100 text-slate-500 border-slate-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

const PIPELINE_OBJECTS: ObjectKey[] = ['lead', 'quotation', 'order', 'invoice', 'handover', 'warranty', 'survey'];

type TabKey = 'pipeline' | 'guards' | 'docflow' | 'acquisition' | 'desshop' | 'shortlink';
const VALID_TABS: TabKey[] = ['pipeline', 'guards', 'docflow', 'acquisition', 'desshop', 'shortlink'];

type ShopObjectKey = 'cart' | 'shop_order' | 'payment' | 'fulfilment' | 'shipment';

const SHOP_OBJECTS: Record<ShopObjectKey, {
  label: string; table: string; module: string; moduleColor: string; color: string;
  field: string; statuses: { name: string; type: 's-active' | 's-end' | 's-conv' | 's-warn' | 's-neutral' }[];
  transitions: { from: string; to: string; guard?: string; rpc?: string; note?: string }[];
  notes: string[];
}> = {
  cart: {
    label: 'Cart', table: 'shop_carts', module: 'SHP', moduleColor: AMBER, color: PURPLE,
    field: 'state',
    statuses: [
      { name: 'active', type: 's-active' }, { name: 'merged', type: 's-neutral' },
      { name: 'converted', type: 's-conv' }, { name: 'abandoned', type: 's-end' },
    ],
    transitions: [
      { from: 'active', to: 'converted', guard: 'checkout_complete', note: 'Creates shop_orders row + lines' },
      { from: 'active', to: 'merged', note: 'Guest cart merged into auth cart' },
      { from: 'active', to: 'abandoned', note: 'TTL expired (30 days no activity)' },
    ],
    notes: ['Cart identified by session token (anon) or user_id (auth)', 'Stock reservation: soft hold via shop_stock_reservations (15 min TTL)'],
  },
  shop_order: {
    label: 'Order', table: 'shop_orders', module: 'SHP', moduleColor: AMBER, color: ACCENT,
    field: 'state',
    statuses: [
      { name: 'draft', type: 's-active' }, { name: 'pending_payment', type: 's-active' },
      { name: 'paid', type: 's-conv' }, { name: 'processing', type: 's-active' },
      { name: 'on_hold', type: 's-warn' }, { name: 'backordered', type: 's-warn' },
      { name: 'partially_shipped', type: 's-active' }, { name: 'shipped', type: 's-conv' },
      { name: 'completed', type: 's-conv' }, { name: 'cancelled', type: 's-end' },
      { name: 'partially_returned', type: 's-warn' }, { name: 'returned', type: 's-end' },
    ],
    transitions: [
      { from: 'draft', to: 'pending_payment', guard: 'checkout_submitted', note: 'Creates Mollie payment intent' },
      { from: 'pending_payment', to: 'paid', guard: 'mollie_webhook_paid', rpc: 'webhooks/mollie', note: 'Mollie webhook confirms payment' },
      { from: 'pending_payment', to: 'cancelled', guard: 'payment_expired', note: 'Mollie payment expired/failed' },
      { from: 'paid', to: 'processing', guard: 'stock_allocated', rpc: 'shop_allocate_order()', note: 'Allocations created for all lines' },
      { from: 'processing', to: 'on_hold', note: 'Manual hold by staff' },
      { from: 'on_hold', to: 'processing', note: 'Release hold' },
      { from: 'processing', to: 'backordered', guard: 'insufficient_stock', note: 'Some lines cannot be allocated' },
      { from: 'processing', to: 'partially_shipped', rpc: 'mark_shipped action', note: 'Some shipments dispatched, others pending' },
      { from: 'processing', to: 'shipped', rpc: 'mark_shipped action', note: 'All lines shipped in one go' },
      { from: 'partially_shipped', to: 'shipped', rpc: 'mark_shipped action', note: 'Final shipment completes all lines' },
      { from: 'shipped', to: 'completed', guard: 'all_delivered', note: 'Sendcloud webhook confirms delivery' },
      { from: 'paid/processing', to: 'cancelled', note: 'Staff cancellation — triggers refund' },
      { from: 'completed', to: 'partially_returned', note: 'P6: partial RMA processed' },
      { from: 'completed', to: 'returned', note: 'P6: full return processed' },
    ],
    notes: [
      'Order number: ORD-YYYYMMDD-XXXX (sequence shop_order_no_seq)',
      'Money: integer cents — subtotal_net_cents, shipping_net_cents, tax_cents, total_gross_cents, paid_cents',
      'All state changes logged to shop_order_events (event_type, payload jsonb, actor)',
      'Emails: order_confirmation on paid, shipped/delivered via shipment-emails.ts',
    ],
  },
  payment: {
    label: 'Payment', table: 'shop_payments', module: 'SHP', moduleColor: AMBER, color: GREEN,
    field: 'state',
    statuses: [
      { name: 'pending', type: 's-active' }, { name: 'authorized', type: 's-active' },
      { name: 'paid', type: 's-conv' }, { name: 'failed', type: 's-end' },
      { name: 'expired', type: 's-end' }, { name: 'refunded', type: 's-neutral' },
      { name: 'partially_refunded', type: 's-warn' },
    ],
    transitions: [
      { from: 'pending', to: 'authorized', guard: 'mollie_authorized', rpc: 'webhooks/mollie' },
      { from: 'pending', to: 'paid', guard: 'mollie_paid', rpc: 'webhooks/mollie', note: 'iDEAL/Bancontact: direct paid' },
      { from: 'authorized', to: 'paid', guard: 'mollie_captured', rpc: 'webhooks/mollie' },
      { from: 'pending', to: 'failed', guard: 'mollie_failed', rpc: 'webhooks/mollie' },
      { from: 'pending', to: 'expired', guard: 'mollie_expired', rpc: 'webhooks/mollie' },
      { from: 'paid', to: 'refunded', note: 'P5: full refund via Mollie API' },
      { from: 'paid', to: 'partially_refunded', note: 'P5: partial refund' },
    ],
    notes: [
      'Provider: Mollie — methods: iDEAL, Bancontact, credit card, PayPal, Klarna, SOFORT',
      'Webhook: /api/webhooks/mollie — logs to shop_payment_events + shop_webhook_inbox',
      'All payment events logged to shop_payment_events (event_type, mollie_status, raw_payload)',
    ],
  },
  fulfilment: {
    label: 'Fulfilment', table: 'shop_allocations', module: 'SHP', moduleColor: AMBER, color: TEAL,
    field: 'state',
    statuses: [
      { name: 'allocated', type: 's-active' }, { name: 'picking', type: 's-active' },
      { name: 'picked', type: 's-active' }, { name: 'packed', type: 's-active' },
      { name: 'shipped', type: 's-conv' }, { name: 'backordered', type: 's-warn' },
    ],
    transitions: [
      { from: 'allocated', to: 'picking', rpc: 'shop_generate_pick_list()', note: 'Added to a pick list' },
      { from: 'picking', to: 'picked', rpc: 'confirm_pick action', note: 'Picker confirms item scanned' },
      { from: 'picked', to: 'packed', rpc: 'pack action', note: 'Serial capture for tracked items' },
      { from: 'packed', to: 'shipped', rpc: 'mark_shipped action', note: 'Linked to shipment' },
      { from: 'allocated', to: 'backordered', guard: 'insufficient_stock', note: 'Stock not available at location' },
    ],
    notes: [
      'RPC shop_allocate_order(order_id, location_id) creates one allocation per order line',
      'Pick lists group allocations by location — shop_pick_lists + shop_pick_list_items',
      'Bin location from shop_variants.bin_location for warehouse picking guidance',
      'Serial numbers captured in shop_serials for items with requires_serial = true',
    ],
  },
  shipment: {
    label: 'Shipment', table: 'shop_shipments', module: 'SHP', moduleColor: AMBER, color: ORANGE,
    field: 'state',
    statuses: [
      { name: 'allocated', type: 's-active' }, { name: 'picked', type: 's-active' },
      { name: 'packed', type: 's-active' }, { name: 'labelled', type: 's-active' },
      { name: 'shipped', type: 's-conv' }, { name: 'in_transit', type: 's-active' },
      { name: 'out_for_delivery', type: 's-active' }, { name: 'delivered', type: 's-conv' },
      { name: 'failed_delivery', type: 's-warn' }, { name: 'returned_to_sender', type: 's-end' },
      { name: 'cancelled', type: 's-end' },
    ],
    transitions: [
      { from: 'allocated', to: 'picked', note: 'All lines picked' },
      { from: 'picked', to: 'packed', note: 'Package sealed, weight recorded' },
      { from: 'packed', to: 'labelled', rpc: 'shop_create_shipment()', note: 'Sendcloud label generated' },
      { from: 'labelled', to: 'shipped', rpc: 'mark_shipped action', note: 'Handed to carrier' },
      { from: 'shipped', to: 'in_transit', rpc: 'hooks/sendcloud webhook', note: 'Sendcloud status 5' },
      { from: 'in_transit', to: 'out_for_delivery', rpc: 'hooks/sendcloud webhook', note: 'Sendcloud status 8' },
      { from: 'out_for_delivery', to: 'delivered', rpc: 'hooks/sendcloud webhook', note: 'Sendcloud status 11' },
      { from: 'in_transit', to: 'failed_delivery', rpc: 'hooks/sendcloud webhook', note: 'Sendcloud status 80' },
      { from: 'failed_delivery', to: 'returned_to_sender', note: 'Carrier returns parcel' },
      { from: 'any pre-shipped', to: 'cancelled', note: 'Staff cancellation before dispatch' },
    ],
    notes: [
      'Shipment number: SHP-NNNN (sequence shop_shipment_no_seq starting at 1001)',
      'Carrier integration: Sendcloud — webhook at /api/hooks/sendcloud',
      'Sendcloud status mapping: 1→shipped, 5→in_transit, 8→out_for_delivery, 11→delivered, 80→failed_delivery, 62→returned_to_sender',
      'Tracking events logged to shop_tracking_events (visible to guests via /api/track)',
      'Shipment events logged to shop_shipment_events (internal audit)',
      'Emails: shipped + delivered sent automatically on Sendcloud webhook state change',
    ],
  },
};

const SHOP_PIPELINE: ShopObjectKey[] = ['cart', 'shop_order', 'payment', 'fulfilment', 'shipment'];

const SHOP_EMAILS = [
  { code: 'SHP-E01', trigger: 'Order paid (Mollie webhook)', to: 'Customer', template: 'order_confirmation', color: GREEN },
  { code: 'SHP-E02', trigger: 'Shipment dispatched', to: 'Customer', template: 'shipped', color: ACCENT },
  { code: 'SHP-E03', trigger: 'Shipment delivered (Sendcloud)', to: 'Customer', template: 'delivered', color: TEAL },
  { code: 'SHP-E04', trigger: 'Order cancelled', to: 'Customer', template: 'cancelled', color: RED },
  { code: 'SHP-E05', trigger: 'Partial shipment', to: 'Customer', template: 'partial_shipped', color: AMBER },
  { code: 'SHP-E06', trigger: 'Items backordered', to: 'Customer', template: 'backordered', color: ORANGE },
];

const SHOP_SCREENS = [
  { layer: 'Storefront', lc: PURPLE, screens: [
    { code: 'SF-HOME', name: 'Homepage', route: '/[locale]' },
    { code: 'SF-PLP', name: 'Product Listing', route: '/[locale]/products' },
    { code: 'SF-PDP', name: 'Product Detail', route: '/[locale]/products/[slug]' },
    { code: 'SF-SEARCH', name: 'Search', route: '/[locale]/search' },
    { code: 'SF-BRANDS', name: 'Brands', route: '/[locale]/brands' },
    { code: 'SHP-CART', name: 'Cart Drawer', route: 'component overlay' },
    { code: 'SHP-CHECKOUT', name: 'Checkout 3-Step', route: '/[locale]/checkout' },
    { code: 'SHP-CONFIRM', name: 'Order Confirmation', route: '/[locale]/checkout/confirmation' },
    { code: 'SH-TRACK', name: 'Guest Tracking', route: '/[locale]/track' },
  ]},
  { layer: 'Admin', lc: ACCENT, screens: [
    { code: 'SH001', name: 'Product Catalog', route: '/console/shp/products' },
    { code: 'SH002', name: 'Product Detail', route: '/console/shp/products/[id]' },
    { code: 'SH020', name: 'Order List', route: '/admin/orders' },
    { code: 'SH021', name: 'Order Workspace', route: '/admin/orders/[id]' },
    { code: 'SH022', name: 'Allocation Queue', route: '/admin/fulfil?tab=allocate' },
    { code: 'SH023', name: 'Pick Lists', route: '/admin/fulfil?tab=pick' },
    { code: 'SH024', name: 'Pack Station', route: '/admin/fulfil?tab=pack' },
    { code: 'SH025', name: 'Shipments', route: '/admin/shipments' },
  ]},
  { layer: 'API', lc: TEAL, screens: [
    { code: 'cart', name: 'Cart API', route: '/api/cart' },
    { code: 'checkout', name: 'Checkout API', route: '/api/checkout' },
    { code: 'payment', name: 'Payment API', route: '/api/payment' },
    { code: 'fulfil', name: 'Fulfilment API', route: '/api/admin/fulfil' },
    { code: 'orders', name: 'Orders API', route: '/api/admin/orders' },
    { code: 'sendcloud', name: 'Sendcloud Webhook', route: '/api/hooks/sendcloud' },
    { code: 'mollie', name: 'Mollie Webhook', route: '/api/webhooks/mollie' },
    { code: 'track', name: 'Guest Tracking', route: '/api/track' },
  ]},
];

export default function TfeFlowPage() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState<ObjectKey | null>(null);
  const [shopActive, setShopActive] = useState<ShopObjectKey | null>(null);
  const [tab, setTab] = useState<TabKey>('pipeline');
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && VALID_TABS.includes(t as TabKey)) {
      setTab(t as TabKey);
      setFocusMode(true);
    }
  }, [searchParams]);

  const TAB_LABELS: Record<TabKey, string> = {
    pipeline: 'Pipeline & Status Machines',
    acquisition: 'Acquisition Funnel',
    desshop: 'DES Shop E-Commerce',
    shortlink: 'Short-Link Attribution',
    guards: 'Guard Rails',
    docflow: 'Doc-Flow Relations',
  };

  return (
    <div className="p-6">
      <ScreenHeader title="TFE Flow Viewer" description={focusMode ? TAB_LABELS[tab] : 'Trade Flow Engine — object pipeline, status machines, guard rails, doc-flow relations, acquisition funnel & DES Shop e-commerce'} />

      {focusMode ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-orange-100 px-3 py-0.5 text-[10px] font-bold text-orange-700">{TAB_LABELS[tab]}</span>
          <a href="/console/sys/tfe-flow" className="text-[11px] text-blue-500 hover:underline">← Full TFE Flow Viewer</a>
          <span className="mx-1 text-slate-300">·</span>
          <a href="/console/sys/docs?doc_type=visual" className="text-[11px] text-orange-500 hover:underline">← SY034 Visual Flows</a>
        </div>
      ) : (
        <>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-0.5 font-mono text-[10px] font-bold text-blue-700">v2.78 · P0–P7</span>
            <span className="rounded-full bg-amber-100 px-3 py-0.5 font-mono text-[10px] font-bold text-amber-700">SHP · P0–P4</span>
            <a href="/console/sys/docs?q=Trade+Flow" className="text-[11px] text-orange-500 hover:underline">← SY034 Docs</a>
            <a href="/console/sys/docs?q=desshop-commerce" className="text-[11px] text-amber-500 hover:underline">← SY034 DesShop Docs</a>
          </div>

          {/* Tab bar — only in full viewer mode */}
          <div className="mt-5 flex gap-1 border-b border-slate-200">
            {(['pipeline', 'acquisition', 'desshop', 'shortlink', 'guards', 'docflow'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setActive(null); setShopActive(null); }}
                className={`px-4 py-2 text-[12px] font-semibold transition-colors ${tab === t ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'pipeline' && (
        <div className="mt-6">
          {/* Pipeline overview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">Document Pipeline</h3>
            <p className="mt-1 text-[12px] text-slate-500">Every sale flows through a Case. Click an object to view its status machine.</p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {PIPELINE_OBJECTS.map((key, i) => {
                const obj = OBJECTS[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <button onClick={() => setActive(active === key ? null : key)}
                      className={`rounded-lg border-2 px-4 py-2.5 text-[12px] font-bold transition-all hover:shadow-md ${active === key ? 'ring-2 ring-offset-1' : ''}`}
                      style={{ borderColor: obj.color, color: obj.color, background: active === key ? obj.color + '12' : 'white' }}>
                      <div>{obj.label}</div>
                      <div className="mt-0.5 text-[9px] font-normal opacity-60">{obj.table}</div>
                    </button>
                    {i < PIPELINE_OBJECTS.length - 1 && (
                      <span className="text-[10px] font-mono font-bold" style={{ color: i < 3 ? ACCENT : i < 5 ? TEAL : TEAL }}>
                        {i === 0 ? '→ Case →' : i === 2 ? '⇊' : '→'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] text-slate-400">
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-blue-500" /> converted</span>
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-teal-500" /> spawned</span>
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-amber-500" style={{ borderBottom: '2px dashed #d97706' }} /> replaced</span>
            </div>
          </div>

          {/* Active object detail */}
          {active && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5" style={{ borderTopColor: OBJECTS[active].color, borderTopWidth: 3 }}>
              <div className="flex items-center gap-3">
                <h3 className="text-[16px] font-bold text-slate-800">{OBJECTS[active].label}</h3>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: OBJECTS[active].moduleColor + '18', color: OBJECTS[active].moduleColor }}>
                  {OBJECTS[active].module}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{OBJECTS[active].table}</span>
                <span className="ml-auto text-[10px] text-slate-400">Field: <span className="font-mono font-semibold">{OBJECTS[active].field}</span></span>
              </div>

              {/* Status pills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {OBJECTS[active].statuses.map(s => (
                  <span key={s.name} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyle(s.type)}`}>
                    {s.name}
                  </span>
                ))}
              </div>

              {/* Transitions table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">From</th>
                      <th className="px-3 py-2">To</th>
                      <th className="px-3 py-2">Guard</th>
                      <th className="px-3 py-2">RPC</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OBJECTS[active].transitions.map((t, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-600">{t.from}</td>
                        <td className="px-3 py-2 font-mono font-semibold" style={{ color: OBJECTS[active].color }}>{t.to}</td>
                        <td className="px-3 py-2">{t.guard ? <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-600">{t.guard}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{t.rpc}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-400">{t.note ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {OBJECTS[active].notes.length > 0 && (
                <div className="mt-3 space-y-1">
                  {OBJECTS[active].notes.map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
                      <span className="mt-0.5 text-blue-400">●</span>
                      <span className="font-mono">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!active && (
            <p className="mt-6 text-center text-[12px] text-slate-400">Click an object in the pipeline above to view its status machine, transitions, and RPCs.</p>
          )}
        </div>
      )}

      {tab === 'acquisition' && (
        <div className="mt-6 space-y-5">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <h3 className="text-[16px] font-bold text-slate-800">Sell Lead System</h3>
              <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: GREEN + '18', color: GREEN }}>SAL</span>
              <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">Outside TFE</span>
              <span className="ml-auto font-mono text-[11px] text-slate-400">BOP Acquisition Funnel · August 2026</span>
            </div>
            <p className="mt-2 text-[12px] text-slate-500">
              End-to-end vehicle acquisition from private sellers. Standalone funnel — not part of the Case/doc-flow chain.
              Status enforced at application layer (PATCH handler), not via RPC guard triggers.
            </p>
          </div>

          {/* 1. State Machine — SVG diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">1. State Machine</h4>
            <p className="text-[12px] text-slate-500">Every sell lead moves through a strict state machine enforced server-side in the PATCH handler. Invalid transitions return <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">400</code>.</p>
            <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: `
              <svg viewBox="0 0 820 520" role="img" style="max-width:100%;height:auto">
                <defs>
                  <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#334155"/></marker>
                  <marker id="ah-accent" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#ea580c"/></marker>
                </defs>
                <rect x="20" y="80" width="90" height="36" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="65" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#2563eb">new</text>
                <rect x="160" y="80" width="100" height="36" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="210" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#2563eb">reviewing</text>
                <rect x="310" y="80" width="100" height="36" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
                <text x="360" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#ea580c">offer_sent</text>
                <rect x="460" y="80" width="110" height="36" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
                <text x="515" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#ea580c">negotiating</text>
                <rect x="620" y="80" width="90" height="36" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
                <text x="665" y="103" text-anchor="middle" font-size="12" font-weight="700" fill="#16a34a">accepted</text>
                <rect x="620" y="160" width="90" height="36" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
                <text x="665" y="183" text-anchor="middle" font-size="12" font-weight="800" fill="#16a34a">purchased</text>
                <line x1="110" y1="98" x2="155" y2="98" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
                <line x1="260" y1="98" x2="305" y2="98" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
                <line x1="410" y1="98" x2="455" y2="98" stroke="#ea580c" stroke-width="1.5" marker-end="url(#ah-accent)"/>
                <text x="433" y="90" text-anchor="middle" font-size="9" fill="#78716c">send_offer</text>
                <line x1="570" y1="98" x2="615" y2="98" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
                <line x1="665" y1="116" x2="665" y2="155" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
                <text x="335" y="70" text-anchor="middle" font-size="9" fill="#ea580c">SL-001 email</text>
                <text x="360" y="60" text-anchor="middle" font-size="9" fill="#ea580c">auto-reply</text>
                <text x="488" y="70" text-anchor="middle" font-size="9" fill="#ea580c">SL-002 email</text>
                <rect x="80" y="280" width="140" height="36" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
                <text x="150" y="303" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">declined_by_us</text>
                <text x="150" y="330" text-anchor="middle" font-size="9" fill="#78716c">SL-004 email</text>
                <rect x="260" y="280" width="160" height="36" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
                <text x="340" y="303" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">rejected_by_seller</text>
                <rect x="460" y="280" width="90" height="36" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
                <text x="505" y="303" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">expired</text>
                <rect x="590" y="280" width="70" height="36" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
                <text x="625" y="303" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">lost</text>
                <line x1="65" y1="116" x2="130" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <line x1="210" y1="116" x2="155" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <line x1="515" y1="116" x2="155" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <line x1="360" y1="116" x2="340" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <line x1="515" y1="116" x2="350" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <line x1="65" y1="116" x2="495" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <line x1="65" y1="116" x2="615" y2="275" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <text x="20" y="390" font-size="11" font-weight="700" fill="#78716c">LEGEND</text>
                <line x1="20" y1="405" x2="50" y2="405" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
                <text x="58" y="409" font-size="10" fill="#78716c">Valid transition</text>
                <line x1="20" y1="425" x2="50" y2="425" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah)"/>
                <text x="58" y="429" font-size="10" fill="#78716c">Any active state can reach terminal states (dashed)</text>
                <line x1="20" y1="445" x2="50" y2="445" stroke="#ea580c" stroke-width="1.5" marker-end="url(#ah-accent)"/>
                <text x="58" y="449" font-size="10" fill="#78716c">Triggers email send via Comm Center</text>
                <rect x="20" y="470" width="780" height="32" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1" stroke-dasharray="4,3"/>
                <text x="410" y="491" text-anchor="middle" font-size="11" fill="#dc2626">Bulk delete from SA013 only allowed for: declined_by_us, lost</text>
              </svg>
            ` }} />
            <p className="mt-2 text-center text-[11px] italic text-slate-400">Sell lead status state machine — enforced in <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">sell-leads/[id]/route.ts</code> PATCH handler</p>
          </div>

          {/* 2. Email Pipeline — SVG diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">2. Email Pipeline</h4>
            <p className="text-[12px] text-slate-500">Comm Center V2 3-stage pipeline. The <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">send()</code> call in SA014 replaces the old hardcoded <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">offerHtml()</code>.</p>
            <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: `
              <svg viewBox="0 0 820 340" role="img" style="max-width:100%;height:auto">
                <defs><marker id="ah2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#334155"/></marker></defs>
                <rect x="20" y="40" width="120" height="50" rx="8" fill="#ffffff" stroke="#d6d3d1" stroke-width="1.5"/>
                <text x="80" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="#1c1917">SA014 Detail</text>
                <text x="80" y="76" text-anchor="middle" font-size="10" fill="#78716c">send_offer action</text>
                <line x1="140" y1="65" x2="180" y2="65" stroke="#334155" stroke-width="1.5" marker-end="url(#ah2)"/>
                <text x="160" y="56" text-anchor="middle" font-size="9" fill="#78716c">send()</text>
                <rect x="185" y="30" width="140" height="70" rx="8" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="255" y="53" text-anchor="middle" font-size="10" font-weight="700" fill="#7c3aed">1. BRANDING</text>
                <text x="255" y="68" text-anchor="middle" font-size="9" fill="#78716c">master_style lookup</text>
                <text x="255" y="80" text-anchor="middle" font-size="9" fill="#78716c">premium_automotive</text>
                <line x1="325" y1="65" x2="355" y2="65" stroke="#334155" stroke-width="1.5" marker-end="url(#ah2)"/>
                <rect x="360" y="30" width="140" height="70" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
                <text x="430" y="53" text-anchor="middle" font-size="10" font-weight="700" fill="#ea580c">2. COMPILE</text>
                <text x="430" y="68" text-anchor="middle" font-size="9" fill="#78716c">template + style</text>
                <text x="430" y="80" text-anchor="middle" font-size="9" fill="#78716c">→ raw HTML</text>
                <line x1="500" y1="65" x2="530" y2="65" stroke="#334155" stroke-width="1.5" marker-end="url(#ah2)"/>
                <rect x="535" y="30" width="140" height="70" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="605" y="53" text-anchor="middle" font-size="10" font-weight="700" fill="#2563eb">3. RESOLVE</text>
                <text x="605" y="68" text-anchor="middle" font-size="9" fill="#78716c">{{tokens}} → values</text>
                <text x="605" y="80" text-anchor="middle" font-size="9" fill="#78716c">context binding</text>
                <line x1="675" y1="65" x2="705" y2="65" stroke="#334155" stroke-width="1.5" marker-end="url(#ah2)"/>
                <rect x="710" y="40" width="90" height="50" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
                <text x="755" y="60" text-anchor="middle" font-size="11" font-weight="700" fill="#16a34a">SMTP</text>
                <text x="755" y="76" text-anchor="middle" font-size="10" fill="#78716c">send email</text>
                <rect x="185" y="140" width="490" height="60" rx="8" fill="#ffffff" stroke="#e7e5e4" stroke-width="1"/>
                <text x="200" y="160" font-size="10" font-weight="700" fill="#78716c">TEMPLATE FALLBACK CHAIN (4 steps)</text>
                <text x="200" y="180" font-size="11" fill="#1c1917">tenant + locale → tenant + en → platform (0) + locale → platform (0) + en</text>
                <line x1="430" y1="100" x2="430" y2="135" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah2)"/>
                <rect x="535" y="220" width="265" height="100" rx="8" fill="#ffffff" stroke="#e7e5e4" stroke-width="1"/>
                <text x="550" y="242" font-size="10" font-weight="700" fill="#78716c">CONTEXT BINDING: sell_lead</text>
                <text x="550" y="260" font-size="11" fill="#1c1917">loadSellLeadContext(recordId, tenantId)</text>
                <text x="550" y="278" font-size="10" fill="#78716c">Reads: sell_leads table</text>
                <text x="550" y="294" font-size="10" fill="#78716c">Produces: SellLead.*, Seller.*, Document.*</text>
                <text x="550" y="310" font-size="10" fill="#78716c">Recipients: seller_email → to</text>
                <line x1="605" y1="100" x2="605" y2="215" stroke="#a8a29e" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#ah2)"/>
              </svg>
            ` }} />
            <p className="mt-2 text-center text-[11px] italic text-slate-400">Comm Center V2 pipeline for sell_lead emails — <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">send()</code> orchestrates all 3 stages</p>

            {/* Template categories table */}
            <h5 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Template Categories</h5>
            <table className="mt-2 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Code</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Trigger</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Style</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'SL-001', cat: 'sell_lead.received', trigger: 'New lead created', to: 'Seller', style: 'premium_automotive', color: ORANGE },
                  { code: 'SL-002', cat: 'sell_lead.offer', trigger: 'Send Offer (SA014)', to: 'Seller', style: 'premium_automotive', color: ORANGE },
                  { code: 'SL-003', cat: 'sell_lead.accepted', trigger: 'Status → accepted', to: 'Seller', style: 'premium_automotive', color: GREEN },
                  { code: 'SL-004', cat: 'sell_lead.declined', trigger: 'Status → declined_by_us', to: 'Seller', style: 'premium_automotive', color: RED },
                  { code: 'SL-005', cat: 'sell_lead.admin', trigger: 'New lead (internal)', to: 'BOP admin', style: 'corporate', color: PURPLE },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2"><span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: r.color + '18', color: r.color }}>{r.code}</span></td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.cat}</td>
                    <td className="px-3 py-2 text-slate-500">{r.trigger}</td>
                    <td className="px-3 py-2 text-slate-500">{r.to}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{r.style}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-[11px] text-slate-400">
              <strong>Locales:</strong> en, nl, de, fr, tr, ro, bg, el, es, it (50 templates = 5 categories × 10 locales)
            </div>
          </div>

          {/* 3. Token Map */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">3. Token Map</h4>
            <p className="text-[12px] text-slate-500">Context binding resolves these tokens from the <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">sell_leads</code> table. Use <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">{'{{Namespace.Key}}'}</code> in templates.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Token</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['{{SellLead.Id}}','id','a1b2c3d4-...'],['{{SellLead.Ref}}','ref','SL2631005'],
                    ['{{SellLead.Vehicle}}','make+model+year','BMW 320i (2021)'],['{{SellLead.Type}}','vehicle_type','sedan'],
                    ['{{SellLead.Plate}}','license_plate','AB-123-CD'],['{{SellLead.Mileage}}','mileage_km','85.000'],
                    ['{{SellLead.Condition}}','condition','good'],['{{SellLead.AskingPrice}}','asking_price_eur','€ 15.000,00'],
                    ['{{SellLead.OfferAmount}}','our_offer_eur','€ 12.500,00'],['{{SellLead.Status}}','status','offer_sent'],
                    ['{{SellLead.Source}}','source','website'],['{{Seller.Name}}','seller_name','Jan de Vries'],
                    ['{{Seller.Email}}','seller_email','jan@example.com'],['{{Seller.Phone}}','seller_phone','+31 6 1234 5678'],
                    ['{{Seller.City}}','seller_city','Amsterdam'],['{{Document.Type}}','(constant)','Sell Lead'],
                    ['{{Document.Number}}','ref or id prefix','SL2631005'],
                  ].map(([tok,src,ex], i) => (
                    <tr key={i} className="border-b border-slate-50"><td className="px-3 py-1.5"><code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-indigo-600">{tok}</code></td><td className="px-3 py-1.5 text-slate-500">{src}</td><td className="px-3 py-1.5 text-slate-400">{ex}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-400">Binding: lib/comm/context-bindings.ts — loadSellLeadContext()</p>
          </div>

          {/* 4. Ref Code — SVG diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">4. Ref Code Generation</h4>
            <p className="text-[12px] text-slate-500">Weekly-resetting sequential ref via PostgreSQL trigger. Format: <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">SL</code> + year (2d) + ISO week (2d) + counter (3d).</p>
            <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: `
              <svg viewBox="0 0 820 200" role="img" style="max-width:100%;height:auto">
                <rect x="120" y="30" width="60" height="50" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="150" y="60" text-anchor="middle" font-size="18" font-weight="800" fill="#2563eb">SL</text>
                <rect x="185" y="30" width="60" height="50" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
                <text x="215" y="60" text-anchor="middle" font-size="18" font-weight="800" fill="#ea580c">26</text>
                <rect x="250" y="30" width="60" height="50" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="280" y="60" text-anchor="middle" font-size="18" font-weight="800" fill="#7c3aed">31</text>
                <rect x="315" y="30" width="80" height="50" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
                <text x="355" y="60" text-anchor="middle" font-size="18" font-weight="800" fill="#16a34a">005</text>
                <text x="150" y="100" text-anchor="middle" font-size="10" font-weight="600" fill="#2563eb">prefix</text>
                <text x="150" y="112" text-anchor="middle" font-size="9" fill="#78716c">fixed</text>
                <text x="215" y="100" text-anchor="middle" font-size="10" font-weight="600" fill="#ea580c">year</text>
                <text x="215" y="112" text-anchor="middle" font-size="9" fill="#78716c">2 digits</text>
                <text x="280" y="100" text-anchor="middle" font-size="10" font-weight="600" fill="#7c3aed">week</text>
                <text x="280" y="112" text-anchor="middle" font-size="9" fill="#78716c">ISO WW</text>
                <text x="355" y="100" text-anchor="middle" font-size="10" font-weight="600" fill="#16a34a">counter</text>
                <text x="355" y="112" text-anchor="middle" font-size="9" fill="#78716c">001–999</text>
                <text x="500" y="42" font-size="10" font-weight="700" fill="#78716c">EXAMPLE SEQUENCE (week 31)</text>
                <text x="500" y="62" font-size="13" font-weight="600" font-family="ui-monospace, monospace" fill="#1c1917">SL2631001 → SL2631002 → SL2631003</text>
                <text x="500" y="82" font-size="10" fill="#78716c">Counter resets to 001 on new ISO week</text>
                <text x="500" y="100" font-size="10" fill="#78716c">Max 999 per week — raises exception if exceeded</text>
                <rect x="120" y="135" width="660" height="50" rx="8" fill="#ffffff" stroke="#e7e5e4" stroke-width="1"/>
                <text x="135" y="155" font-size="10" font-weight="700" fill="#78716c">MECHANISM</text>
                <text x="135" y="173" font-size="11" fill="#1c1917">BEFORE INSERT trigger → next_weekly_counter_id('sell_lead') → bop_counter row with FOR UPDATE lock → compares IYIW vs now()</text>
              </svg>
            ` }} />
            <p className="mt-2 font-mono text-[10px] text-slate-400">Migration: sql/m63_sell_lead_ref.sql — trigger trg_sell_leads_ref + function next_weekly_counter_id()</p>
          </div>

          {/* 5. File Map */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">5. File Map</h4>
            <table className="mt-2 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Layer</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { layer: 'API', lc: ACCENT, file: 'app/api/bop/sal/sell-leads/[id]/route.ts', desc: 'SA014 — GET detail, PATCH status/offer, send_offer' },
                  { layer: 'API', lc: ACCENT, file: 'app/api/bop/sal/sell-leads/route.ts', desc: 'SA013 — GET list, PATCH bulk set_status/delete' },
                  { layer: 'UI', lc: PURPLE, file: 'app/console/sal/sell-leads/page.tsx', desc: 'SA013 — sort, filter, checkbox, bulk actions' },
                  { layer: 'COMM', lc: ORANGE, file: 'lib/comm/context-bindings.ts', desc: 'sell_lead context loader + CONTEXT_BINDINGS' },
                  { layer: 'COMM', lc: ORANGE, file: 'lib/comm/send.ts', desc: '3-stage pipeline orchestrator' },
                  { layer: 'SQL', lc: GREEN, file: 'sql/m63_sell_lead_ref.sql', desc: 'bop_counter + next_weekly_counter_id() + trigger' },
                  { layer: 'SQL', lc: GREEN, file: 'sql/m64_sell_lead_comm_templates.sql', desc: '5 categories × en/nl (10 rows)' },
                  { layer: 'SQL', lc: GREEN, file: 'sql/m64b_sell_lead_comm_i18n.sql', desc: '5 categories × 8 locales (40 rows)' },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-3 py-2"><span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: r.lc + '18', color: r.lc }}>{r.layer}</span></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.file}</td>
                    <td className="px-3 py-2 text-slate-500">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center text-[10px] text-slate-400">
            <a href="/console/sys/docs?q=sell-lead-acquisition" className="text-orange-500 hover:underline">← SY034 Docs: Sell Lead Acquisition</a>
          </div>
        </div>
      )}

      {tab === 'desshop' && (
        <div className="mt-6 space-y-5">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <h3 className="text-[16px] font-bold text-slate-800">DES Shop — E-Commerce Platform</h3>
              <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: AMBER + '18', color: AMBER }}>SHP</span>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">desshop.com</span>
              <span className="ml-auto font-mono text-[11px] text-slate-400">P0–P4 built · August 2026</span>
            </div>
            <p className="mt-2 text-[12px] text-slate-500">
              Full-stack e-commerce for camper, caravan and boat electrical parts. Separate Next.js storefront (desshop.com) + BOP console admin screens (SH001–SH070).
              All tables use <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">shop_</code> prefix. Money stored as integer cents. Locales: NL/EN/DE.
            </p>
          </div>

          {/* 1. Order Pipeline — interactive objects */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">1. Order Pipeline & Status Machines</h4>
            <p className="text-[12px] text-slate-500">Complete commerce flow from cart to delivery. Click an object to view its status machine.</p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {SHOP_PIPELINE.map((key, i) => {
                const obj = SHOP_OBJECTS[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <button onClick={() => setShopActive(shopActive === key ? null : key)}
                      className={`rounded-lg border-2 px-4 py-2.5 text-[12px] font-bold transition-all hover:shadow-md ${shopActive === key ? 'ring-2 ring-offset-1' : ''}`}
                      style={{ borderColor: obj.color, color: obj.color, background: shopActive === key ? obj.color + '12' : 'white' }}>
                      <div>{obj.label}</div>
                      <div className="mt-0.5 text-[9px] font-normal opacity-60">{obj.table}</div>
                    </button>
                    {i < SHOP_PIPELINE.length - 1 && (
                      <span className="text-[10px] font-mono font-bold" style={{ color: i === 0 ? ACCENT : i === 1 ? GREEN : i === 2 ? TEAL : ORANGE }}>
                        {i === 0 ? '→ checkout →' : i === 1 ? '→ Mollie →' : i === 2 ? '→ pick/pack →' : '→ Sendcloud →'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] text-slate-400">
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-blue-500" /> order flow</span>
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-green-500" /> payment</span>
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-teal-500" /> fulfilment</span>
              <span><span className="mr-1 inline-block h-0.5 w-4 bg-orange-500" /> shipping</span>
            </div>
          </div>

          {/* Active shop object detail */}
          {shopActive && (
            <div className="rounded-xl border border-slate-200 bg-white p-5" style={{ borderTopColor: SHOP_OBJECTS[shopActive].color, borderTopWidth: 3 }}>
              <div className="flex items-center gap-3">
                <h3 className="text-[16px] font-bold text-slate-800">{SHOP_OBJECTS[shopActive].label}</h3>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: SHOP_OBJECTS[shopActive].moduleColor + '18', color: SHOP_OBJECTS[shopActive].moduleColor }}>
                  {SHOP_OBJECTS[shopActive].module}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{SHOP_OBJECTS[shopActive].table}</span>
                <span className="ml-auto text-[10px] text-slate-400">Field: <span className="font-mono font-semibold">{SHOP_OBJECTS[shopActive].field}</span></span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {SHOP_OBJECTS[shopActive].statuses.map(s => (
                  <span key={s.name} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyle(s.type)}`}>
                    {s.name}
                  </span>
                ))}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">From</th>
                      <th className="px-3 py-2">To</th>
                      <th className="px-3 py-2">Guard</th>
                      <th className="px-3 py-2">RPC / Handler</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHOP_OBJECTS[shopActive].transitions.map((t, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-600">{t.from}</td>
                        <td className="px-3 py-2 font-mono font-semibold" style={{ color: SHOP_OBJECTS[shopActive].color }}>{t.to}</td>
                        <td className="px-3 py-2">{t.guard ? <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-600">{t.guard}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{t.rpc ?? ''}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-400">{t.note ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {SHOP_OBJECTS[shopActive].notes.length > 0 && (
                <div className="mt-3 space-y-1">
                  {SHOP_OBJECTS[shopActive].notes.map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
                      <span className="mt-0.5 text-amber-400">●</span>
                      <span className="font-mono">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!shopActive && (
            <p className="text-center text-[12px] text-slate-400">Click an object in the pipeline above to view its status machine, transitions, and handlers.</p>
          )}

          {/* 2. End-to-End Flow — SVG diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">2. End-to-End Commerce Flow</h4>
            <p className="text-[12px] text-slate-500">Complete customer journey from browse to delivery — spanning storefront, payment, fulfilment, and shipping.</p>
            <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: `
              <svg viewBox="0 0 900 480" role="img" style="max-width:100%;height:auto">
                <defs>
                  <marker id="shp-ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#334155"/></marker>
                  <marker id="shp-ah-g" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#16a34a"/></marker>
                  <marker id="shp-ah-o" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#ea580c"/></marker>
                </defs>
                <!-- Row labels -->
                <text x="10" y="55" font-size="10" font-weight="700" fill="#7c3aed">CUSTOMER</text>
                <text x="10" y="155" font-size="10" font-weight="700" fill="#2563eb">ORDER</text>
                <text x="10" y="255" font-size="10" font-weight="700" fill="#16a34a">PAYMENT</text>
                <text x="10" y="355" font-size="10" font-weight="700" fill="#0d9488">FULFILMENT</text>
                <text x="10" y="435" font-size="10" font-weight="700" fill="#ea580c">SHIPPING</text>

                <!-- Swim lane lines -->
                <line x1="0" y1="90" x2="900" y2="90" stroke="#e7e5e4" stroke-width="0.5" stroke-dasharray="4,3"/>
                <line x1="0" y1="190" x2="900" y2="190" stroke="#e7e5e4" stroke-width="0.5" stroke-dasharray="4,3"/>
                <line x1="0" y1="290" x2="900" y2="290" stroke="#e7e5e4" stroke-width="0.5" stroke-dasharray="4,3"/>
                <line x1="0" y1="390" x2="900" y2="390" stroke="#e7e5e4" stroke-width="0.5" stroke-dasharray="4,3"/>

                <!-- Customer row -->
                <rect x="90" y="30" width="80" height="40" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="130" y="55" text-anchor="middle" font-size="11" font-weight="700" fill="#7c3aed">Browse</text>
                <rect x="200" y="30" width="80" height="40" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="240" y="55" text-anchor="middle" font-size="11" font-weight="700" fill="#7c3aed">Add Cart</text>
                <rect x="310" y="30" width="90" height="40" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="355" y="55" text-anchor="middle" font-size="11" font-weight="700" fill="#7c3aed">Checkout</text>
                <rect x="430" y="30" width="70" height="40" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="465" y="55" text-anchor="middle" font-size="11" font-weight="700" fill="#7c3aed">Pay</text>
                <rect x="700" y="30" width="90" height="40" rx="6" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5"/>
                <text x="745" y="55" text-anchor="middle" font-size="11" font-weight="700" fill="#7c3aed">Receive</text>
                <line x1="170" y1="50" x2="195" y2="50" stroke="#7c3aed" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="280" y1="50" x2="305" y2="50" stroke="#7c3aed" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="400" y1="50" x2="425" y2="50" stroke="#7c3aed" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="500" y1="50" x2="500" y2="120" stroke="#334155" stroke-width="1.5" marker-end="url(#shp-ah)"/>

                <!-- Order row -->
                <rect x="90" y="110" width="100" height="40" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="140" y="125" text-anchor="middle" font-size="10" font-weight="700" fill="#2563eb">draft</text>
                <text x="140" y="140" text-anchor="middle" font-size="9" fill="#78716c">shop_orders</text>
                <rect x="220" y="110" width="120" height="40" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="280" y="125" text-anchor="middle" font-size="10" font-weight="700" fill="#2563eb">pending_payment</text>
                <text x="280" y="140" text-anchor="middle" font-size="9" fill="#78716c">Mollie redirect</text>
                <rect x="370" y="110" width="80" height="40" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
                <text x="410" y="130" text-anchor="middle" font-size="11" font-weight="800" fill="#16a34a">paid</text>
                <rect x="480" y="110" width="90" height="40" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="525" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="#2563eb">processing</text>
                <rect x="600" y="110" width="80" height="40" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
                <text x="640" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="#2563eb">shipped</text>
                <rect x="710" y="110" width="90" height="40" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
                <text x="755" y="130" text-anchor="middle" font-size="11" font-weight="800" fill="#16a34a">completed</text>
                <line x1="190" y1="130" x2="215" y2="130" stroke="#334155" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="340" y1="130" x2="365" y2="130" stroke="#16a34a" stroke-width="1.5" marker-end="url(#shp-ah-g)"/>
                <line x1="450" y1="130" x2="475" y2="130" stroke="#334155" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="570" y1="130" x2="595" y2="130" stroke="#334155" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="680" y1="130" x2="705" y2="130" stroke="#334155" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <text x="380" y="105" font-size="9" fill="#16a34a">webhook</text>

                <!-- Payment row -->
                <rect x="220" y="210" width="90" height="40" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
                <text x="265" y="225" text-anchor="middle" font-size="10" font-weight="700" fill="#16a34a">pending</text>
                <text x="265" y="240" text-anchor="middle" font-size="9" fill="#78716c">shop_payments</text>
                <rect x="340" y="210" width="70" height="40" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
                <text x="375" y="235" text-anchor="middle" font-size="11" font-weight="800" fill="#16a34a">paid</text>
                <rect x="440" y="210" width="70" height="40" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
                <text x="475" y="235" text-anchor="middle" font-size="10" font-weight="700" fill="#dc2626">failed</text>
                <line x1="310" y1="230" x2="335" y2="230" stroke="#16a34a" stroke-width="1.5" marker-end="url(#shp-ah-g)"/>
                <line x1="310" y1="238" x2="435" y2="238" stroke="#dc2626" stroke-width="1" stroke-dasharray="4,3"/>
                <line x1="280" y1="150" x2="265" y2="205" stroke="#334155" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#shp-ah)"/>
                <line x1="375" y1="210" x2="410" y2="155" stroke="#16a34a" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#shp-ah-g)"/>
                <text x="550" y="225" font-size="10" font-weight="600" fill="#16a34a">Mollie</text>
                <text x="550" y="240" font-size="9" fill="#78716c">iDEAL · Bancontact · Card</text>
                <text x="550" y="253" font-size="9" fill="#78716c">PayPal · Klarna · SOFORT</text>

                <!-- Fulfilment row -->
                <rect x="130" y="320" width="80" height="40" rx="6" fill="#f0fdfa" stroke="#0d9488" stroke-width="1.5"/>
                <text x="170" y="335" text-anchor="middle" font-size="10" font-weight="700" fill="#0d9488">allocate</text>
                <text x="170" y="350" text-anchor="middle" font-size="9" fill="#78716c">SH022</text>
                <rect x="240" y="320" width="80" height="40" rx="6" fill="#f0fdfa" stroke="#0d9488" stroke-width="1.5"/>
                <text x="280" y="335" text-anchor="middle" font-size="10" font-weight="700" fill="#0d9488">pick</text>
                <text x="280" y="350" text-anchor="middle" font-size="9" fill="#78716c">SH023</text>
                <rect x="350" y="320" width="80" height="40" rx="6" fill="#f0fdfa" stroke="#0d9488" stroke-width="1.5"/>
                <text x="390" y="335" text-anchor="middle" font-size="10" font-weight="700" fill="#0d9488">pack</text>
                <text x="390" y="350" text-anchor="middle" font-size="9" fill="#78716c">SH024</text>
                <rect x="460" y="320" width="80" height="40" rx="6" fill="#f0fdfa" stroke="#0d9488" stroke-width="1.5"/>
                <text x="500" y="335" text-anchor="middle" font-size="10" font-weight="700" fill="#0d9488">label</text>
                <text x="500" y="350" text-anchor="middle" font-size="9" fill="#78716c">Sendcloud</text>
                <line x1="210" y1="340" x2="235" y2="340" stroke="#0d9488" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="320" y1="340" x2="345" y2="340" stroke="#0d9488" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="430" y1="340" x2="455" y2="340" stroke="#0d9488" stroke-width="1.5" marker-end="url(#shp-ah)"/>
                <line x1="525" y1="150" x2="170" y2="315" stroke="#0d9488" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#shp-ah)"/>
                <text x="340" y="310" font-size="9" fill="#0d9488">shop_allocate_order()</text>

                <!-- Shipping row -->
                <rect x="460" y="410" width="80" height="40" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
                <text x="500" y="435" text-anchor="middle" font-size="10" font-weight="700" fill="#ea580c">shipped</text>
                <rect x="570" y="410" width="80" height="40" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
                <text x="610" y="425" text-anchor="middle" font-size="10" font-weight="700" fill="#ea580c">in_transit</text>
                <text x="610" y="440" text-anchor="middle" font-size="9" fill="#78716c">tracking</text>
                <rect x="680" y="410" width="110" height="40" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
                <text x="735" y="435" text-anchor="middle" font-size="11" font-weight="800" fill="#ea580c">delivered</text>
                <line x1="500" y1="360" x2="500" y2="405" stroke="#ea580c" stroke-width="1.5" marker-end="url(#shp-ah-o)"/>
                <line x1="540" y1="430" x2="565" y2="430" stroke="#ea580c" stroke-width="1.5" marker-end="url(#shp-ah-o)"/>
                <line x1="650" y1="430" x2="675" y2="430" stroke="#ea580c" stroke-width="1.5" marker-end="url(#shp-ah-o)"/>
                <line x1="735" y1="410" x2="745" y2="75" stroke="#7c3aed" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#shp-ah)"/>
                <line x1="755" y1="155" x2="755" y2="410" stroke="#ea580c" stroke-width="1" stroke-dasharray="4,3"/>
                <text x="770" y="280" font-size="9" fill="#ea580c" transform="rotate(90,770,280)">Sendcloud webhook</text>

                <!-- Email markers -->
                <text x="420" y="170" font-size="8" fill="#16a34a">📧 order_confirmation</text>
                <text x="600" y="170" font-size="8" fill="#2563eb">📧 shipped</text>
                <text x="730" y="170" font-size="8" fill="#ea580c">📧 delivered</text>
              </svg>
            ` }} />
            <p className="mt-2 text-center text-[11px] italic text-slate-400">End-to-end DesShop commerce flow — storefront → Mollie → pick/pack → Sendcloud → delivery</p>
          </div>

          {/* 3. Email Pipeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">3. Transactional Email Pipeline</h4>
            <p className="text-[12px] text-slate-500">All customer-facing emails sent by DesShop. i18n: NL/EN/DE. Brand: DESSHOP dark header with amber accent.</p>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Code</th><th className="px-3 py-2">Trigger</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Template</th>
                </tr>
              </thead>
              <tbody>
                {SHOP_EMAILS.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2"><span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: r.color + '18', color: r.color }}>{r.code}</span></td>
                    <td className="px-3 py-2 text-slate-500">{r.trigger}</td>
                    <td className="px-3 py-2 text-slate-500">{r.to}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{r.template}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 font-mono text-[10px] text-slate-400">Implementation: lib/email/shipment-emails.ts — sendShipmentEmail(orderId, type)</p>
          </div>

          {/* 4. Screen & API Map */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">4. Screen & API Map</h4>
            <p className="text-[12px] text-slate-500">All DesShop screens and API routes built in P0–P4, grouped by layer.</p>
            {SHOP_SCREENS.map((group) => (
              <div key={group.layer} className="mt-4">
                <h5 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: group.lc }}>{group.layer}</h5>
                <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {group.screens.map((s) => (
                    <div key={s.code} className="flex items-center gap-2 rounded border border-slate-100 px-3 py-1.5">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: group.lc + '18', color: group.lc }}>{s.code}</span>
                      <span className="text-[11px] text-slate-700">{s.name}</span>
                      <span className="ml-auto font-mono text-[9px] text-slate-400">{s.route}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 5. Database Tables (65 tables) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">5. Database Schema</h4>
            <p className="text-[12px] text-slate-500">65 tables with <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">shop_</code> prefix. RLS enforced — service_role for admin, anon for storefront reads.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { group: 'Catalog', color: PURPLE, tables: ['products', 'variants', 'brands', 'categories', 'attributes', 'attribute_groups', 'media', 'product_media', 'product_categories', 'options', 'option_values', 'variant_options', 'variant_attribute_values', 'bundles', 'bundle_components', 'documents', 'related_products', 'collections', 'collection_products', 'collection_rules', 'fitment', 'fitment_targets', 'fitment_requests'] },
                { group: 'Storefront', color: ACCENT, tables: ['search_queries', 'search_synonyms', 'seo_overrides', 'redirects'] },
                { group: 'Commerce', color: GREEN, tables: ['carts', 'cart_lines', 'orders', 'order_lines', 'order_events', 'payments', 'payment_events', 'customers', 'addresses', 'consents'] },
                { group: 'Pricing', color: AMBER, tables: ['prices', 'price_lists', 'coupons', 'promotions', 'tax_classes', 'tax_rates', 'shipping_zones', 'shipping_methods', 'carriers'] },
                { group: 'Fulfilment', color: TEAL, tables: ['allocations', 'pick_lists', 'pick_list_items', 'shipments', 'shipment_lines', 'shipment_packages', 'shipment_events', 'tracking_events', 'manifests', 'serials'] },
                { group: 'Inventory', color: ORANGE, tables: ['stock_items', 'stock_movements', 'stock_reservations', 'locations', 'hazard_profiles'] },
                { group: 'System', color: RED, tables: ['settings', 'customer_groups', 'refunds', 'webhook_inbox'] },
              ].map(g => (
                <div key={g.group}>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: g.color }}>{g.group} ({g.tables.length})</div>
                  {g.tables.map(t => (
                    <div key={t} className="font-mono text-[10px] text-slate-500">shop_{t}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 6. Implementation Phases */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-1 text-[13px] font-bold text-slate-700">6. Implementation Phases</h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Phase</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: 'P0', name: 'Foundation', scope: 'Module registration, PM2, SQL schema, DDL protection, seed guard', status: 'done', color: GREEN },
                    { code: 'P1', name: 'Catalog', scope: 'Products, variants, attributes, media, bundles, fitment, categories, brands', status: 'done', color: GREEN },
                    { code: 'P2', name: 'Storefront', scope: 'PLP, PDP, search, fitment finder, brand pages, SEO, i18n NL/EN/DE', status: 'done', color: GREEN },
                    { code: 'P3', name: 'Cart & Checkout', scope: 'Cart API/UI, 3-step checkout, Mollie payment, order creation, confirmation email', status: 'done', color: GREEN },
                    { code: 'P4', name: 'Order & Fulfilment', scope: 'Order workspace, pick/pack/ship, Sendcloud, serial capture, guest tracking, shipment emails', status: 'done', color: GREEN },
                    { code: 'P5', name: 'Finance', scope: 'Invoices, credit notes, VAT/OSS, refund dual-control, settlements', status: 'not_started', color: AMBER },
                    { code: 'P6', name: 'After-Sales', scope: 'Returns/RMA, warranty claims, supplier RMA, guest tracking enhancements', status: 'not_started', color: AMBER },
                    { code: 'P7', name: 'Procurement', scope: 'Suppliers, POs, goods-in, cycle counting, feed importer, dropship', status: 'not_started', color: AMBER },
                    { code: 'P8', name: 'Compliance', scope: 'WEEE/Stibat/Afvalfonds, hazard profiles, GDPR, legal pages', status: 'not_started', color: AMBER },
                    { code: 'P9', name: 'Hardening & Launch', scope: 'E2E tests, security review, monitoring, backup drill, go-live', status: 'not_started', color: AMBER },
                  ].map((p, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold" style={{ color: p.color }}>{p.code}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700">{p.name}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">{p.scope}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-400">Program: DESSHOP in SY051 Implementation Cockpit · 10 phases, 130 BOP objects, 134 dependencies</p>
          </div>

          <div className="text-center text-[10px] text-slate-400">
            <a href="/console/sys/docs?q=desshop-commerce" className="text-amber-500 hover:underline">← SY034 Docs: DesShop Commerce</a>
            {' · '}
            <a href="/console/sys/impl" className="text-blue-500 hover:underline">SY051 Implementation Cockpit →</a>
          </div>
        </div>
      )}

      {tab === 'shortlink' && (
        <div className="mt-6">
          {/* Architecture overview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">Short-Link Redirect Flow</h3>
            <p className="mt-1 text-[12px] text-slate-500">Prefixed URLs redirect to listings with UTM parameters. Per-tenant toggle via <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-600">bop_tenants.feature_flags.shortlink_enabled</code>. Every click is logged and linked to the visitor session.</p>
            <svg viewBox="0 0 860 340" className="mt-4 w-full" style={{ maxWidth: 860 }}>
              <defs>
                <marker id="sl-arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill={ACCENT} /></marker>
                <marker id="sl-arr-teal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill={TEAL} /></marker>
                <marker id="sl-arr-amber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill={AMBER} /></marker>
              </defs>
              {/* Row 1: main redirect flow */}
              <rect x="10" y="30" width="120" height="44" rx="8" fill="#eff6ff" stroke={ACCENT} strokeWidth="1.5" />
              <text x="70" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill={ACCENT}>Browser</text>
              <text x="70" y="62" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">/m262701</text>

              <line x1="130" y1="52" x2="165" y2="52" stroke={ACCENT} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="168" y="30" width="120" height="44" rx="8" fill="#fffbeb" stroke={AMBER} strokeWidth="1.5" />
              <text x="228" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill={AMBER}>Middleware</text>
              <text x="228" y="62" textAnchor="middle" fontSize="9" fill="#64748b">bypass regex</text>

              <line x1="288" y1="52" x2="323" y2="52" stroke={ACCENT} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="326" y="30" width="130" height="44" rx="8" fill="#eff6ff" stroke={ACCENT} strokeWidth="1.5" />
              <text x="391" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill={ACCENT}>[code]/route.ts</text>
              <text x="391" y="62" textAnchor="middle" fontSize="9" fill="#64748b">parse prefix + ref_no</text>

              <line x1="456" y1="52" x2="491" y2="52" stroke={TEAL} strokeWidth="1.5" markerEnd="url(#sl-arr-teal)" />

              <rect x="494" y="30" width="130" height="44" rx="8" fill="#f0fdfa" stroke={TEAL} strokeWidth="1.5" />
              <text x="559" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill={TEAL}>bop_listings</text>
              <text x="559" y="62" textAnchor="middle" fontSize="9" fill="#64748b">lookup ref_no → slug</text>

              <line x1="624" y1="52" x2="659" y2="52" stroke={GREEN} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="662" y="30" width="180" height="44" rx="8" fill="#f0fdf4" stroke={GREEN} strokeWidth="1.5" />
              <text x="752" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill={GREEN}>302 Redirect</text>
              <text x="752" y="62" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">/{'{locale}'}/{'{slug}'}?utm_*</text>

              {/* Row 2: DB lookups */}
              <line x1="391" y1="74" x2="391" y2="110" stroke={PURPLE} strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#sl-arr)" />
              <rect x="326" y="113" width="130" height="38" rx="6" fill="#f5f3ff" stroke={PURPLE} strokeWidth="1.5" />
              <text x="391" y="137" textAnchor="middle" fontSize="9" fontWeight="700" fill={PURPLE}>bop_shortlink_prefixes</text>

              <line x1="391" y1="151" x2="391" y2="180" stroke={PURPLE} strokeWidth="1" strokeDasharray="4 3" />
              <text x="395" y="170" fontSize="8" fill="#64748b">UTM params</text>

              {/* Row 2: async click log */}
              <line x1="752" y1="74" x2="752" y2="110" stroke={ORANGE} strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#sl-arr-amber)" />
              <rect x="662" y="113" width="180" height="38" rx="6" fill="#fff7ed" stroke={ORANGE} strokeWidth="1.5" />
              <text x="752" y="137" textAnchor="middle" fontSize="9" fontWeight="700" fill={ORANGE}>bop_shortlink_clicks</text>

              <text x="756" y="107" fontSize="8" fill={ORANGE} fontStyle="italic">async INSERT</text>

              {/* Row 3: Attribution flow */}
              <rect x="10" y="200" width="840" height="2" rx="1" fill="#e7e5e4" />
              <text x="10" y="225" fontSize="10" fontWeight="700" fill="#64748b">Session Attribution</text>

              <rect x="10" y="240" width="110" height="38" rx="6" fill="#eff6ff" stroke={ACCENT} strokeWidth="1.5" />
              <text x="65" y="264" textAnchor="middle" fontSize="9" fontWeight="700" fill={ACCENT}>page_view hit</text>

              <line x1="120" y1="259" x2="145" y2="259" stroke={ACCENT} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="148" y="240" width="130" height="38" rx="6" fill="#eff6ff" stroke={ACCENT} strokeWidth="1.5" />
              <text x="213" y="258" textAnchor="middle" fontSize="9" fontWeight="700" fill={ACCENT}>resolveAttribution()</text>
              <text x="213" y="269" textAnchor="middle" fontSize="8" fill="#64748b">UTM {'>'} gclid {'>'} fbclid {'>'} ref</text>

              <line x1="278" y1="259" x2="303" y2="259" stroke={TEAL} strokeWidth="1.5" markerEnd="url(#sl-arr-teal)" />

              <rect x="306" y="240" width="140" height="38" rx="6" fill="#f0fdfa" stroke={TEAL} strokeWidth="1.5" />
              <text x="376" y="258" textAnchor="middle" fontSize="9" fontWeight="700" fill={TEAL}>dm_activity_sessions</text>
              <text x="376" y="269" textAnchor="middle" fontSize="8" fill="#64748b">first-touch immutable</text>

              <line x1="446" y1="259" x2="471" y2="259" stroke={PURPLE} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="474" y="240" width="110" height="38" rx="6" fill="#f5f3ff" stroke={PURPLE} strokeWidth="1.5" />
              <text x="529" y="258" textAnchor="middle" fontSize="9" fontWeight="700" fill={PURPLE}>dm_inquiries</text>
              <text x="529" y="269" textAnchor="middle" fontSize="8" fill="#64748b">session_id FK</text>

              <line x1="584" y1="259" x2="609" y2="259" stroke={RED} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="612" y="240" width="120" height="38" rx="6" fill="#fef2f2" stroke={RED} strokeWidth="1.5" />
              <text x="672" y="258" textAnchor="middle" fontSize="9" fontWeight="700" fill={RED}>conversion_exports</text>
              <text x="672" y="269" textAnchor="middle" fontSize="8" fill="#64748b">GA4 / Meta CAPI</text>

              <line x1="732" y1="259" x2="757" y2="259" stroke={RED} strokeWidth="1.5" markerEnd="url(#sl-arr)" />

              <rect x="760" y="240" width="90" height="38" rx="6" fill="#fef2f2" stroke={RED} strokeWidth="1.5" />
              <text x="805" y="264" textAnchor="middle" fontSize="9" fontWeight="700" fill={RED}>Upload</text>

              {/* Legend */}
              <rect x="10" y="300" width="8" height="8" rx="2" fill={ACCENT} />
              <text x="22" y="308" fontSize="8" fill="#64748b">Route / API</text>
              <rect x="90" y="300" width="8" height="8" rx="2" fill={TEAL} />
              <text x="102" y="308" fontSize="8" fill="#64748b">DB Lookup</text>
              <rect x="160" y="300" width="8" height="8" rx="2" fill={PURPLE} />
              <text x="172" y="308" fontSize="8" fill="#64748b">Config Table</text>
              <rect x="240" y="300" width="8" height="8" rx="2" fill={ORANGE} />
              <text x="252" y="308" fontSize="8" fill="#64748b">Async Write</text>
              <rect x="320" y="300" width="8" height="8" rx="2" fill={GREEN} />
              <text x="332" y="308" fontSize="8" fill="#64748b">Response</text>
              <rect x="400" y="300" width="8" height="8" rx="2" fill={RED} />
              <text x="412" y="308" fontSize="8" fill="#64748b">Conversion</text>
            </svg>
          </div>

          {/* Prefix Table */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">Prefix Codes</h3>
            <p className="mt-1 text-[12px] text-slate-500">Each prefix maps to UTM parameters. Adding a platform = INSERT one row to <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-600">bop_shortlink_prefixes</code>.</p>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Prefix</th><th className="px-3 py-2">utm_source</th><th className="px-3 py-2">utm_medium</th>
                  <th className="px-3 py-2">Label</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Example URL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { p: 'm', s: 'marktplaats', m: 'marketplace', l: 'Marktplaats', c: 'marketplace', clr: ACCENT },
                  { p: 'f', s: 'facebook',    m: 'social',      l: 'Facebook',    c: 'social',      clr: ACCENT },
                  { p: 'i', s: 'instagram',   m: 'social',      l: 'Instagram',   c: 'social',      clr: PURPLE },
                  { p: 'w', s: 'whatsapp',    m: 'chat',        l: 'WhatsApp',    c: 'chat',        clr: GREEN },
                  { p: 'e', s: 'email',       m: 'email',       l: 'Email',       c: 'email',       clr: AMBER },
                  { p: 'q', s: 'qr',          m: 'print',       l: 'QR / Print',  c: 'print',       clr: ORANGE },
                  { p: 'g', s: 'google',      m: 'cpc',         l: 'Google Ads',  c: 'paid_search', clr: RED },
                  { p: 't', s: 'telegram',    m: 'chat',        l: 'Telegram',    c: 'chat',        clr: TEAL },
                  { p: 'x', s: 'x',           m: 'social',      l: 'X / Twitter', c: 'social',      clr: '#64748b' },
                ].map(r => (
                  <tr key={r.p} className="border-b border-slate-50">
                    <td className="px-3 py-2"><span className="rounded px-2 py-0.5 font-mono text-[11px] font-bold" style={{ background: r.clr + '18', color: r.clr }}>{r.p}</span></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.s}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.m}</td>
                    <td className="px-3 py-2 text-slate-600">{r.l}</td>
                    <td className="px-3 py-2"><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">{r.c}</span></td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">/{r.p}262701</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Channel Classification */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">Channel Classification</h3>
            <p className="mt-1 text-[12px] text-slate-500">First-touch attribution resolved once per session. Channels determined by UTM, click IDs, and referrer domain lookup.</p>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Channel</th><th className="px-3 py-2">Trigger</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { ch: 'organic_search', t: 'google/bing/duckduckgo referrer, no cpc', clr: GREEN },
                  { ch: 'paid_search',    t: 'gclid present OR google + medium=cpc', clr: RED },
                  { ch: 'social',         t: 'facebook/instagram/x/linkedin/tiktok referrer or UTM', clr: ACCENT },
                  { ch: 'marketplace',    t: 'marktplaats/2dehands/mobile.de referrer or UTM', clr: AMBER },
                  { ch: 'chat',           t: 'whatsapp/telegram UTM', clr: GREEN },
                  { ch: 'email',          t: 'utm_medium=email', clr: PURPLE },
                  { ch: 'print',          t: 'utm_medium=print or source=qr', clr: ORANGE },
                  { ch: 'referral',       t: 'external referrer, not classified above', clr: TEAL },
                  { ch: 'internal',       t: 'own domains (bop_own_domains)', clr: '#64748b' },
                  { ch: 'direct',         t: 'no signal', clr: '#94a3b8' },
                ].map(r => (
                  <tr key={r.ch} className="border-b border-slate-50">
                    <td className="px-3 py-2"><span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold" style={{ background: r.clr + '18', color: r.clr }}>{r.ch}</span></td>
                    <td className="px-3 py-2 text-slate-500">{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Data Tables */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">Data Tables</h3>
            <p className="mt-1 text-[12px] text-slate-500">All new tables use <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-600">bop_*</code> prefix for BOP V2 standard. Per-tenant activation via <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-600">feature_flags.shortlink_enabled</code>.</p>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Table</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { t: 'bop_shortlink_prefixes', type: 'NEW', purpose: 'Prefix → UTM mapping (9 platforms)', clr: GREEN },
                  { t: 'bop_shortlink_clicks',   type: 'NEW', purpose: 'Click log with IP hash, bot flag, session join', clr: GREEN },
                  { t: 'bop_channel_domains',     type: 'NEW', purpose: 'Domain → channel classification (19 domains)', clr: GREEN },
                  { t: 'bop_own_domains',          type: 'NEW', purpose: 'Internal domains list (4 domains)', clr: GREEN },
                  { t: 'bop_conversion_exports',  type: 'NEW', purpose: 'GA4/Meta CAPI conversion queue', clr: GREEN },
                  { t: 'dm_activity_sessions',    type: 'ALTER', purpose: '+gclid, fbclid, referrer_domain, acquisition_*, traffic_channel, is_bot', clr: AMBER },
                  { t: 'dm_inquiries',            type: 'ALTER', purpose: '+session_id (FK), source, channel', clr: AMBER },
                ].map(r => (
                  <tr key={r.t} className="border-b border-slate-50">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{r.t}</td>
                    <td className="px-3 py-2"><span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold" style={{ background: r.clr + '18', color: r.clr }}>{r.type}</span></td>
                    <td className="px-3 py-2 text-slate-500">{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* File Map */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">File Map</h3>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Layer</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { layer: 'MIDDLEWARE', file: 'src/middleware.ts', action: 'MODIFY — bypass short-link regex', clr: AMBER },
                  { layer: 'ROUTE', file: 'src/app/[code]/route.ts', action: 'NEW — redirect handler', clr: GREEN },
                  { layer: 'LIB', file: 'src/lib/shortlink-config.ts', action: 'NEW — prefix loader, bot detector, IP hasher', clr: GREEN },
                  { layer: 'LIB', file: 'src/lib/attribution.ts', action: 'NEW — resolveAttribution() + classifyChannel()', clr: GREEN },
                  { layer: 'LIB', file: 'src/lib/conversion-export.ts', action: 'NEW — GA4/Meta CAPI queue', clr: GREEN },
                  { layer: 'API', file: 'src/app/api/log/route.ts', action: 'MODIFY — gclid/fbclid + attribution', clr: AMBER },
                  { layer: 'CLIENT', file: 'src/components/click-tracker.tsx', action: 'MODIFY — _slc param capture', clr: AMBER },
                  { layer: 'SQL', file: 'sql/m73_shortlink_attribution.sql', action: 'NEW — full migration', clr: PURPLE },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-3 py-2"><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">{r.layer}</span></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{r.file}</td>
                    <td className="px-3 py-2"><span style={{ color: r.clr }} className="text-[11px] font-semibold">{r.action}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Implementation phases */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">Implementation Phases</h3>
            <table className="mt-3 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Phase</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Est.</th><th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { p: 'P0', t: 'Data Layer & Configuration', est: '~4h', done: false },
                  { p: 'P1', t: 'Short-Link Redirect Endpoint', est: '~4h', done: false },
                  { p: 'P2', t: 'Attribution Resolver & Tracker', est: '~4h', done: false },
                  { p: 'P3', t: 'Lead Attribution & Conversion Export', est: '~4h', done: false },
                  { p: 'P4', t: 'Dashboard & Copy Widget', est: '~4h', done: false },
                  { p: 'P5', t: 'Verification & Testing', est: '~4h', done: false },
                ].map(r => (
                  <tr key={r.p} className="border-b border-slate-50">
                    <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-600">{r.p}</td>
                    <td className="px-3 py-2 text-slate-600">{r.t}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{r.est}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${r.done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {r.done ? 'DONE' : 'NOT STARTED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 font-mono text-[10px] text-slate-400">Program: SHORTLINK in SY051 Implementation Cockpit · 6 phases, 33 tasks, 5 new BOP tables</p>
          </div>

          <div className="text-center text-[10px] text-slate-400">
            <a href="/console/sys/docs?q=shortlink-attribution" className="text-orange-500 hover:underline">← SY034 Docs: Short-Link Attribution</a>
            {' · '}
            <a href="/console/sys/impl" className="text-blue-500 hover:underline">SY051 Implementation Cockpit →</a>
          </div>
        </div>
      )}

      {tab === 'guards' && (
        <div className="mt-6 space-y-3">
          {GUARDS.map((g, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px] ${g.bg}`}>{g.icon}</div>
              <div>
                <div className="text-[13px] font-bold text-slate-700">{g.title}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">{g.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'docflow' && (
        <div className="mt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700">bop_doc_flow Relations</h3>
            <p className="mt-1 text-[12px] text-slate-500">Every document conversion is recorded with a directional link inside the case.</p>
            <table className="mt-4 w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Relation</th>
                  <th className="px-3 py-2">Meaning</th>
                  <th className="px-3 py-2">Example</th>
                </tr>
              </thead>
              <tbody>
                {DOC_FLOW.map((d, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-3 py-2.5">
                      <span className="rounded px-2 py-0.5 font-mono text-[11px] font-bold" style={{ background: d.color + '18', color: d.color }}>
                        {d.rel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{d.desc}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{d.ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
