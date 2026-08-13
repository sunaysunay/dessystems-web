// ─────────────────────────────────────────────────────────────────────────────
// Trade Flow Engine — Core types
// Const arrays are the single source of truth; DB CHECK constraints mirror them.
// ─────────────────────────────────────────────────────────────────────────────

export const BUSINESS_LINES = [
  'vehicle_sale', 'camper_conversion', 'rental', 'ecommerce', 'sourcing',
] as const;
export type BusinessLine = typeof BUSINESS_LINES[number];

export const CASE_LANGUAGES = ['en', 'nl', 'de', 'fr', 'tr'] as const;
export type CaseLanguage = typeof CASE_LANGUAGES[number];

export const DOC_FLOW_RELATIONS = [
  'converted', 'reversed', 'partial', 'replaced', 'spawned',
] as const;
export type DocFlowRelation = typeof DOC_FLOW_RELATIONS[number];

export const ACTOR_TYPES = ['staff', 'customer', 'system'] as const;
export type ActorType = typeof ACTOR_TYPES[number];

export const APPROVAL_METHODS = ['link', 'in_person', 'email_reply'] as const;
export type ApprovalMethod = typeof APPROVAL_METHODS[number];

export const APPROVAL_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];

export const COPY_MODES = ['copy', 'derive', 'require_input', 'constant'] as const;
export type CopyMode = typeof COPY_MODES[number];

export const DOC_OBJECTS = [
  'crm_leads', 'sal_quotations', 'sal_orders',
  'fin_invoices', 'sal_handovers', 'sal_warranties', 'sal_surveys',
] as const;
export type DocObject = typeof DOC_OBJECTS[number];

export const LEAD_DIRECTIONS = ['buy_side', 'sell_side'] as const;
export type LeadDirection = typeof LEAD_DIRECTIONS[number];

export const LEAD_CHANNELS = [
  'website', 'marktplaats', 'autoscout', 'phone', 'walk_in',
  'referral', 'whatsapp', 'contact_form', 'appointment',
] as const;
export type LeadChannel = typeof LEAD_CHANNELS[number];

export const LEAD_STAGES = [
  'new', 'assigned', 'contacted', 'qualified', 'converted', 'lost', 'archived',
] as const;
export type LeadStage = typeof LEAD_STAGES[number];

export const QUOTATION_STATUSES = [
  'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled',
] as const;
export type QuotationStatus = typeof QUOTATION_STATUSES[number];

export const BTW_REGIMES = ['marge', 'btw_belast'] as const;
export type BtwRegime = typeof BTW_REGIMES[number];

export const ORDER_STATUSES = [
  'draft', 'confirmed', 'customer_confirmed',
  'in_preparation', 'ready', 'handover_scheduled',
  'delivered', 'completed', 'cancelled',
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const CANCEL_REASON_TYPES = [
  'customer_withdrew', 'financing_failed', 'vehicle_issue', 'other',
] as const;
export type CancelReasonType = typeof CANCEL_REASON_TYPES[number];

export const INVOICE_STATUSES = [
  'draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'credited',
] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export const INVOICE_KINDS = ['deposit', 'final', 'credit_note'] as const;
export type InvoiceKind = typeof INVOICE_KINDS[number];

export const HANDOVER_STATUSES = [
  'scheduled', 'in_progress', 'executed', 'completed', 'cancelled',
] as const;
export type HandoverStatus = typeof HANDOVER_STATUSES[number];

export const FUEL_LEVELS = [
  'empty', 'quarter', 'half', 'three_quarter', 'full', 'electric_pct',
] as const;
export type FuelLevel = typeof FUEL_LEVELS[number];

export const WARRANTY_STATUSES = ['active', 'claimed', 'expired', 'voided'] as const;
export type WarrantyStatus = typeof WARRANTY_STATUSES[number];

export const WARRANTY_TYPES = ['standard', 'extended', 'powertrain', 'full'] as const;
export type WarrantyType = typeof WARRANTY_TYPES[number];

export const CLAIM_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'resolved'] as const;
export type ClaimStatus = typeof CLAIM_STATUSES[number];

export const SURVEY_STATUSES = ['scheduled', 'sent', 'completed', 'expired', 'skipped'] as const;
export type SurveyStatus = typeof SURVEY_STATUSES[number];

export const CASE_STAGES = [
  'lead', 'quotation', 'order', 'invoiced', 'handover', 'delivered', 'warranty',
] as const;
export type CaseStage = typeof CASE_STAGES[number];

export const VEHICLE_AVAILABILITY = ['available', 'reserved', 'sold', 'unknown'] as const;
export type VehicleAvailability = typeof VEHICLE_AVAILABILITY[number];

// ─────────────────────────────────────────────────────────────────────────────

export interface Case {
  id: string;
  tenant_id: string;
  case_number: string;
  partner_id: string | null;
  asset_id: string | null;
  business_line: BusinessLine;
  owner: string | null;
  language: CaseLanguage;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocFlow {
  id: string;
  tenant_id: string;
  case_id: string;
  src_object: string;
  src_id: string;
  tgt_object: string;
  tgt_id: string;
  relation: DocFlowRelation;
  actor: string | null;
  created_at: string;
}

export interface StatusTransition {
  id: string;
  tenant_id: string;
  object_type: string;
  object_id: string;
  from_status: string | null;
  to_status: string;
  actor_type: ActorType;
  actor: string | null;
  reason: string | null;
  approval_id: string | null;
  created_at: string;
}

export interface CustomerApproval {
  id: string;
  tenant_id: string;
  case_id: string | null;
  object_type: string;
  object_id: string;
  token: string;
  method: ApprovalMethod;
  status: ApprovalStatus;
  expires_at: string;
  responded_at: string | null;
  response_ip: string | null;
  response_ua: string | null;
  signature_data: Record<string, unknown> | null;
  decline_reason: string | null;
  created_at: string;
}

export interface ConversionRule {
  id: string;
  src_object: string;
  src_status: string;
  tgt_object: string;
  relation: DocFlowRelation;
  is_active: boolean;
  label: Record<string, string>;
  created_at: string;
}

export interface CopyControl {
  id: string;
  rule_id: string;
  src_field: string;
  tgt_field: string;
  copy_mode: CopyMode;
  default_value: string | null;
  sort_order: number;
  created_at: string;
}
