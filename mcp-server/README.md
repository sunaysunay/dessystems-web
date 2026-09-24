# DES Growth Engine — MCP Server

AI agent runtime for the BOP Growth Engine (GRW module). Runs on **desworkstation** (mini PC, Tailscale IP `100.120.226.69`) and provides marketing automation tools to Claude Desktop.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  VPS (Control Plane) │◄───────►│  Mini PC (Execution) │
│  bop.dessystems.io   │ Tailscale│  desworkstation       │
│  Port 4400 (prod)    │         │  MCP Server (stdio)   │
│  Supabase REST       │         │  Claude Desktop       │
└─────────────────────┘         └──────────────────────┘
```

- **Control plane** (VPS): BOP console, APIs, Supabase connection
- **Execution plane** (mini PC): MCP server, AI agents via Claude Desktop
- **Bridge API**: `POST /api/bop/grw/mcp` forwards tool calls from BOP UI to MCP server

## Tools (7)

| Tool | Description |
|------|-------------|
| `list_clients` | List growth clients (DES tenants + external businesses) |
| `create_client` | Register an external business for marketing services |
| `generate_content` | AI content generation — multi-channel, multi-language |
| `list_campaigns` | List campaigns with status/tenant filter |
| `list_channels` | List active publication channels |
| `publish_output` | Publish approved content to a platform |
| `get_campaign_outputs` | Get all outputs for a campaign |

## Setup (on desworkstation)

### Prerequisites
- Node.js 22+ (installed via `fnm` at `~/.local/share/fnm`)
- Tailscale connected to DES mesh
- Claude Desktop installed

### Install
```bash
cd ~/des-growth-mcp
npm install
```

### Environment
File: `~/des-growth-mcp/.env`
```
SUPABASE_URL=https://ttydqyiezarpdysqacaa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
BOP_API_BASE=http://100.118.171.56:4400
```

### Claude Desktop Config
File: `~/.config/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "des-growth-engine": {
      "command": "/home/desserver/.local/share/fnm/aliases/default/bin/node",
      "args": ["/home/desserver/des-growth-mcp/src/server.mjs"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "BOP_API_BASE": "http://100.118.171.56:4400"
      }
    }
  }
}
```

### Test
```bash
node src/server.mjs
# Should print: "DES Growth Engine MCP server running"
```

### Logs
```
~/.config/Claude/logs/mcp-server-des-growth-engine.log
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `gr_clients` | External business clients + DES tenant links |
| `gr_playbooks` | Automation rules (triggers, channels, objectives) |
| `bop_mkt_campaigns` | Marketing campaigns (shared with MKT module) |
| `bop_mkt_outputs` | Generated content outputs per campaign |
| `bop_mkt_channels` | Publication channel configuration |

## SSH Access (VPS → Mini PC)

```bash
ssh desserver@100.120.226.69
```
- Key auth configured (VPS root key in `~desserver/.ssh/authorized_keys`)
- Tailscale SSH must be **disabled** (`sudo tailscale set --ssh=false`)
- UFW allows SSH (`sudo ufw allow ssh`)
- `UseDNS no` in `/etc/ssh/sshd_config` to prevent connection hangs

## Updating the Server

From VPS:
```bash
scp /root/dessystems-web-dev/mcp-server/src/server.mjs desserver@100.120.226.69:~/des-growth-mcp/src/server.mjs
```
Then restart Claude Desktop on the mini PC to reload the MCP server.
