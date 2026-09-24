import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOP_API_BASE = process.env.BOP_API_BASE || 'http://100.118.171.56:4400';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const server = new Server(
  { name: 'des-growth-engine', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ── TOOL DEFINITIONS ──

const TOOLS = [
  {
    name: 'list_clients',
    description: 'List all growth clients (DES tenants + external businesses)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['des_tenant', 'external'], description: 'Filter by client type' },
      },
    },
  },
  {
    name: 'create_client',
    description: 'Register a new external business client for marketing services',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Business name' },
        website: { type: 'string', description: 'Website URL' },
        industry: { type: 'string', description: 'Business industry/sector' },
        brand_tone: { type: 'string', description: 'Brand voice/tone (e.g. professional, friendly, bold)' },
        brand_description: { type: 'string', description: 'Business description, services, USPs' },
        contact_email: { type: 'string', description: 'Client contact email' },
        channels: { type: 'array', items: { type: 'string' }, description: 'Marketing channels' },
        languages: { type: 'array', items: { type: 'string' }, description: 'Content languages' },
      },
      required: ['name'],
    },
  },
  {
    name: 'generate_content',
    description: 'Generate AI marketing content for a client — multi-channel, multi-language. Works for any business, not just DES listings.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'Client UUID from gr_clients' },
        prompt: { type: 'string', description: 'Marketing brief — what to promote, key messages, offers' },
        objective: { type: 'string', enum: ['brand_awareness', 'lead_gen', 'promotion', 'seasonal', 'service_highlight', 'new_arrival', 'price_drop', 'event'] },
        channels: { type: 'array', items: { type: 'string' }, description: 'Target channels (linkedin, facebook, email, etc.)' },
        languages: { type: 'array', items: { type: 'string' }, description: 'Output languages (nl, en, de, etc.)' },
        target_audience: { type: 'string', description: 'Target audience description' },
      },
      required: ['prompt', 'channels', 'languages'],
    },
  },
  {
    name: 'list_campaigns',
    description: 'List marketing campaigns with optional status/tenant filter',
    inputSchema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'number', description: 'Filter by tenant ID' },
        status: { type: 'string', enum: ['draft', 'generating', 'review', 'approved', 'published', 'failed'] },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
  {
    name: 'list_channels',
    description: 'List available publication channels and their configuration',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'publish_output',
    description: 'Publish an approved content output to a platform (telegram, blog, email)',
    inputSchema: {
      type: 'object',
      properties: {
        output_id: { type: 'string', description: 'Content output UUID' },
        platform: { type: 'string', description: 'Target platform' },
      },
      required: ['output_id', 'platform'],
    },
  },
  {
    name: 'get_campaign_outputs',
    description: 'Get all content outputs for a specific campaign',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign UUID' },
      },
      required: ['campaign_id'],
    },
  },
];

// ── TOOL HANDLERS ──

async function handleTool(name, args) {
  switch (name) {
    case 'list_clients': {
      let q = sb.from('gr_clients').select('*').order('name');
      if (args.type) q = q.eq('client_type', args.type);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    }

    case 'create_client': {
      const { data, error } = await sb.from('gr_clients').insert({
        name: args.name,
        client_type: 'external',
        website: args.website || null,
        industry: args.industry || null,
        brand_tone: args.brand_tone || null,
        brand_description: args.brand_description || null,
        contact_email: args.contact_email || null,
        channels: args.channels || [],
        languages: args.languages || ['nl', 'en'],
      }).select().single();
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    }

    case 'generate_content': {
      let brandContext = '';
      if (args.client_id) {
        const { data: client } = await sb.from('gr_clients').select('*').eq('id', args.client_id).single();
        if (client) {
          brandContext = `\n\nBusiness: ${client.name}\nIndustry: ${client.industry || 'general'}\nTone: ${client.brand_tone || 'professional'}\nWebsite: ${client.website || 'n/a'}\nDescription: ${client.brand_description || ''}`;
        }
      }
      const tenantId = 200;
      const res = await fetch(`${BOP_API_BASE}/api/bop/mkt/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          source_type: 'manual',
          manual_prompt: args.prompt + brandContext,
          name: `MCP — ${args.objective || 'campaign'}`,
          objective: args.objective || 'promotion',
          target_audience: args.target_audience || '',
          channels: args.channels,
          locales: args.languages,
          verify: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'generation failed');
      return JSON.stringify({ campaign_id: d.campaign_id, count: d.count, outputs: d.outputs?.map(o => ({ id: o.id, channel: o.channel, locale: o.locale, subject: o.subject, body: o.body?.slice(0, 200) + '...', status: o.status })) }, null, 2);
    }

    case 'list_campaigns': {
      let q = sb.from('bop_mkt_campaigns').select('id,name,status,objective,source_type,channels,languages,tenant_id,created_at').order('created_at', { ascending: false }).limit(args.limit || 50);
      if (args.tenant_id) q = q.eq('tenant_id', args.tenant_id);
      if (args.status) q = q.eq('status', args.status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    }

    case 'list_channels': {
      const { data, error } = await sb.from('bop_mkt_channels').select('*').eq('active', true).order('channel');
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    }

    case 'publish_output': {
      const res = await fetch(`${BOP_API_BASE}/api/bop/mkt/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ output_id: args.output_id, platform: args.platform }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'publish failed');
      return JSON.stringify(d, null, 2);
    }

    case 'get_campaign_outputs': {
      const { data, error } = await sb.from('bop_mkt_outputs').select('*').eq('campaign_id', args.campaign_id).order('channel');
      if (error) throw new Error(error.message);
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── WIRE UP ──

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, args || {});
    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('DES Growth Engine MCP server running');
