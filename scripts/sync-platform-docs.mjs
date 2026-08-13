// Syncs repo-level docs (ADRs + change log) into bop_documentation as
// target_type='platform' rows, so they show up in SY034 Documentation Browser
// and can be linked back to specific screens via the module/related_screens
// columns (migration 53). Source files are staged manually into
// scripts/_platform_docs_src/ (scp from the dessiteAG_V4 repo's
// docs/decisions/*.md + change/log.md) before running.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '_platform_docs_src');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function metaLine(raw, label) {
  const prefix = '**' + label + ':**';
  const line = raw.split('\n').find(l => l.trim().startsWith(prefix));
  if (!line) return null;
  return line.trim().slice(prefix.length).trim();
}

function parseAdr(file) {
  const raw = readFileSync(path.join(SRC, file), 'utf8');
  const num = file.match(/^(\d{4})/)[1];
  const titleLine = raw.split('\n').find(l => l.startsWith('# '));
  const title = titleLine.replace(/^#\s*ADR-\d+:\s*/, '').trim();
  const module = metaLine(raw, 'Module');
  const relatedRaw = metaLine(raw, 'Related screens');
  const related_screens = relatedRaw ? relatedRaw.split(',').map(s => s.trim()).filter(Boolean) : null;
  return { target_id: `ADR-${num}`, title, body_md: raw.trim(), module, related_screens };
}

function parseChangeLog(file) {
  const raw = readFileSync(path.join(SRC, file), 'utf8');
  // split on '## ' headers, skip the intro block before the first one
  const sections = raw.split(/\n(?=## )/).filter(s => s.startsWith('## '));
  return sections.map((s, i) => {
    const lines = s.split('\n');
    const title = lines[0].replace(/^##\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    return { seq: i, title, body_md: body };
  });
}

async function upsert(target_id, doc_type, title, body_md, { seq = 0, module = null, related_screens = null } = {}) {
  const { data: existing } = await sb.from('bop_documentation')
    .select('doc_id, version').eq('target_type', 'platform')
    .eq('target_id', target_id).eq('doc_type', doc_type).eq('seq', seq).maybeSingle();

  const extra = { module, related_screens };

  if (existing) {
    await sb.from('bop_documentation').update({
      title, body_md, status: 'active', owner: 'system', version: (existing.version ?? 1) + 1, ...extra,
    }).eq('doc_id', existing.doc_id);
    console.log(`updated ${target_id} (${doc_type}#${seq})`);
  } else {
    await sb.from('bop_documentation').insert({
      target_type: 'platform', target_id, doc_type, seq, title, body_md,
      status: 'active', owner: 'system', version: 1, ...extra,
    });
    console.log(`inserted ${target_id} (${doc_type}#${seq})`);
  }
}

async function main() {
  const files = readdirSync(SRC);
  for (const f of files.filter(f => /^\d{4}-.*\.md$/.test(f))) {
    const { target_id, title, body_md, module, related_screens } = parseAdr(f);
    await upsert(target_id, 'decision', title, body_md, { module, related_screens });
  }
  if (files.includes('log.md')) {
    const entries = parseChangeLog('log.md');
    for (const e of entries) await upsert('CHANGELOG', 'changelog', e.title, e.body_md, { seq: e.seq });
  }
  console.log('done.');
}
main().catch(e => { console.error(e); process.exit(1); });
