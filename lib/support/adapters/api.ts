import { type ChannelAdapter } from './types';
import { type CreateCaseDTO, type CasePriority } from '../types';

interface ApiRequestBody {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
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
    data: string;
  }[];
  correlation_id?: string;
  idempotency_key?: string;
}

const VALID_CATEGORIES = ['access_problem', 'bug', 'question', 'feature_request', 'other'];
const VALID_PRIORITIES: CasePriority[] = ['low', 'normal', 'high', 'critical'];

export class ApiAdapter implements ChannelAdapter {
  readonly kind = 'api' as const;

  async parse(input: unknown): Promise<CreateCaseDTO> {
    const { body, tenantSlug } = input as { body: ApiRequestBody; tenantSlug: string };

    if (!body.subject?.trim()) throw new Error('subject is required');
    if (!body.description?.trim()) throw new Error('description is required');
    if (!body.requester?.email) throw new Error('requester.email is required');

    const category = body.category || 'other';
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}. Valid: ${VALID_CATEGORIES.join(', ')}`);
    }

    const priority = (body.priority || 'normal') as CasePriority;
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new Error(`Invalid priority: ${priority}. Valid: ${VALID_PRIORITIES.join(', ')}`);
    }

    return {
      tenant_slug: tenantSlug,
      channel_kind: 'api',
      subject: body.subject.trim(),
      description: body.description.trim(),
      category,
      priority,
      requester: {
        email: body.requester.email,
        name: body.requester.name,
        external_id: body.requester.external_id,
      },
      context: body.context,
      attachments: body.attachments?.map(a => ({
        filename: a.filename,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        data: a.data,
      })),
      correlation_id: body.correlation_id,
      idempotency_key: body.idempotency_key,
    };
  }
}
