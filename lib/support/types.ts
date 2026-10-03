// Support Connector Engine — type definitions

// ── Enums ──

export type ChannelKind = 'api' | 'email' | 'widget' | 'console' | 'portal';

export type CaseStatus =
  | 'new' | 'triage' | 'assigned' | 'in_progress'
  | 'waiting_customer' | 'waiting_provider'
  | 'resolved' | 'closed' | 'reopened' | 'cancelled';

export type CasePriority = 'low' | 'normal' | 'high' | 'critical';

export type MessageVisibility = 'public' | 'internal' | 'system';

export type MessageSenderRole = 'contact' | 'agent' | 'system' | 'api';

export type TenantKind = 'internal' | 'external';

export type TenantStatus = 'active' | 'suspended' | 'offboarded';

export type ContactRole = 'user' | 'admin';

export type EventActorType = 'contact' | 'agent' | 'system' | 'api';

// ── Status Machine ──

export const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new:               ['triage', 'assigned', 'cancelled'],
  triage:            ['assigned', 'cancelled'],
  assigned:          ['in_progress', 'cancelled'],
  in_progress:       ['waiting_customer', 'waiting_provider', 'resolved', 'cancelled'],
  waiting_customer:  ['in_progress', 'resolved', 'cancelled'],
  waiting_provider:  ['in_progress', 'cancelled'],
  resolved:          ['closed', 'reopened'],
  closed:            [],
  reopened:          ['in_progress', 'cancelled'],
  cancelled:         [],
};

// Legacy status mapping (backward compat with existing sup_requests data)
export const LEGACY_STATUS_MAP: Record<string, CaseStatus> = {
  open:          'new',
  waiting_admin: 'waiting_provider',
  waiting_user:  'waiting_customer',
  closed:        'closed',
};

// ── Tenant ──

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  kind: TenantKind;
  case_prefix: string;
  locale: string;
  timezone: string;
  channels_enabled: ChannelKind[];
  notify_config: Record<string, unknown>;
  branding: Record<string, unknown> | null;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

// ── Contact ──

export interface Contact {
  id: number;
  tenant_id: number;
  email: string;
  name: string | null;
  role: ContactRole;
  external_id: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Case ──

export interface Case {
  id: number;
  tenant_id: number;
  case_number: string | null;
  request_no: string;
  channel_kind: ChannelKind;
  contact_id: number | null;
  created_by: string;
  subject: string;
  category: string;
  priority: CasePriority;
  status: CaseStatus;
  resolution: string | null;
  assigned_team: string | null;
  assigned_agent_id: string | null;
  correlation_id: string | null;
  idempotency_key: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  ctx_route: string | null;
  ctx_browser: string | null;
  ctx_env: string | null;
  ctx_extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Messages ──

export interface CaseMessage {
  id: number;
  request_id: number;
  sender_id: string;
  sender_role: MessageSenderRole;
  body: string;
  visibility: MessageVisibility;
  channel_kind: ChannelKind | null;
  created_at: string;
}

// ── Events ──

export interface CaseEvent {
  id: number;
  tenant_id: number;
  case_id: number;
  event_type: string;
  actor_type: EventActorType;
  actor_id: string | null;
  before_val: Record<string, unknown> | null;
  after_val: Record<string, unknown> | null;
  correlation_id: string | null;
  created_at: string;
}

// ── Case Context ──

export interface CaseContext {
  case_id: number;
  tenant_id: number;
  app: string | null;
  app_version: string | null;
  environment: string | null;
  route: string | null;
  browser: string | null;
  os: string | null;
  locale: string | null;
  timezone: string | null;
  entity_refs: Record<string, string> | null;
  recent_errors: string[] | null;
  captured_at: string;
}

// ── API Client ──

export interface ApiClient {
  id: number;
  tenant_id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

// ── CreateCaseDTO — the universal ticket shape ──

export interface CreateCaseDTO {
  tenant_slug: string;
  channel_kind: ChannelKind;

  subject: string;
  description: string;
  category?: string;
  priority?: CasePriority;

  requester: {
    email: string;
    name?: string;
    external_id?: string;
  };

  context?: {
    app?: string;
    app_version?: string;
    route?: string;
    browser?: string;
    os?: string;
    environment?: string;
    locale?: string;
    entity_refs?: Record<string, string>;
    recent_errors?: string[];
  };

  attachments?: {
    filename: string;
    mime_type: string;
    size_bytes: number;
    data: Buffer | string;
  }[];

  correlation_id?: string;
  idempotency_key?: string;
}

// ── Adapter Interface ──

export interface ChannelAdapter {
  readonly kind: ChannelKind;
  parse(input: unknown): Promise<CreateCaseDTO>;
}

// ── CaseService method signatures ──

export interface CreateCaseResult {
  case: Case;
  case_number: string;
  message: CaseMessage;
  event: CaseEvent;
}

export interface TransitionResult {
  case: Case;
  event: CaseEvent;
  from_status: CaseStatus;
  to_status: CaseStatus;
}

export interface AddMessageResult {
  message: CaseMessage;
  event: CaseEvent;
}

export interface AssignResult {
  case: Case;
  event: CaseEvent;
}
