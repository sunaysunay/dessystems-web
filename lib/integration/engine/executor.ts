// DIE synchronous flow executor — Phase 8: data-driven int_mappings at runtime.
import { getServerClient } from '@/lib/supabase-server';
import { rdwLookup } from '@/lib/integration/connectors/rdw';
import { marktplaatsPublish, marktplaatsUpdate, marktplaatsDelete } from '@/lib/integration/connectors/marktplaats';
import { as24Publish, as24Update, as24Delete } from '@/lib/integration/connectors/autoscout24';

export interface RunOptions {
  flowKey:     string;
  payload:     Record<string, unknown>;
  trigger:     'manual' | 'api' | 'queue';
  triggeredBy?: string;
  messageId?:  string;
}

export interface RunResult {
  status:   'ok' | 'error';
  result:   unknown;
  runId:    string;
  ms:       number;
  errorMsg?: string;
}

// ── Phase 8: runtime mapping engine ──────────────────────────────────────────

interface Mapping {
  source_field:   string;
  target_field:   string;
  transform:      string;
  transform_expr: string | null;
  default_val:    string | null;
  required:       boolean;
  sort_order:     number;
  lookup_table_id?: string | null;
}

interface LookupValue {
  source_code: string;
  target_code: string;
}

/**
 * Applies int_mappings rules to a raw connector result, producing a mapped output object.
 * Falls back to the original result if no mappings are defined for the flow.
 */
async function applyMappings(
  flowId: string,
  raw: Record<string, unknown>,
  sb: ReturnType<typeof getServerClient>
): Promise<Record<string, unknown>> {
  const { data: mappings } = await sb
    .from('int_mappings')
    .select('source_field, target_field, transform, transform_expr, default_val, required, sort_order, lookup_table_id')
    .eq('flow_id', flowId)
    .order('sort_order', { ascending: true });

  if (!mappings || mappings.length === 0) return raw; // no mappings defined → pass through

  const output: Record<string, unknown> = {};

  for (const m of mappings as Mapping[]) {
    const sourceVal = raw[m.source_field];

    if (sourceVal === null && m.default_val !== null) {
      output[m.target_field] = m.default_val;
      continue;
    }
    if (sourceVal === null) {
      if (m.required) throw new Error(`Required mapping field missing: ${m.source_field}`);
      continue;
    }

    let mapped: unknown = sourceVal;

    switch (m.transform) {
      case 'direct':
        mapped = sourceVal;
        break;

      case 'lookup': {
        if (!m.lookup_table_id) { mapped = sourceVal; break; }
        const { data: lv } = await sb
          .from('int_lookup_values')
          .select('target_code')
          .eq('lookup_table_id', m.lookup_table_id)
          .eq('source_code', String(sourceVal))
          .eq('active', true)
          .maybeSingle();
        mapped = (lv as LookupValue | null)?.target_code ?? (m.default_val ?? sourceVal);
        break;
      }

      case 'concat': {
        const fields = (m.transform_expr ?? '').split(',').map(f => f.trim());
        mapped = fields.map(f => raw[f] ?? '').join(' ').trim();
        break;
      }

      case 'slice': {
        const [start, end] = (m.transform_expr ?? ':').split(':').map(Number);
        mapped = String(sourceVal).slice(start || 0, end || undefined);
        break;
      }

      case 'regex': {
        if (m.transform_expr) {
          const match = String(sourceVal).match(new RegExp(m.transform_expr));
          mapped = match ? (match[1] ?? match[0]) : (m.default_val ?? null);
        }
        break;
      }

      case 'js_expr': {
        // Safe eval with value + record in scope. Only use for trusted admin-seeded expressions.
        try {
           
          mapped = new Function('value', 'record', `return (${m.transform_expr})`)(sourceVal, raw);
        } catch {
          mapped = m.default_val ?? sourceVal;
        }
        break;
      }

      default:
        mapped = sourceVal;
    }

    output[m.target_field] = mapped;
  }

  // Merge unmapped fields from raw so callers still see everything
  return { ...raw, ...output };
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeFlow(opts: RunOptions): Promise<RunResult> {
  const sb = getServerClient();
  const t0 = Date.now();

  const { data: flow } = await sb
    .from('int_flows')
    .select('*, int_systems(*)')
    .eq('flow_key', opts.flowKey)
    .eq('active', true)
    .maybeSingle();

  if (!flow) {
    return { status: 'error', result: null, runId: '', ms: 0, errorMsg: `Flow not found or inactive: ${opts.flowKey}` };
  }

  const sys = (flow as any).int_systems;
  let result: unknown = null;
  let status: 'ok' | 'error' = 'ok';
  let errorMsg: string | undefined;

  try {
    const raw = await dispatch(opts.flowKey, sys, opts.payload, sb);

    // Phase 8: apply int_mappings if any are seeded for this flow
    result = await applyMappings(flow.id, raw as Record<string, unknown>, sb);
  } catch (e: any) {
    status   = 'error';
    errorMsg = e?.message ?? String(e);
  }

  const ms = Date.now() - t0;

  const entityId   = (opts.payload.entity_id as string) ?? (opts.payload.plate as string) ?? (opts.payload.listing_id as string) ?? null;
  const externalId = (result as any)?.plate ?? (result as any)?.listingId ?? null;

  const { data: runRow } = await sb.from('int_runs').insert({
    message_id:       opts.messageId ?? null,
    flow_id:          flow.id,
    system_id:        sys?.id ?? null,
    entity_type:      (opts.payload.entity_type as string) ?? null,
    entity_id:        entityId,
    external_id:      externalId,
    status,
    trigger:          opts.trigger,
    triggered_by:     opts.triggeredBy ?? null,
    request_payload:  opts.payload,
    response_payload: result as any,
    error_message:    errorMsg ?? null,
    response_ms:      ms,
  }).select('id').single();

  if (status === 'ok' && opts.payload.listing_id) {
    const channel = flowKeyToChannel(opts.flowKey);
    if (channel) {
      await sb.from('bop_listing_channels').upsert({
        listing_id:   opts.payload.listing_id as string,
        channel,
        status:       opts.flowKey.endsWith('.delete') ? 'removed' : 'active',
        external_url: (result as any)?.url ?? null,
      }, { onConflict: 'listing_id,channel' });
    }
  }

  return { status, result, runId: runRow?.id ?? '', ms, errorMsg };
}

function flowKeyToChannel(flowKey: string): string | null {
  if (flowKey.startsWith('marktplaats.')) return 'marktplaats';
  if (flowKey.startsWith('autoscout24.')) return 'autoscout24';
  return null;
}

async function dispatch(flowKey: string, sys: any, payload: Record<string, unknown>, _sb: any): Promise<unknown> {
  if (flowKey === 'rdw.lookup') {
    const plate = (payload.plate ?? payload.entity_id) as string;
    if (!plate) throw new Error('payload.plate is required for rdw.lookup');
    const result = await rdwLookup(plate, sys?.config?.app_token as string | undefined);
    if (!result) throw new Error(`No RDW record found for plate: ${plate}`);
    return result;
  }

  if (flowKey === 'marktplaats.publish') return marktplaatsPublish(payload as any, sys);
  if (flowKey === 'marktplaats.update')  return marktplaatsUpdate(payload.external_id as string, payload as any, sys);
  if (flowKey === 'marktplaats.delete')  return marktplaatsDelete(payload.external_id as string, sys);

  if (flowKey === 'autoscout24.publish') return as24Publish(payload as any, sys);
  if (flowKey === 'autoscout24.update')  return as24Update(payload.external_id as string, payload as any, sys);
  if (flowKey === 'autoscout24.delete')  return as24Delete(payload.external_id as string, sys);

  throw new Error(`No connector implementation for flow: ${flowKey}`);
}
