// CI-T36 — Dedup, grouping, expiry
// Same rule+entity → update last_seen. >5 entities → grouped item.
// Auto-expire open items after 14 days.

import type { AttentionCandidate } from './rule-engine';

const MAX_UNGROUPED = 5;
const EXPIRY_DAYS = 14;

export function groupKey(c: AttentionCandidate): string {
  return `${c.rule_id}:${c.entity_type ?? '_'}:${c.entity_id ?? '_'}`;
}

export function groupCandidates(candidates: AttentionCandidate[]): AttentionCandidate[] {
  const byRule = new Map<string, AttentionCandidate[]>();
  for (const c of candidates) {
    const arr = byRule.get(c.rule_id) ?? [];
    arr.push(c);
    byRule.set(c.rule_id, arr);
  }

  const result: AttentionCandidate[] = [];
  for (const [ruleId, items] of byRule) {
    if (items.length <= MAX_UNGROUPED) {
      result.push(...items);
    } else {
      result.push({
        rule_id: ruleId,
        severity: items[0].severity,
        entity_type: items[0].entity_type,
        entity_id: null,
        title: `${items.length} ${ruleId.replace(/_/g, ' ')} alerts`,
        detail: { count: items.length, sample_ids: items.slice(0, 5).map(i => i.entity_id) },
        evidence: {},
      });
    }
  }
  return result;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  expired: number;
}

export async function upsertAttentionItems(
  supabase: { from: (t: string) => any },
  tenantId: number,
  candidates: AttentionCandidate[],
  now: Date,
): Promise<UpsertResult> {
  const grouped = groupCandidates(candidates);
  let inserted = 0;
  let updated = 0;

  for (const c of grouped) {
    const key = groupKey(c);
    const expiresAt = new Date(now.getTime() + EXPIRY_DAYS * 86400000).toISOString();

    const { data: existing } = await supabase.from('ci_attention_item')
      .select('id, group_count')
      .eq('tenant_id', tenantId)
      .eq('group_key', key)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      await supabase.from('ci_attention_item')
        .update({
          last_seen: now.toISOString(),
          group_count: (existing.group_count ?? 1) + 1,
          title: c.title,
          detail: c.detail,
          evidence: c.evidence,
          expires_at: expiresAt,
        })
        .eq('id', existing.id);
      updated++;
    } else {
      await supabase.from('ci_attention_item')
        .insert({
          tenant_id: tenantId,
          rule_id: c.rule_id,
          severity: c.severity,
          entity_type: c.entity_type,
          entity_id: c.entity_id,
          group_key: key,
          group_count: 1,
          title: c.title,
          detail: c.detail,
          evidence: c.evidence,
          status: 'open',
          first_seen: now.toISOString(),
          last_seen: now.toISOString(),
          expires_at: expiresAt,
        });
      inserted++;
    }
  }

  const { count: expired } = await supabase.from('ci_attention_item')
    .update({ status: 'expired' })
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
    .lt('expires_at', now.toISOString())
    .select('id', { count: 'exact', head: true });

  return { inserted, updated, expired: expired ?? 0 };
}
