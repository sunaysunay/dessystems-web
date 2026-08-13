import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function mdToHtml(md: string): string {
  let html = md
    // code blocks (fenced)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre class="code-block" data-lang="${lang}"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    // inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // headings
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    // horizontal rules
    .replace(/^---+$/gm, '<hr />')
    // bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // blockquotes
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    // unordered lists
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    // ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // emoji shortcuts
    .replace(/❌/g, '<span class="emoji">❌</span>')
    .replace(/✅/g, '<span class="emoji">✅</span>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br />');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)*)/gm, (_m, header: string, _sep: string, body: string) => {
    const heads = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Paragraphs: wrap orphan text lines
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line;
    return `<p>${trimmed}</p>`;
  }).join('\n');

  return html;
}

const CSS = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.7; color: #1e293b; background: #fff;
    max-width: 900px; margin: 0 auto; padding: 2rem 2.5rem;
  }
  h1 { font-size: 1.75rem; font-weight: 700; margin: 2rem 0 1rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
  h2 { font-size: 1.35rem; font-weight: 700; margin: 1.75rem 0 0.75rem; color: #1e293b; }
  h3 { font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #334155; }
  h4, h5, h6 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: #475569; }
  p { margin: 0.5rem 0; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { font-weight: 600; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
  blockquote {
    border-left: 3px solid #3b82f6; background: #eff6ff; padding: 0.75rem 1rem;
    margin: 1rem 0; border-radius: 0 6px 6px 0; color: #1e40af;
  }
  ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
  li { margin: 0.25rem 0; }
  table {
    width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem;
    overflow-x: auto; display: block;
  }
  thead { background: #f1f5f9; }
  th { text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; color: #475569; border: 1px solid #e2e8f0; white-space: nowrap; }
  td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  pre.code-block {
    background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px;
    overflow-x: auto; margin: 1rem 0; font-size: 0.8rem; line-height: 1.5;
  }
  pre.code-block code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  code.inline-code {
    background: #f1f5f9; color: #dc2626; padding: 0.15rem 0.4rem;
    border-radius: 4px; font-size: 0.85em; font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  @media print { body { padding: 1rem; } }
</style>
`;

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

  const { data, error } = await supabase.storage.from('impl-docs').download(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'not found' }, { status: 404 });

  const mimeType = data.type || 'application/octet-stream';

  // PDF: serve inline
  if (mimeType === 'application/pdf' || path.endsWith('.pdf')) {
    const buf = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Content-Length': String(buf.length),
      },
    });
  }

  // Markdown: convert to HTML page
  if (path.endsWith('.md') || path.endsWith('.markdown') || path.endsWith('.txt') || mimeType.startsWith('text/')) {
    const text = await data.text();
    const htmlBody = mdToHtml(text);
    const fileName = path.split('/').pop() ?? 'document';
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${fileName}</title>
  ${CSS}
</head>
<body>
  ${htmlBody}
</body>
</html>`;
    return new NextResponse(fullHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Images: serve inline
  if (mimeType.startsWith('image/')) {
    const buf = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
      },
    });
  }

  // Fallback: download
  const buf = Buffer.from(await data.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${path.split('/').pop()}"`,
    },
  });
}
