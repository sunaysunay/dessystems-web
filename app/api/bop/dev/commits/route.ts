import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const branch = searchParams.get('branch');
  const limit = parseInt(searchParams.get('limit') || '100');

  let query = supabase
    .from('dev_commits')
    .select(`
      *,
      dev_enhancements (
        id,
        code,
        title
      )
    `)
    .order('committed_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (branch) query = query.ilike('branch', `%${branch}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ commits: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('dev_commits')
    .insert({
      hash: body.hash,
      repo: body.repo,
      branch: body.branch,
      author: body.author,
      message: body.message,
      enhancement_id: body.enhancement_id ?? null,
      files_changed: body.files_changed ?? null,
      has_migration: body.has_migration ?? false,
      risk_score: body.risk_score ?? 0,
      committed_at: body.committed_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ commit: data }, { status: 201 });
}
