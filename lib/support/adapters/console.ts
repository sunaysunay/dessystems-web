import { type ChannelAdapter } from './types';
import { type CreateCaseDTO } from '../types';

interface ConsoleInput {
  tenant_slug: string;
  subject: string;
  description: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  requester_email: string;
  requester_name?: string;
  agent_id: string;
  correlation_id?: string;
}

export class ConsoleAdapter implements ChannelAdapter {
  readonly kind = 'console' as const;

  async parse(input: unknown): Promise<CreateCaseDTO> {
    const data = input as ConsoleInput;

    if (!data.tenant_slug) throw new Error('tenant_slug is required');
    if (!data.subject?.trim()) throw new Error('subject is required');
    if (!data.description?.trim()) throw new Error('description is required');
    if (!data.requester_email) throw new Error('requester_email is required');

    return {
      tenant_slug: data.tenant_slug,
      channel_kind: 'console',
      subject: data.subject.trim(),
      description: data.description.trim(),
      category: data.category || 'other',
      priority: data.priority || 'normal',
      requester: {
        email: data.requester_email,
        name: data.requester_name,
      },
      correlation_id: data.correlation_id,
    };
  }
}
