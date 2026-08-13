export type SystemType = 'rest_api' | 'soap' | 'ftp' | 'db' | 'webhook';
export type Direction  = 'pull' | 'push' | 'bidirectional';
export type AuthType   = 'none' | 'api_key' | 'oauth2' | 'basic';
export type SysStatus  = 'active' | 'disabled' | 'degraded';
export type MsgStatus  = 'pending' | 'claimed' | 'done' | 'failed' | 'dead';
export type RunStatus  = 'ok' | 'error' | 'partial';

export interface IntSystem {
  id: string; tenant_id: number; system_key: string; name: string;
  system_type: SystemType; direction: Direction; base_url: string | null;
  version: string | null; auth_type: AuthType; secret_ref: string | null;
  capabilities: Record<string, boolean>; status: SysStatus;
  rate_limit_rps: number | null; health_url: string | null;
  last_health_check: string | null; last_sync_at: string | null;
  last_error: string | null; error_count: number;
  config: Record<string, unknown>; created_at: string; updated_at: string;
}

export interface IntFlow {
  id: string; system_id: string; flow_key: string; name: string;
  direction: 'inbound' | 'outbound' | 'sync'; trigger_event: string | null;
  schedule_cron: string | null; entity_type: string | null; active: boolean;
  config: Record<string, unknown>; created_at: string;
  int_systems?: Pick<IntSystem, 'name' | 'system_key'>;
}

export interface IntMessage {
  id: string; flow_id: string | null; system_id: string | null;
  message_type: string; entity_type: string | null; entity_id: string | null;
  priority: number; status: MsgStatus; attempts: number; max_attempts: number;
  next_attempt_at: string; payload: Record<string, unknown>;
  result: Record<string, unknown> | null; claimed_by: string | null;
  claimed_at: string | null; created_at: string; updated_at: string;
  int_systems?: Pick<IntSystem, 'name' | 'system_key'>;
}

export interface IntRun {
  id: string; message_id: string | null; flow_id: string | null;
  system_id: string | null; entity_type: string | null; entity_id: string | null;
  external_id: string | null; correlation_id: string | null; status: RunStatus;
  trigger: string | null; triggered_by: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null; response_ms: number | null; created_at: string;
  int_systems?: Pick<IntSystem, 'name' | 'system_key'>;
  int_flows?: Pick<IntFlow, 'flow_key' | 'name'>;
}
