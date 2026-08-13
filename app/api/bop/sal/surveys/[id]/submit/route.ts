import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { nps_score, rating, feedback, would_recommend } = await req.json();
  if (nps_score == null || rating == null) return NextResponse.json({ error: 'nps_score and rating required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_submit_survey', {
    p_survey_id: id,
    p_nps_score: nps_score,
    p_rating: rating,
    p_feedback: feedback ?? null,
    p_would_recommend: would_recommend ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
