import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function computeRisk(branch: string, files: string[], hasMigration: boolean): number {
  let score = 0;
  if (hasMigration) score += 2;
  if (files.length > 10) score += 1;
  if (branch.includes('hotfix')) score += 2;
  else if (branch.includes('fix')) score += 1;
  return Math.min(score, 5);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bop-webhook-secret');
  if (secret !== (process.env.BOP_WEBHOOK_SECRET ?? 'des-bop-webhook-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getServerClient();
  const body = await req.json();
  const { hash, repo, branch, author, message, files_changed, has_migration, committed_at } = body;

  const files: string[] = Array.isArray(files_changed) ? files_changed : [];
  const hasMigration = has_migration === true || files.some((f: string) => f.endsWith('.sql'));
  const risk_score = computeRisk(branch ?? '', files, hasMigration);

  const { data, error } = await sb.from('dev_commits').insert({
    hash, repo, branch, author, message,
    files_changed: files, has_migration: hasMigration,
    risk_score, status: 'committed',
    committed_at: committed_at ?? new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id, risk_score });
}
