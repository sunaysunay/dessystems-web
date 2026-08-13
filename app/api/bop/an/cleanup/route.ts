import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

type DeleteParam = { ipv4?: string | null; ipv6?: string | null; city?: string | null };

export async function DELETE(_req: NextRequest) {
  const sb = getServerClient();

  const { data: dbParams } = await sb.from('activity_log2_delete_parameters').select('ipv4, ipv6, city');
  const params: DeleteParam[] = dbParams ?? [];

  const hdrs = await headers();
  const rawIp = (
    hdrs.get('cf-connecting-ip') ||
    hdrs.get('x-real-ip') ||
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  )?.replace(/^::ffff:/i, '') || '';

  const logFilters: string[] = [
    'ip_address.eq.204.168.163.146',
    'ip_address.eq.::1',
    'ip_address.ilike.%127.%',
    'user_agent.ilike.%curl%',
    'user_agent.ilike.%python-requests%',
    'user_agent.ilike.%wget%',
    'user_agent.ilike.%bot%',
    'page.ilike.%/admin%',
    'page.ilike.%/console%',
  ];

  const sessFilters: string[] = [
    'user_agent.ilike.%curl%',
    'user_agent.ilike.%python-requests%',
    'user_agent.ilike.%wget%',
    'user_agent.ilike.%bot%',
    'referrer.ilike.%204.168.163.146%',
    'referrer.ilike.%localhost%',
    'entry_page.ilike.%/admin%',
    'entry_page.ilike.%/console%',
    'session_id.eq.qa-hardening-test',
  ];

  for (const p of params) {
    if (p.ipv4?.trim()) {
      const ip = p.ipv4.trim();
      logFilters.push('ip_address.eq.' + ip);
      sessFilters.push('referrer.ilike.%' + ip + '%');
    }
    if (p.ipv6?.trim()) {
      const ip = p.ipv6.trim();
      logFilters.push('ip_address.eq.' + ip);
    }
    if (p.city?.trim()) {
      const city = p.city.trim();
      logFilters.push('city.ilike.%' + city + '%');
      sessFilters.push('city.ilike.%' + city + '%');
    }
  }

  if (rawIp) {
    logFilters.push('ip_address.eq.' + rawIp);
    sessFilters.push('referrer.ilike.%' + rawIp + '%');
  }

  const { data: matchedLogs } = await sb
    .from('dm_activity_log')
    .select('session_id')
    .or(logFilters.join(','));
  const matchedSessionIds = [...new Set(
    (matchedLogs ?? []).map((r: any) => r.session_id).filter(Boolean)
  )];

  const { count: logCount, error: logErr } = await sb
    .from('dm_activity_log')
    .delete({ count: 'exact' })
    .or(logFilters.join(','));
  if (logErr) return NextResponse.json({ ok: false, error: 'dm_activity_log: ' + logErr.message }, { status: 500 });

  const { count: sessCount1, error: sessErr1 } = await sb
    .from('dm_activity_sessions')
    .delete({ count: 'exact' })
    .or(sessFilters.join(','));
  if (sessErr1) return NextResponse.json({ ok: false, error: 'dm_activity_sessions: ' + sessErr1.message }, { status: 500 });

  let sessCount2 = 0;
  if (matchedSessionIds.length > 0) {
    const CHUNK = 100;
    for (let i = 0; i < matchedSessionIds.length; i += CHUNK) {
      const chunk = matchedSessionIds.slice(i, i + CHUNK);
      const { count, error } = await sb
        .from('dm_activity_sessions')
        .delete({ count: 'exact' })
        .in('session_id', chunk);
      if (error) return NextResponse.json({ ok: false, error: 'dm_activity_sessions chunk: ' + error.message }, { status: 500 });
      sessCount2 += count ?? 0;
    }
  }

  return NextResponse.json({
    ok: true,
    deleted: (logCount ?? 0) + (sessCount1 ?? 0) + sessCount2,
    detail: {
      dm_activity_log: logCount ?? 0,
      dm_activity_sessions: (sessCount1 ?? 0) + sessCount2,
    },
    caller_ip: rawIp || null,
  });
}
