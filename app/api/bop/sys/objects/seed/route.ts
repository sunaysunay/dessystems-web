import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { ALL_OBJECTS, ALL_DEPENDENCIES } from '@/lib/bop/manifests';
import type { BopObject } from '@/lib/bop/types/objects';

// POST /api/bop/sys/objects/seed
// Seeds bop_objects and bop_dependencies from three sources:
//   1. Static manifest (ALL_OBJECTS)
//   2. Live bop_screens table — authoritative TC registry; any new screen auto-registers
//   3. Live bop_settings table — every config key registers as setting:{key}
// Idempotent — safe to re-run anytime.

function moduleFromKey(key: string): string {
  if (key.startsWith('ai_')) return 'AIM';
  if (key.startsWith('imap_')) return 'SYS';
  if (key.startsWith('gdrive_')) return 'SYS';
  return 'SYS';
}

const MODULE_FROM_BOP: Record<string, string> = {
  AIM:'AIM', ANL:'ANL', AST:'AST', AUC:'AUC', BOP:'BOP',
  COM:'COM', CRM:'CRM', FIN:'FIN', INV:'INV', LOG:'LOG',
  MDM:'MDM', MKP:'MKP', MKT:'MKT', OPS:'OPS', PRT:'PRT',
  PUB:'PUB', SAL:'SAL', SYS:'SYS', WFL:'WFL', WRK:'WRK',
};

export async function POST() {
  const supabase = getServerClient();
  const now = new Date().toISOString();
  const report = { manifest: 0, screens_synced: 0, settings_synced: 0, dependencies: 0, errors: [] as string[] };

  // ── 1. Seed static manifest ──────────────────────────────────────────────
  const objBatches: BopObject[][] = [];
  for (let i = 0; i < ALL_OBJECTS.length; i += 100) objBatches.push(ALL_OBJECTS.slice(i, i + 100));

  // Fetch locked object IDs — DML trigger blocks writes on protection_lvl=0, skip them in upsert
  const { data: lockedRows } = await supabase
    .from('bop_objects')
    .select('object_id')
    .eq('protection_lvl', 0);
  const lockedIds = new Set((lockedRows ?? []).map((r: any) => r.object_id));

  for (const batch of objBatches) {
    const insertable = batch.filter(o => !lockedIds.has(o.object_id));
    if (insertable.length === 0) { report.manifest += batch.length; continue; }
    const { error } = await supabase
      .from('bop_objects')
      .upsert(insertable.map(o => ({ ...o, updated_at: now })), { onConflict: 'object_id' });
    if (error) { report.errors.push('manifest: ' + error.message); break; }
    report.manifest += batch.length;
  }

  // ── 2. Auto-sync from bop_screens ────────────────────────────────────────
  // Any screen in bop_screens that isn't in bop_objects gets registered.
  const { data: screens, error: screensErr } = await supabase
    .from('bop_screens')
    .select('screen_id,title,module,route,status,description');

  if (screensErr) {
    report.errors.push('screens fetch: ' + screensErr.message);
  } else if (screens) {
    const screenObjs: BopObject[] = screens.map(s => ({
      object_id: `screen:${s.screen_id}`,
      type: 'screen' as const,
      module: MODULE_FROM_BOP[s.module] ?? s.module,
      name: s.title ?? s.screen_id,
      route: s.route ?? undefined,
      status: (s.status === 'active' ? 'active' : s.status === 'stub' ? 'stub' : 'planned') as any,
      description: s.description ?? undefined,
      updated_at: now,
    }));

    for (let i = 0; i < screenObjs.length; i += 100) {
      const batch = screenObjs.slice(i, i + 100).filter(o => !lockedIds.has(o.object_id));
      if (batch.length === 0) { report.screens_synced += 100; continue; }
      const { error } = await supabase
        .from('bop_objects')
        .upsert(batch, { onConflict: 'object_id' });
      if (error) { report.errors.push('screens sync: ' + error.message); break; }
      report.screens_synced += batch.length;
    }
  }

  // ── 3. Backfill existing bop_settings ────────────────────────────────────
  const { data: settings, error: settingsErr } = await supabase
    .from('bop_settings')
    .select('key,value');

  if (settingsErr) {
    report.errors.push('settings fetch: ' + settingsErr.message);
  } else if (settings) {
    const settingObjs: BopObject[] = settings.map(s => ({
      object_id: `setting:${s.key}`,
      type: 'setting' as const,
      module: moduleFromKey(s.key),
      name: s.key,
      status: (s.value === '' || s.value === null ? 'deprecated' : 'active') as any,
      description: `bop_settings key: ${s.key}`,
      updated_at: now,
    }));

    if (settingObjs.length > 0) {
      const { error } = await supabase
        .from('bop_objects')
        .upsert(settingObjs, { onConflict: 'object_id' });
      if (error) report.errors.push('settings sync: ' + error.message);
      else report.settings_synced = settingObjs.length;
    }
  }

  // ── 4. Seed dependency graph ─────────────────────────────────────────────
  for (let i = 0; i < ALL_DEPENDENCIES.length; i += 100) {
    const batch = ALL_DEPENDENCIES.slice(i, i + 100);
    const { error } = await supabase
      .from('bop_dependencies')
      .upsert(batch, { onConflict: 'from_id,to_id,dep_type' });
    if (error) { report.errors.push('deps: ' + error.message); break; }
    report.dependencies += batch.length;
  }

  const total = report.manifest + report.screens_synced + report.settings_synced;
  return NextResponse.json({
    seeded: {
      manifest_objects: report.manifest,
      screens_synced:   report.screens_synced,
      settings_synced:  report.settings_synced,
      dependencies:     report.dependencies,
      total_objects:    total,
    },
    errors: report.errors,
    message: report.errors.length === 0
      ? `Seed complete: ${total} objects, ${report.dependencies} deps`
      : `Seed finished with ${report.errors.length} error(s)`,
  });
}
