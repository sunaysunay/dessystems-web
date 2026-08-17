#!/usr/bin/env node
/**
 * Lightweight migration runner for Supabase.
 * Tracks applied migrations in `public._migrations`.
 * Usage: node supabase/migrate.mjs
 *        DRY_RUN=1 node supabase/migrate.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const DRY_RUN = process.env.DRY_RUN === '1';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  db: { schema: 'public' },
  auth: { persistSession: false },
});

async function ensureTrackingTable() {
  await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  });
}

async function getApplied() {
  const { data, error } = await supabase
    .from('_migrations')
    .select('name')
    .order('name');
  if (error) {
    if (error.code === '42P01') return new Set();
    throw error;
  }
  return new Set((data ?? []).map(r => r.name));
}

async function run() {
  await ensureTrackingTable();
  const applied = await getApplied();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort();

  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('✓ No pending migrations');
    return;
  }

  console.log(`${pending.length} pending migration(s):`);

  for (const file of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  → ${file}`);

    if (DRY_RUN) {
      console.log(sql);
      continue;
    }

    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.error(`  ✗ ${file}: ${error.message}`);
      process.exit(1);
    }

    await supabase.from('_migrations').insert({ name: file });
    console.log(`  ✓ ${file}`);
  }

  console.log(DRY_RUN ? '(dry run — nothing applied)' : '✓ All migrations applied');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
