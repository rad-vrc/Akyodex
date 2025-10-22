#!/usr/bin/env node

/**
 * MCP Bridge Server - stdio to HTTP/SSE Transport Bridge
 * 
 * This server bridges the gap between Next.js's stdio-based MCP server
 * and GenSpark's HTTP/SSE-only MCP client.
 * 
 * Architecture:
 *   GenSpark (HTTP) <-> Bridge (stdio) <-> Next.js MCP (stdio)
 * 
 * @version 1.0.0
 * @author GenSpark AI Developer
 */

import express, { Request, Response } from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { randomUUID } from 'crypto';
import cors from 'cors';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT || 9123;
const DEBUG = process.env.DEBUG === 'true';
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// Types
// ============================================================================

interface MCPSession {
  id: string;
  client: Client;
  transport: StdioClientTransport;
  createdAt: Date;
  lastActivity: Date;
  connected: boolean;
}

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  meta?: {
    sessionId?: string;
  };
}

// ============================================================================
// Session Management
// ============================================================================

const sessions = new Map<string, MCPSession>();

/**
 * Create a new MCP session with stdio transport to next-devtools-mcp
 */
async function createSession(): Promise<MCPSession> {
  const sessionId = randomUUID();
  
  log('info', `Creating new session: ${sessionId}`);
  
  // Create stdio transport to next-devtools-mcp
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'next-devtools-mcp@latest'],
  });
  
  // Create MCP client
  const client = new Client(
    {
      name: 'MCP Bridge',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );
  
  // Connect to MCP server
  try {
    await client.connect(transport);
    
    const session: MCPSession = {
      id: sessionId,
      client,
      transport,
      createdAt: new Date(),
      lastActivity: new Date(),
      connected: true,
    };
    
    sessions.set(sessionId, session);
    log('success', `Session created and connected: ${sessionId}`);
    
    return session;
  } catch (error) {
    log('error', `Failed to connect to MCP server: ${error}`);
    throw error;
  }
}

/**
 * Get existing session by ID
 */
function getSession(sessionId: string): MCPSession | null {
  const session = sessions.get(sessionId);
  if (!session) {
    log('warn', `Session not found: ${sessionId}`);
    return null;
  }
  
  // Update last activity
  session.lastActivity = new Date();
  return session;
}

/**
 * Clean up expired sessions
 */
function cleanupSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, session] of sessions.entries()) {
    const age = now - session.lastActivity.getTime();
    if (age > SESSION_TIMEOUT_MS) {
      log('info', `Cleaning up expired session: ${id} (age: ${Math.round(age / 1000)}s)`);
      try {
        session.client.close();
      } catch (error) {
        log('warn', `Error closing session ${id}: ${error}`);
      }
      sessions.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log('info', `Cleaned up ${cleaned} expired session(s)`);
  }
}

// Run cleanup every minute
setInterval(cleanupSessions, 60 * 1000);

// ============================================================================
// Logging
// ============================================================================

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📢',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  }[level];
  
  if (level === 'debug' && !DEBUG) return;
  
  const logMessage = `${timestamp} ${prefix} ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, data || '');
      break;
    case 'warn':
      console.warn(logMessage, data || '');
      break;
    default:
      console.log(logMessage, data || '');
  }
}

// ============================================================================
// Express Server Setup
// ============================================================================

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (dev only!)
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  log('debug', `${req.method} ${req.path}`, {
    sessionId,
    hasBody: !!req.body,
  });
  next();
});

// ============================================================================
// MCP Endpoints
// ============================================================================

/**
 * POST /mcp - Handle JSON-RPC requests
 */
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const request: JSONRPCRequest = req.body;
    const sessionIdHeader = req.headers['mcp-session-id'] as string;
    
    log('debug', `Received request: ${request.method}`, { id: request.id });
    
    // Handle initialize request (create new session)
    if (request.method === 'initialize') {
      const session = await createSession();
      
      // Forward initialize request to MCP server
      const result = await session.client.request(request, request.params);
      
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
        meta: {
          sessionId: session.id,
        },
      };
      
      log('success', `Initialized session: ${session.id}`);
      return res.json(response);
    }
    
    // For other requests, require session ID
    if (!sessionIdHeader) {
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32600,
          message: 'Missing mcp-session-id header',
        },
      };
      return res.status(400).json(response);
    }
    
    const session = getSession(sessionIdHeader);
    if (!session) {
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32001,
          message: 'Session not found or expired',
          data: { sessionId: sessionIdHeader },
        },
      };
      return res.status(404).json(response);
    }
    
    // Forward request to MCP server
    try {
      const result = await session.client.request(request, request.params);
      
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
      
      log('debug', `Request completed: ${request.method}`);
      return res.json(response);
    } catch (error: any) {
      log('error', `Request failed: ${request.method}`, error);
      
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
          data: error.stack,
        },
      };
      return res.status(500).json(response);
    }
  } catch (error: any) {
    log('error', 'Unhandled error in POST /mcp', error);
    
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error or server error',
        data: error.message,
      },
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /mcp - SSE streaming endpoint
 */
app.get('/mcp', (req: Request, res: Response) => {
  const sessionIdHeader = req.headers['mcp-session-id'] as string;
  
  if (!sessionIdHeader) {
    return res.status(400).json({
      error: 'Missing mcp-session-id header',
    });
  }
  
  const session = getSession(sessionIdHeader);
  if (!session) {
    return res.status(404).json({
      error: 'Session not found or expired',
      sessionId: sessionIdHeader,
    });
  }
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  log('info', `SSE stream opened for session: ${sessionIdHeader}`);
  
  // Send initial connection event
  res.write('event: message\n');
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId: session.id })}\n\n`);
  
  // Set up periodic ping to keep connection alive
  const pingInterval = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: {}\n\n');
  }, 30000); // Every 30 seconds
  
  // Clean up on connection close
  req.on('close', () => {
    clearInterval(pingInterval);
    log('info', `SSE stream closed for session: ${sessionIdHeader}`);
  });
  
  // Note: In a full implementation, you would:
  // 1. Listen for notifications from the MCP client
  // 2. Forward them as SSE events
  // For now, this keeps the connection alive for GenSpark compatibility
});

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    sessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET / - Server info
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'MCP Bridge Server',
    version: '1.0.0',
    description: 'stdio-to-HTTP/SSE bridge for Next.js MCP',
    endpoints: {
      mcp_post: 'POST /mcp - JSON-RPC requests',
      mcp_get: 'GET /mcp - SSE streaming',
      health: 'GET /health - Health check',
    },
    sessions: sessions.size,
    documentation: 'https://github.com/rad-vrc/Akyodex/blob/main/akyodex-nextjs/NEXTJS_MCP_INTEGRATION.md',
  });
});

// ============================================================================
// Server Startup
// ============================================================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  log('success', 'MCP Bridge Server started');
  console.log('='.repeat(60));
  log('info', `📡 HTTP/SSE endpoint: http://localhost:${PORT}/mcp`);
  log('info', `🏥 Health check: http://localhost:${PORT}/health`);
  log('info', `🔌 Connecting to Next.js MCP via next-devtools-mcp...`);
  log('info', `🎯 Ready to accept GenSpark connections`);
  console.log('='.repeat(60) + '\n');
  
  if (DEBUG) {
    log('debug', 'Debug mode enabled');
  }
  
  log('info', 'Waiting for MCP connections...');
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  log('info', 'Shutting down gracefully...');
  
  // Close all sessions
  for (const [id, session] of sessions.entries()) {
    try {
      session.client.close();
      log('info', `Closed session: ${id}`);
    } catch (error) {
      log('warn', `Error closing session ${id}: ${error}`);
    }
  }
  
  log('success', 'Shutdown complete');
  process.exit(0);
});
