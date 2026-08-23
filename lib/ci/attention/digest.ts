// CI-T38 — Telegram digest at 07:30 CET. No message on quiet night.

import { sendTelegram } from '@/lib/shop/notify';

const SEV_EMOJI: Record<string, string> = {
  critical: '🔴', high: '🟠', medium: '🟡', opportunity: '🟢',
};

interface DigestItem {
  rule_id: string;
  severity: string;
  title: string;
  group_count?: number;
}

export function formatDigest(items: DigestItem[]): string | null {
  if (items.length === 0) return null;

  const critCount = items.filter(i => i.severity === 'critical').length;
  const highCount = items.filter(i => i.severity === 'high').length;
  const medCount = items.filter(i => i.severity === 'medium').length;
  const oppCount = items.filter(i => i.severity === 'opportunity').length;

  const summary = [
    critCount ? `${critCount} critical` : '',
    highCount ? `${highCount} high` : '',
    medCount ? `${medCount} medium` : '',
    oppCount ? `${oppCount} opportunity` : '',
  ].filter(Boolean).join(', ');

  const lines = [
    `📋 <b>DESShop Morning Digest</b>`,
    `${summary}`,
    '',
  ];

  for (const item of items.slice(0, 10)) {
    const emoji = SEV_EMOJI[item.severity] ?? '⚪';
    const count = (item.group_count ?? 1) > 1 ? ` (×${item.group_count})` : '';
    lines.push(`${emoji} ${item.title}${count}`);
  }

  if (items.length > 10) {
    lines.push(`… and ${items.length - 10} more`);
  }

  lines.push('', '🔗 https://bop-dev.dessystems.io/console/shp/analytics/attention');
  return lines.join('\n');
}

export async function sendMorningDigest(
  supabase: { from: (t: string) => any },
  tenantId: number,
): Promise<boolean> {
  const { data: items } = await supabase.from('ci_attention_item')
    .select('rule_id, severity, title, group_count')
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
    .order('severity', { ascending: true })
    .limit(50);

  const message = formatDigest(items ?? []);
  if (!message) return false;

  await sendTelegram(message);
  return true;
}
