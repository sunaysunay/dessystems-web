import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Full taxonomy tree for IN003: main categories (bop_listing_categories) with
// their subcategories (bop_body_types), labels from the separate i18n tables,
// plus live listing counts per category / body type.
export async function GET() {
  const supabase = getServerClient();

  const [cats, catLabels, subs, subLabels, listings] = await Promise.all([
    supabase.from('bop_listing_categories').select('code, slug, sort, active').order('sort', { ascending: true }),
    supabase.from('bop_listing_category_labels').select('code, locale, label'),
    supabase.from('bop_body_types').select('code, main_code, category, slug, sort, active').order('sort', { ascending: true }),
    supabase.from('bop_body_type_labels').select('code, locale, label'),
    supabase.from('bop_listings').select('category, body_type_code'),
  ]);
  const err = cats.error ?? catLabels.error ?? subs.error ?? subLabels.error ?? listings.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const catCount: Record<string, number> = {};
  const subCount: Record<number, number> = {};
  for (const l of listings.data ?? []) {
    const cat = (l.category ?? '').trim();
    if (cat) catCount[cat] = (catCount[cat] ?? 0) + 1;
    if (l.body_type_code) subCount[l.body_type_code] = (subCount[l.body_type_code] ?? 0) + 1;
  }

  const labelsFor = (rows: any[], code: number) => Object.fromEntries(rows.filter(r => r.code === code).map(r => [r.locale, r.label]));

  const tree = (cats.data ?? []).map(c => ({
    ...c,
    labels: labelsFor(catLabels.data ?? [], c.code),
    listings: catCount[c.slug] ?? 0,
    subs: (subs.data ?? []).filter(s => s.main_code === c.code).map(s => ({
      ...s,
      labels: labelsFor(subLabels.data ?? [], s.code),
      listings: subCount[s.code] ?? 0,
    })),
  }));

  return NextResponse.json({ categories: tree });
}
