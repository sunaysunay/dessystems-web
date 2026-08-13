// Reads merged translated screen-doc JSON and inserts nl/de locale rows into
// bop_documentation. Run on the VPS with .env.local sourced.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const rows = JSON.parse(readFileSync('./translated_merged.json', 'utf8'));
  let inserted = 0, skipped = 0;

  for (const r of rows) {
    for (const [locale, title, body_md] of [
      ['nl', r.title_nl, r.body_md_nl],
      ['de', r.title_de, r.body_md_de],
    ]) {
      if (!title || !body_md) { skipped++; console.warn('skip (missing content)', r.doc_id, locale); continue; }
      const { error } = await sb.from('bop_documentation').upsert({
        target_type: 'screen',
        target_id: r.target_id,
        doc_type: r.doc_type,
        seq: r.seq,
        locale,
        title,
        body_md,
        status: 'active',
        owner: 'system',
        version: 1,
      }, { onConflict: 'target_type,target_id,doc_type,seq,locale' });
      if (error) { console.error('FAILED', r.doc_id, locale, error.message); skipped++; }
      else inserted++;
    }
  }
  console.log(`done. inserted/updated=${inserted} skipped=${skipped}`);
}
main().catch(e => { console.error(e); process.exit(1); });
