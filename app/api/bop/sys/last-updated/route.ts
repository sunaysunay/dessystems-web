import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

// Returns the most recent updated_at across all core BOP objects
export async function GET() {
  const supabase = getServerClient();

  const [screens, settings, prefs, roles, modules] = await Promise.all([
    supabase.from('bop_screens').select('updated_at, screen_id, title').order('updated_at', { ascending: false }).limit(1),
    supabase.from('bop_settings').select('updated_at, key').order('updated_at', { ascending: false }).limit(1),
    supabase.from('bop_user_prefs').select('updated_at, key').order('updated_at', { ascending: false }).limit(1),
    supabase.from('bop_roles').select('updated_at, name').order('updated_at', { ascending: false }).limit(1),
    supabase.from('bop_modules').select('updated_at, name').order('updated_at', { ascending: false }).limit(1),
  ]);

  const candidates: { ts: string; label: string }[] = [];

  if (screens.data?.[0]?.updated_at)
    candidates.push({ ts: screens.data[0].updated_at, label: `Screen: ${screens.data[0].title}` });
  if (settings.data?.[0]?.updated_at)
    candidates.push({ ts: settings.data[0].updated_at, label: `Setting: ${settings.data[0].key}` });
  if (prefs.data?.[0]?.updated_at)
    candidates.push({ ts: prefs.data[0].updated_at, label: `User Pref: ${prefs.data[0].key}` });
  if (roles.data?.[0]?.updated_at)
    candidates.push({ ts: roles.data[0].updated_at, label: `Role: ${roles.data[0].name}` });
  if (modules.data?.[0]?.updated_at)
    candidates.push({ ts: modules.data[0].updated_at, label: `Module: ${modules.data[0].name}` });

  if (!candidates.length) return NextResponse.json({ ts: null, label: null });

  candidates.sort((a, b) => b.ts.localeCompare(a.ts));
  return NextResponse.json(candidates[0]);
}
