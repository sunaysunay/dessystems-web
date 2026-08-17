import { describe, it, expect } from 'vitest';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '../../supabase/migrations');

describe('migration files', () => {
  it('all follow YYYYMMDDHHMMSS_description.sql naming', async () => {
    const files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql'));
    const pattern = /^\d{14}_[a-z0-9_]+\.sql$/;
    for (const f of files) {
      expect(f, `Bad migration filename: ${f}`).toMatch(pattern);
    }
  });

  it('timestamps are unique and sorted', async () => {
    const files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort();
    const timestamps = files.map(f => f.slice(0, 14));
    const unique = new Set(timestamps);
    expect(unique.size).toBe(timestamps.length);
    expect([...timestamps]).toEqual([...timestamps].sort());
  });

  it('at least one migration exists', async () => {
    const files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
  });
});
