import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import fs from 'fs';
import path from 'path';

const APP_ROOT = path.join(process.cwd(), 'app');

function getAllTsx(): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') walk(full);
      else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) results.push(full);
    }
  }
  walk(APP_ROOT);
  return results;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data: screen } = await supabase
    .from('bop_screens').select('route, screen_id').eq('screen_id', id).single();

  if (!screen) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const files = getAllTsx();
  const refs: { file: string; line: number; context: string }[] = [];

  for (const f of files) {
    try {
      const src = fs.readFileSync(f, 'utf-8');
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (
          (screen.route && line.includes(screen.route)) ||
          line.includes(`'${id}'`) ||
          line.includes(`"${id}"`)
        ) {
          refs.push({
            file: f.replace(process.cwd(), ''),
            line: i + 1,
            context: line.trim().slice(0, 120),
          });
        }
      });
    } catch {}
  }

  return NextResponse.json({ screen_id: id, route: screen.route, refs });
}
