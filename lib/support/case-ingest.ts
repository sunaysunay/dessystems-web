import { getServerClient } from '@/lib/supabase-server';
import { CaseService } from './case-service';
import {
  type CreateCaseDTO,
  type CreateCaseResult,
  type Tenant,
  type Contact,
} from './types';
import { notifyRequestCreated } from './notify';

export class CaseIngest {
  private caseService = new CaseService();
  private supabase = getServerClient();

  async submit(dto: CreateCaseDTO): Promise<CreateCaseResult> {
    const tenant = await this.resolveTenant(dto.tenant_slug);
    this.validateChannel(tenant, dto.channel_kind);
    await this.checkIdempotency(dto.idempotency_key);
    const contact = await this.resolveOrCreateContact(tenant.id, dto.requester);

    const result = await this.caseService.create({
      tenantId: tenant.id,
      contactId: contact.id,
      createdBy: contact.external_id || String(contact.id),
      subject: dto.subject,
      description: dto.description,
      category: dto.category || 'other',
      priority: dto.priority || 'normal',
      channelKind: dto.channel_kind,
      correlationId: dto.correlation_id,
      idempotencyKey: dto.idempotency_key,
      ctxRoute: dto.context?.route,
      ctxBrowser: dto.context?.browser,
      ctxEnv: dto.context?.environment,
      ctxExtra: dto.context ? {
        app: dto.context.app,
        app_version: dto.context.app_version,
        os: dto.context.os,
        locale: dto.context.locale,
        entity_refs: dto.context.entity_refs,
        recent_errors: dto.context.recent_errors,
      } : undefined,
    });

    if (dto.context) {
      await this.saveContext(result.case.id, tenant.id, dto.context);
    }

    this.fireNotifications(result, tenant, contact).catch(() => {});

    return result;
  }

  private async resolveTenant(slug: string): Promise<Tenant> {
    const { data, error } = await this.supabase
      .from('sup_tenants')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      throw new Error(`Tenant '${slug}' not found or inactive`);
    }

    return data as unknown as Tenant;
  }

  private validateChannel(tenant: Tenant, channelKind: string): void {
    if (!tenant.channels_enabled.includes(channelKind as never)) {
      throw new Error(
        `Channel '${channelKind}' is not enabled for tenant '${tenant.slug}'. ` +
        `Enabled: ${tenant.channels_enabled.join(', ')}`
      );
    }
  }

  private async checkIdempotency(key?: string): Promise<void> {
    if (!key) return;

    const { data } = await this.supabase
      .from('sup_requests')
      .select('id, case_number')
      .eq('idempotency_key', key)
      .limit(1);

    if (data && data.length > 0) {
      throw new Error(`Duplicate submission: idempotency_key '${key}' already used for case ${data[0].case_number}`);
    }
  }

  private async resolveOrCreateContact(
    tenantId: number,
    requester: CreateCaseDTO['requester']
  ): Promise<Contact> {
    const { data: existing } = await this.supabase
      .from('sup_contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email', requester.email)
      .single();

    if (existing) {
      if (requester.external_id && existing.external_id !== requester.external_id) {
        await this.supabase
          .from('sup_contacts')
          .update({ external_id: requester.external_id })
          .eq('id', existing.id);
      }
      return existing as unknown as Contact;
    }

    const { data: created, error } = await this.supabase
      .from('sup_contacts')
      .insert({
        tenant_id: tenantId,
        email: requester.email,
        name: requester.name || null,
        role: 'user',
        external_id: requester.external_id || null,
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error(`Failed to create contact: ${error?.message ?? 'unknown error'}`);
    }

    return created as unknown as Contact;
  }

  private async saveContext(
    caseId: number,
    tenantId: number,
    context: NonNullable<CreateCaseDTO['context']>
  ): Promise<void> {
    await this.supabase.from('sup_case_context').upsert({
      case_id: caseId,
      tenant_id: tenantId,
      app: context.app || null,
      app_version: context.app_version || null,
      environment: context.environment || null,
      route: context.route || null,
      browser: context.browser || null,
      os: context.os || null,
      locale: context.locale || null,
      timezone: null,
      entity_refs: context.entity_refs || null,
      recent_errors: context.recent_errors || null,
    });
  }

  private async fireNotifications(
    result: CreateCaseResult,
    tenant: Tenant,
    contact: Contact
  ): Promise<void> {
    try {
      await notifyRequestCreated(
        {
          id: result.case.id,
          request_no: result.case_number,
          subject: result.case.subject,
          category: result.case.category,
          priority: result.case.priority,
          tenant_id: tenant.id,
          created_by: result.case.created_by,
        },
        contact.email
      );
    } catch {
      // non-blocking
    }
  }
}
