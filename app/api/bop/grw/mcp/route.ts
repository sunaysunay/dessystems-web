import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const MCP_HOST = process.env.MCP_AGENT_HOST || 'http://100.120.226.69:3100';

// GET /api/bop/grw/mcp — health check for the MCP agent runtime
export async function GET() {
  try {
    const r = await fetch(`${MCP_HOST}/health`, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    return NextResponse.json({ status: 'connected', agent: d });
  } catch {
    return NextResponse.json({ status: 'unreachable', host: MCP_HOST });
  }
}

// POST /api/bop/grw/mcp — forward a tool call to the MCP agent runtime
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tool, args } = body;
  if (!tool) return NextResponse.json({ error: 'tool required' }, { status: 400 });
  try {
    const r = await fetch(`${MCP_HOST}/tool`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: tool, arguments: args || {} }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await r.json();
    return NextResponse.json(d);
  } catch (e: any) {
    return NextResponse.json({ error: `MCP unreachable: ${e.message}`, host: MCP_HOST }, { status: 502 });
  }
}
