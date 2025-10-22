# MCP Bridge Server

**stdio-to-HTTP/SSE bridge for Next.js MCP integration with GenSpark**

## Overview

This bridge server enables GenSpark AI to connect to Next.js 16's built-in MCP (Model Context Protocol) server, which uses stdio transport by default. Since GenSpark only supports HTTP and SSE transports, this bridge translates between the two protocols.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   GenSpark AI   │  HTTP   │  MCP Bridge      │  stdio  │  Next.js Dev    │
│   (SSE/HTTP)    │ ◄──────►│  (Node.js)       │◄───────►│  Server (MCP)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
     Port varies              Port 9123                    Port 3000
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Bridge Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

### 3. Verify Server is Running

```bash
curl http://localhost:9123/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 12.345,
  "sessions": 0,
  "timestamp": "2025-10-22T13:00:00.000Z"
}
```

## Usage

### Initialize Connection

```bash
curl -X POST http://localhost:9123/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "GenSpark", "version": "1.0.0"}
    }
  }'
```

Response includes `sessionId` in the `meta` field:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "next-devtools-mcp", "version": "1.0.0" }
  },
  "meta": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Call Tools

```bash
SESSION_ID="<session-id-from-initialize>"

curl -X POST http://localhost:9123/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "nextjs_runtime",
      "arguments": {
        "action": "discover_servers"
      }
    }
  }'
```

### Open SSE Stream

```bash
curl -N http://localhost:9123/mcp \
  -H "mcp-session-id: $SESSION_ID"
```

## GenSpark Configuration

Add this MCP server to GenSpark:

```json
{
  "name": "nextjs-akyodex",
  "transport": "sse",
  "url": "http://localhost:9123/mcp",
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "Next.js 16 MCP for Akyodex project"
}
```

## Available Endpoints

- **POST /mcp** - JSON-RPC requests (initialize, tools/list, tools/call)
- **GET /mcp** - SSE streaming endpoint (requires `mcp-session-id` header)
- **GET /health** - Health check
- **GET /** - Server information

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server port (default: 9123)
PORT=9123

# Enable debug logging (default: false)
DEBUG=true
```

## Troubleshooting

### Bridge Server Won't Start

**Error**: `listen EADDRINUSE: address already in use :::9123`

**Solution**:
```bash
# Find and kill process using port 9123
lsof -i :9123
kill -9 <PID>
```

### Cannot Connect to Next.js MCP

**Error**: `spawn npx ENOENT`

**Solution**:
```bash
# Ensure Node.js and npx are installed
node --version  # Should be 20.x+
npx --version

# Install next-devtools-mcp globally
npm install -g next-devtools-mcp
```

### Session Not Found

**Error**: `Session not found or expired`

**Solution**: Sessions expire after 15 minutes of inactivity. Re-initialize connection.

### No Next.js Servers Discovered

**Solution**: Ensure Next.js dev server is running:
```bash
cd ../  # Go to akyodex-nextjs root
npm run dev
```

## Development

### Enable Debug Logging

```bash
DEBUG=true npm run dev
```

### Build TypeScript

```bash
npm run build
# Output in ./dist/
```

### Clean Build Artifacts

```bash
npm run clean
```

## Documentation

For complete documentation, see:
- [NEXTJS_MCP_INTEGRATION.md](../NEXTJS_MCP_INTEGRATION.md) - Full integration guide
- [Next.js MCP Guide](https://nextjs.org/docs/app/guides/mcp) - Official Next.js docs
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification

## Security Notes

⚠️ **This bridge server is for local development only!**

**Do NOT**:
- Expose to public internet
- Use in production without authentication
- Share MCP endpoint URLs publicly

**For production**, add:
- Authentication (Bearer tokens, API keys)
- Rate limiting
- Input validation
- HTTPS/TLS
- Firewall rules

## License

MIT - Part of the Akyodex project

## Support

- [GitHub Issues](https://github.com/rad-vrc/Akyodex/issues)
- [Documentation](../NEXTJS_MCP_INTEGRATION.md)
