import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

interface Deliverable {
  id: string;
  task_id: string;
  kind: string;
  ref: string;
  verify_mode: string;
  is_verified: boolean;
}

interface VerifyResult {
  id: string;
  is_verified: boolean;
  verify_evidence: Record<string, unknown> | null;
  verify_error: string | null;
}

async function verifyScreen(ref: string, supabase: ReturnType<typeof getServerClient>): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const screenId = ref.replace(/ .*/,'').trim();
  const { data } = await supabase
    .from('bop_screens')
    .select('screen_id,title,route,status')
    .eq('screen_id', screenId)
    .maybeSingle();
  return { ok: !!data, evidence: { screen: data ?? null } };
}

async function verifyMenuNode(ref: string, supabase: ReturnType<typeof getServerClient>): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const screenId = ref.replace(/shell nav node for /i, '').trim();
  const { data } = await supabase
    .from('bop_screens')
    .select('screen_id,nav_group,nav_subgroup,nav_order,nav_visible')
    .eq('screen_id', screenId)
    .maybeSingle();
  const ok = !!data?.nav_visible;
  return { ok, evidence: { nav: data ?? null } };
}

async function verifyDbTable(ref: string, supabase: ReturnType<typeof getServerClient>): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const tableName = ref.replace(/ in .*/,'').trim();
  const { data } = await supabase
    .from('information_schema.tables' as any)
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .maybeSingle();
  if (data) return { ok: true, evidence: { table: tableName } };
  const { data: objData } = await supabase
    .from('bop_objects')
    .select('object_id')
    .eq('object_id', `table:${tableName}`)
    .maybeSingle();
  return { ok: !!objData, evidence: { bop_objects: !!objData, table: tableName } };
}

async function verifyApiRoute(ref: string): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const path = ref.startsWith('/') ? ref : `/${ref}`;
  try {
    const res = await fetch(`http://localhost:4401${path}`, {
      method: 'GET',
      headers: { 'x-verify-probe': '1' },
    });
    return { ok: res.status !== 404, evidence: { path, status: res.status } };
  } catch {
    return { ok: false, evidence: { path, error: 'fetch failed' } };
  }
}

async function verifyPermission(ref: string, supabase: ReturnType<typeof getServerClient>): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const { data } = await supabase
    .from('bop_screen_roles')
    .select('screen_id,role')
    .limit(1);
  return { ok: (data?.length ?? 0) > 0, evidence: { ref, hasRoles: (data?.length ?? 0) > 0 } };
}

async function verifyI18nKey(ref: string): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const fs = await import('fs').then(m => m.promises);
  try {
    const en = JSON.parse(await fs.readFile('/opt/dessystems-console-dev/messages/en.json', 'utf8'));
    const keyParts = ref.split('.').filter(p => !p.includes('×') && !p.includes('*') && p.trim());
    if (keyParts.length >= 2) {
      const val = keyParts.reduce((o: any, k: string) => o?.[k], en);
      return { ok: val !== undefined, evidence: { key: keyParts.join('.'), found: val !== undefined } };
    }
    return { ok: false, evidence: { ref, note: 'could not parse key' } };
  } catch {
    return { ok: false, evidence: { error: 'cannot read translation file' } };
  }
}

async function verifyHelpDoc(ref: string, supabase: ReturnType<typeof getServerClient>): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const screenId = ref.replace(/bop_documentation for /i, '').trim();
  const { data } = await supabase
    .from('bop_documentation')
    .select('doc_id,target_id')
    .eq('target_id', screenId)
    .limit(1);
  return { ok: (data?.length ?? 0) > 0, evidence: { target_id: screenId, count: data?.length ?? 0 } };
}

async function verifyOne(d: Deliverable, supabase: ReturnType<typeof getServerClient>): Promise<VerifyResult> {
  if (d.verify_mode === 'manual') {
    return { id: d.id, is_verified: d.is_verified, verify_evidence: null, verify_error: null };
  }

  try {
    let result: { ok: boolean; evidence: Record<string, unknown> };
    switch (d.kind) {
      case 'SCREEN':         result = await verifyScreen(d.ref, supabase); break;
      case 'MENU_NODE':      result = await verifyMenuNode(d.ref, supabase); break;
      case 'DB_TABLE':       result = await verifyDbTable(d.ref, supabase); break;
      case 'API_ROUTE':      result = await verifyApiRoute(d.ref); break;
      case 'PERMISSION':     result = await verifyPermission(d.ref, supabase); break;
      case 'I18N_KEY':       result = await verifyI18nKey(d.ref); break;
      case 'HELP_DOC':       result = await verifyHelpDoc(d.ref, supabase); break;
      default:               result = { ok: false, evidence: { note: `auto-verify not implemented for kind=${d.kind}` } };
    }
    return { id: d.id, is_verified: result.ok, verify_evidence: result.evidence, verify_error: null };
  } catch (e: any) {
    return { id: d.id, is_verified: false, verify_evidence: null, verify_error: e.message };
  }
}

export async function POST(req: NextRequest) {
  noStore();
  const supabase = getServerClient();
  const body = await req.json();
  const { task_id, deliverable_id } = body;

  let query = supabase.from('sy_deliverables').select('*');
  if (deliverable_id) {
    query = query.eq('id', deliverable_id);
  } else if (task_id) {
    query = query.eq('task_id', task_id);
  } else {
    return NextResponse.json({ error: 'task_id or deliverable_id required' }, { status: 400 });
  }

  const { data: deliverables, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!deliverables?.length) return NextResponse.json({ results: [], verified: 0, total: 0 });

  const results: VerifyResult[] = [];
  for (const d of deliverables) {
    const r = await verifyOne(d as Deliverable, supabase);
    results.push(r);

    if (r.is_verified !== d.is_verified || r.verify_evidence || r.verify_error) {
      await supabase
        .from('sy_deliverables')
        .update({
          is_verified: r.is_verified,
          verified_at: r.is_verified ? new Date().toISOString() : null,
          verified_by: 'auto-verifier',
          updated_at: new Date().toISOString(),
          verify_evidence: r.verify_evidence,
          verify_error: r.verify_error,
        })
        .eq('id', r.id);
    }
  }

  const verified = results.filter(r => r.is_verified).length;
  return NextResponse.json({ results, verified, total: results.length });
}
