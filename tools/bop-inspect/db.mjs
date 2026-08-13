#!/usr/bin/env node
// bop-inspect db — Phase 2 DB & domain rule checks
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = __dirname;
const SQL_DIR = path.join(SCRIPT_DIR, 'sql');
const ENV_FILE = path.join(SCRIPT_DIR, '../../.env.local');

const env = {};
fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.+)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const SUPA_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SRK     = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPA_URL || !SRK) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join(SCRIPT_DIR, 'out', TIMESTAMP + '_db');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function queryRest(table, params) {
  const url = params ? `${SUPA_URL}/rest/v1/${table}?${params}` : `${SUPA_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SRK,
      'Authorization': `Bearer ${SRK}`,
      'Prefer': 'count=exact',
    },
  });
  if (!res.ok) throw new Error(`REST ${table}: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  const count = parseInt(res.headers.get('content-range')?.split('/')[1] ?? '0');
  return { data, count };
}

async function rawSQL(sql) {
  const res = await fetch(`${SUPA_URL}/pg/query`, {
    method: 'POST',
    headers: { 'apikey': SRK, 'Authorization': `Bearer ${SRK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (res.status === 404 || res.status === 405) return { rows: null, error: 'pg_query_unavailable' };
  if (!res.ok) return { rows: null, error: (await res.text()).slice(0, 200) };
  const json = await res.json();
  return { rows: json.rows ?? json ?? [], error: null };
}

// Load qa_checks to get UUIDs for persistence
let checkIdByCode = {};
try {
  const { data } = await queryRest('qa_checks', 'enabled=eq.true&select=id,code');
  for (const c of data) checkIdByCode[c.code] = c.id;
} catch(e) {
  console.warn('[WARN] Could not load qa_checks:', e.message);
}

async function persistRun(code, violationCount, sample) {
  const check_id = checkIdByCode[code];
  if (!check_id) return;
  await fetch(`${SUPA_URL}/rest/v1/qa_check_runs`, {
    method: 'POST',
    headers: {
      'apikey': SRK,
      'Authorization': `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ check_id, violation_count: violationCount, sample: sample ?? null }),
  });
}

let pass = 0, fail = 0, skip = 0, warn = 0;

function log(status, check, msg) {
  const prefix = { PASS: '[PASS]', FAIL: '[FAIL]', SKIP: '[SKIP]', WARN: '[WARN]' }[status] ?? `[${status}]`;
  console.log(`${prefix} ${check}: ${msg}`);
  if (status === 'PASS') pass++;
  else if (status === 'FAIL') fail++;
  else if (status === 'SKIP') skip++;
  else if (status === 'WARN') warn++;
}

console.log('==> bop-inspect db — schema hygiene + business invariants');
console.log('');

// CHECK 001: qa_checks table exists (migration guard)
try {
  const { count } = await queryRest('qa_checks', 'limit=1');
  log('PASS', '001_migration', `qa_checks table exists (${count} checks seeded)`);
} catch(e) {
  log('FAIL', '001_migration', 'qa_checks table missing — run sql/migration_qa_tables.sql first');
  process.exit(1);
}

// CHECK 030: BOP_SCREEN_MISSING_ROUTE — active bop_screens all have routes
try {
  const { data, count } = await queryRest('bop_screens', 'status=eq.active&route=is.null&select=screen_id,title');
  const sample = data.slice(0, 5).map(r => ({ screen_id: r.screen_id, title: r.title }));
  if (count > 0) {
    log('FAIL', 'BOP_SCREEN_MISSING_ROUTE', `${count} active screens have no route: ${data.map(r => r.screen_id).join(', ')}`);
    await persistRun('BOP_SCREEN_MISSING_ROUTE', count, sample);
  } else {
    log('PASS', 'BOP_SCREEN_MISSING_ROUTE', 'all active screens have routes');
    await persistRun('BOP_SCREEN_MISSING_ROUTE', 0, []);
  }
} catch(e) { log('SKIP', 'BOP_SCREEN_MISSING_ROUTE', e.message); }

// CHECK 040: BOP_OBJECT_ORPHAN — bop_objects screen entries with no bop_screens row
try {
  const { data: objects } = await queryRest('bop_objects', 'type=eq.screen&select=object_id');
  const { data: screens } = await queryRest('bop_screens', 'select=screen_id');
  const screenIds = new Set(screens.map(s => s.screen_id));
  const orphans = objects.filter(o => !screenIds.has(o.object_id.replace('screen:', '')));
  const sample = orphans.slice(0, 5).map(o => ({ object_id: o.object_id }));
  if (orphans.length > 0) {
    log('WARN', 'BOP_OBJECT_ORPHAN', `${orphans.length} orphan screen entries: ${orphans.map(o => o.object_id).slice(0, 5).join(', ')}`);
    await persistRun('BOP_OBJECT_ORPHAN', orphans.length, sample);
  } else {
    log('PASS', 'BOP_OBJECT_ORPHAN', 'no orphan bop_objects screen entries');
    await persistRun('BOP_OBJECT_ORPHAN', 0, []);
  }
} catch(e) { log('SKIP', 'BOP_OBJECT_ORPHAN', e.message); }

// CHECK 050: LISTING_PUBLISHED_NEEDS_IMAGE — active listings all have at least one photo
try {
  const { data: listings } = await queryRest('bop_listings', 'status=eq.active&select=id,ref_no');
  if (listings.length === 0) {
    log('PASS', 'LISTING_PUBLISHED_NEEDS_IMAGE', 'no active listings (nothing to check)');
    await persistRun('LISTING_PUBLISHED_NEEDS_IMAGE', 0, []);
  } else {
    const { data: media } = await queryRest('bop_listing_media', 'media_type=eq.photo&select=listing_id');
    const withPhoto = new Set(media.map(m => m.listing_id));
    const missing = listings.filter(l => !withPhoto.has(l.id));
    const sample = missing.slice(0, 5).map(l => ({ ref_no: l.ref_no, id: l.id }));
    if (missing.length > 0) {
      log('FAIL', 'LISTING_PUBLISHED_NEEDS_IMAGE', `${missing.length} active listings have no photo: ${missing.map(l => l.ref_no || l.id).slice(0, 5).join(', ')}`);
      await persistRun('LISTING_PUBLISHED_NEEDS_IMAGE', missing.length, sample);
    } else {
      log('PASS', 'LISTING_PUBLISHED_NEEDS_IMAGE', `${listings.length} active listings all have photos`);
      await persistRun('LISTING_PUBLISHED_NEEDS_IMAGE', 0, []);
    }
  }
} catch(e) { log('SKIP', 'LISTING_PUBLISHED_NEEDS_IMAGE', e.message); }

// CHECK 060: DEALER_APP_APPROVED_HAS_TENANT — approved dealer apps have tenant_id
try {
  const { data, count } = await queryRest('dos_dealer_applications', 'status=eq.approved&tenant_id=is.null&select=id,email');
  const sample = data.slice(0, 5).map(r => ({ id: r.id, email: r.email }));
  if (count > 0) {
    log('FAIL', 'DEALER_APP_APPROVED_HAS_TENANT', `${count} approved dealer applications missing tenant_id`);
    await persistRun('DEALER_APP_APPROVED_HAS_TENANT', count, sample);
  } else {
    log('PASS', 'DEALER_APP_APPROVED_HAS_TENANT', 'all approved dealer apps have tenant_id');
    await persistRun('DEALER_APP_APPROVED_HAS_TENANT', 0, []);
  }
} catch(e) { log('SKIP', 'DEALER_APP_APPROVED_HAS_TENANT', e.message); }

// CHECK: BOP_TENANT_ACTIVE_LISTING — active listings reference a valid bop_tenant
try {
  const { data: listings } = await queryRest('bop_listings', 'status=eq.active&tenant_id=not.is.null&select=id,ref_no,tenant_id');
  if (listings.length === 0) {
    log('PASS', 'BOP_TENANT_ACTIVE_LISTING', 'no active listings with tenant_id to check');
    await persistRun('BOP_TENANT_ACTIVE_LISTING', 0, []);
  } else {
    const { data: tenants } = await queryRest('bop_tenants', 'select=tenant_id');
    const validTenants = new Set(tenants.map(t => t.tenant_id));
    const invalid = listings.filter(l => !validTenants.has(l.tenant_id));
    const sample = invalid.slice(0, 5).map(l => ({ ref_no: l.ref_no, tenant_id: l.tenant_id }));
    if (invalid.length > 0) {
      log('FAIL', 'BOP_TENANT_ACTIVE_LISTING', `${invalid.length} listings reference non-existent bop_tenant`);
      await persistRun('BOP_TENANT_ACTIVE_LISTING', invalid.length, sample);
    } else {
      log('PASS', 'BOP_TENANT_ACTIVE_LISTING', `${listings.length} active listings all reference valid bop_tenants`);
      await persistRun('BOP_TENANT_ACTIVE_LISTING', 0, []);
    }
  }
} catch(e) { log('SKIP', 'BOP_TENANT_ACTIVE_LISTING', e.message); }

// ── Schema catalog checks (pg proxy, Supabase Pro+ only) ─────────────────
console.log('');
console.log('==> schema catalog checks (pg proxy — Supabase Pro+ only)');
const sqlFiles = [
  ['010_missing_rls.sql',        'missing_rls',       'high'],
  ['020_fk_no_index.sql',        'fk_no_index',       'medium'],
  ['030_naming.sql',             'naming_convention',  'low'],
  ['040_registry_drift.sql',     'registry_drift',    'high'],
  ['050_missing_audit_cols.sql', 'missing_audit_cols', 'medium'],
  ['060_nullable_fks.sql',       'nullable_tenant_fk', 'high'],
  ['070_unused_indexes.sql',     'unused_indexes',     'low'],
];
for (const [file, label, severity] of sqlFiles) {
  const sqlPath = path.join(SQL_DIR, file);
  if (!fs.existsSync(sqlPath)) { log('SKIP', label, 'file not found'); continue; }
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/^--.*$/gm, '').trim();
  const { rows, error } = await rawSQL(sql);
  if (error === 'pg_query_unavailable') {
    console.log(`  [SKIP] ${label}: pg proxy unavailable (Supabase Pro+ required)`);
    skip++;
  } else if (error) {
    log('SKIP', label, `query error: ${error.slice(0, 100)}`);
  } else if (rows.length > 0) {
    log('FAIL', label, `${rows.length} violation(s) [${severity}]`);
    fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(rows, null, 2));
  } else {
    log('PASS', label, 'no violations');
  }
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log('');
console.log('══════════════════════════════════════');
console.log(` bop-inspect db — ${TIMESTAMP}`);
console.log(` PASS: ${pass}  FAIL: ${fail}  WARN: ${warn}  SKIP: ${skip}`);
console.log('══════════════════════════════════════');

const summary = { timestamp: TIMESTAMP, pass, fail, warn, skip };
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`Summary: ${OUT_DIR}/summary.json`);

if (fail > 0) process.exit(1);
