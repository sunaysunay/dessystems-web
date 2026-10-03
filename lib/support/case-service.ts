import { getServerClient } from '@/lib/supabase-server';
import { nextCaseNumber } from './numbering';
import {
  type Case,
  type CaseMessage,
  type CaseEvent,
  type CaseStatus,
  type CasePriority,
  type ChannelKind,
  type MessageVisibility,
  type MessageSenderRole,
  type EventActorType,
  type CreateCaseResult,
  type TransitionResult,
  type AddMessageResult,
  type AssignResult,
  VALID_TRANSITIONS,
} from './types';

interface CreateParams {
  tenantId: number;
  contactId: number | null;
  createdBy: string;
  subject: string;
  description: string;
  category: string;
  priority: CasePriority;
  channelKind: ChannelKind;
  correlationId?: string;
  idempotencyKey?: string;
  ctxRoute?: string;
  ctxBrowser?: string;
  ctxEnv?: string;
  ctxExtra?: Record<string, unknown>;
}

export class CaseService {
  private supabase = getServerClient();

  async create(params: CreateParams): Promise<CreateCaseResult> {
    const caseNumber = await nextCaseNumber(params.tenantId);

    const { data: caseRow, error: caseErr } = await this.supabase
      .from('sup_requests')
      .insert({
        tenant_id: params.tenantId,
        case_number: caseNumber,
        contact_id: params.contactId,
        created_by: params.createdBy,
        subject: params.subject.trim(),
        category: params.category,
        priority: params.priority,
        status: 'new' as CaseStatus,
        channel_kind: params.channelKind,
        correlation_id: params.correlationId || null,
        idempotency_key: params.idempotencyKey || null,
        ctx_route: params.ctxRoute || null,
        ctx_browser: params.ctxBrowser || null,
        ctx_env: params.ctxEnv || null,
        ctx_extra: params.ctxExtra || {},
      })
      .select()
      .single();

    if (caseErr || !caseRow) {
      throw new Error(`Failed to create case: ${caseErr?.message ?? 'unknown error'}`);
    }

    const { data: msgRow, error: msgErr } = await this.supabase
      .from('sup_messages')
      .insert({
        request_id: caseRow.id,
        sender_id: params.createdBy,
        sender_role: params.contactId ? 'user' : 'admin',
        body: params.description.trim(),
        visibility: 'public',
        channel_kind: params.channelKind,
      })
      .select()
      .single();

    if (msgErr || !msgRow) {
      throw new Error(`Failed to create initial message: ${msgErr?.message ?? 'unknown error'}`);
    }

    const { data: eventRow, error: eventErr } = await this.supabase
      .from('sup_case_events')
      .insert({
        tenant_id: params.tenantId,
        case_id: caseRow.id,
        event_type: 'case.created',
        actor_type: (params.contactId ? 'contact' : 'agent') as EventActorType,
        actor_id: params.createdBy,
        after_val: {
          case_number: caseNumber,
          subject: params.subject,
          category: params.category,
          priority: params.priority,
          channel: params.channelKind,
        },
        correlation_id: params.correlationId || null,
      })
      .select()
      .single();

    if (eventErr || !eventRow) {
      throw new Error(`Failed to create event: ${eventErr?.message ?? 'unknown error'}`);
    }

    return {
      case: caseRow as unknown as Case,
      case_number: caseNumber,
      message: msgRow as unknown as CaseMessage,
      event: eventRow as unknown as CaseEvent,
    };
  }

  async transition(
    caseId: number,
    newStatus: CaseStatus,
    actorType: EventActorType,
    actorId: string,
    resolution?: string
  ): Promise<TransitionResult> {
    const { data: current, error: fetchErr } = await this.supabase
      .from('sup_requests')
      .select('id, tenant_id, status, case_number')
      .eq('id', caseId)
      .single();

    if (fetchErr || !current) {
      throw new Error(`Case ${caseId} not found`);
    }

    const fromStatus = current.status as CaseStatus;
    const allowed = VALID_TRANSITIONS[fromStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${fromStatus} -> ${newStatus}`);
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      if (resolution) updates.resolution = resolution;
    }
    if (newStatus === 'closed') {
      updates.closed_at = new Date().toISOString();
    }

    const { data: updated, error: updateErr } = await this.supabase
      .from('sup_requests')
      .update(updates)
      .eq('id', caseId)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update case: ${updateErr?.message ?? 'unknown error'}`);
    }

    const { data: eventRow } = await this.supabase
      .from('sup_case_events')
      .insert({
        tenant_id: current.tenant_id,
        case_id: caseId,
        event_type: 'case.status_changed',
        actor_type: actorType,
        actor_id: actorId,
        before_val: { status: fromStatus },
        after_val: { status: newStatus, resolution: resolution || null },
      })
      .select()
      .single();

    return {
      case: updated as unknown as Case,
      event: eventRow as unknown as CaseEvent,
      from_status: fromStatus,
      to_status: newStatus,
    };
  }

  async addMessage(
    caseId: number,
    senderId: string,
    senderRole: MessageSenderRole,
    body: string,
    visibility: MessageVisibility = 'public',
    channelKind?: ChannelKind
  ): Promise<AddMessageResult> {
    const { data: caseRow } = await this.supabase
      .from('sup_requests')
      .select('id, tenant_id, status, first_response_at')
      .eq('id', caseId)
      .single();

    if (!caseRow) throw new Error(`Case ${caseId} not found`);

    const { data: msgRow, error: msgErr } = await this.supabase
      .from('sup_messages')
      .insert({
        request_id: caseId,
        sender_id: senderId,
        sender_role: senderRole === 'contact' ? 'user' : senderRole === 'agent' ? 'admin' : senderRole,
        body: body.trim(),
        visibility,
        channel_kind: channelKind || null,
      })
      .select()
      .single();

    if (msgErr || !msgRow) {
      throw new Error(`Failed to add message: ${msgErr?.message ?? 'unknown error'}`);
    }

    if (senderRole === 'agent' && !caseRow.first_response_at) {
      await this.supabase
        .from('sup_requests')
        .update({ first_response_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', caseId);
    }

    await this.supabase
      .from('sup_requests')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', caseId);

    const { data: eventRow } = await this.supabase
      .from('sup_case_events')
      .insert({
        tenant_id: caseRow.tenant_id,
        case_id: caseId,
        event_type: 'message.created',
        actor_type: (senderRole === 'contact' ? 'contact' : senderRole === 'agent' ? 'agent' : 'system') as EventActorType,
        actor_id: senderId,
        after_val: { visibility, sender_role: senderRole },
      })
      .select()
      .single();

    return {
      message: msgRow as unknown as CaseMessage,
      event: eventRow as unknown as CaseEvent,
    };
  }

  async assign(
    caseId: number,
    team: string | null,
    agentId: string | null,
    actorId: string
  ): Promise<AssignResult> {
    const { data: current } = await this.supabase
      .from('sup_requests')
      .select('id, tenant_id, assigned_team, assigned_agent_id')
      .eq('id', caseId)
      .single();

    if (!current) throw new Error(`Case ${caseId} not found`);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (team !== undefined) updates.assigned_team = team;
    if (agentId !== undefined) updates.assigned_agent_id = agentId;

    const { data: updated, error } = await this.supabase
      .from('sup_requests')
      .update(updates)
      .eq('id', caseId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to assign case: ${error?.message ?? 'unknown error'}`);
    }

    const { data: eventRow } = await this.supabase
      .from('sup_case_events')
      .insert({
        tenant_id: current.tenant_id,
        case_id: caseId,
        event_type: 'case.assigned',
        actor_type: 'agent' as EventActorType,
        actor_id: actorId,
        before_val: { team: current.assigned_team, agent_id: current.assigned_agent_id },
        after_val: { team, agent_id: agentId },
      })
      .select()
      .single();

    return {
      case: updated as unknown as Case,
      event: eventRow as unknown as CaseEvent,
    };
  }
}
