import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/mkp/brands/[id]/models — list models for a brand
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase.from('bop_models')
    .select('id, name, generation, year_from, year_to')
    .eq('brand_id', id).order('sort', { ascending: true }).order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ models: data ?? [] });
}

// POST { name, generation?, year_from?, year_to? } — add a model to this brand
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const { data, error } = await supabase.from('bop_models').insert({
    brand_id: Number(id), name: String(b.name).trim(),
    generation: b.generation || null, year_from: b.year_from || null, year_to: b.year_to || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
