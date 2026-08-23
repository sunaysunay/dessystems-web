// CI-T34 — Rule engine + statistical guards (spec §8)
//
// Each rule implements RuleDefinition. The engine runs all rules,
// applies statistical guards (minimum n, σ thresholds), and returns
// candidate attention items. Dedup/grouping happens downstream.

export type Severity = 'critical' | 'high' | 'medium' | 'opportunity';

export interface AttentionCandidate {
  rule_id: string;
  severity: Severity;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  detail: Record<string, unknown>;
  evidence: Record<string, unknown>;
}

export interface RuleContext {
  tenantId: number;
  today: string;
  supabase: { from: (t: string) => any };
}

export interface RuleDefinition {
  id: string;
  severity: Severity;
  run: (ctx: RuleContext) => Promise<AttentionCandidate[]>;
}

// ── Statistical helpers ──

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function zScore(value: number, m: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

export function twoProportionZTest(p1: number, n1: number, p2: number, n2: number): { z: number; pValue: number } {
  const p = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: 0, pValue: 1 };
  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, pValue };
}

function normalCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ── Rule registry ──

const registry: RuleDefinition[] = [];

export function registerRule(rule: RuleDefinition) {
  registry.push(rule);
}

export function getRegisteredRules(): RuleDefinition[] {
  return [...registry];
}

export async function runRules(ctx: RuleContext): Promise<AttentionCandidate[]> {
  const results: AttentionCandidate[] = [];
  for (const rule of registry) {
    try {
      const candidates = await rule.run(ctx);
      results.push(...candidates);
    } catch (err) {
      console.error(`Rule ${rule.id} failed:`, err);
    }
  }
  return results;
}
