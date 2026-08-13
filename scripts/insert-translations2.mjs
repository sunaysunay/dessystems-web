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
      if (!title || !body_md) { skipped++; continue; }
      const { error } = await sb.from('bop_documentation').insert({
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
      });
      if (error) {
        if (error.code === '23505') { skipped++; }
        else { console.error('FAILED', r.doc_id, locale, error.message); skipped++; }
      } else inserted++;
    }
  }
  console.log('done. inserted=' + inserted + ' skipped=' + skipped);
}
main().catch(e => { console.error(e); process.exit(1); });
