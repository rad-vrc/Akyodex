#!/usr/bin/env node

/**
 * Universal MCP Bridge - 汎用stdio-to-HTTP/Streamable HTTPブリッジ
 * 
 * 任意のstdio形式のMCPサーバーをHTTP/Streamable HTTP化します。
 * 設定ファイル（mcp-servers.json）で複数のMCPサーバーを管理できます。
 * 
 * @version 1.0.0
 * @author GenSpark AI Developer
 */

import express, { Request, Response } from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { randomUUID } from 'crypto';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// 型定義
// ============================================================================

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
}

interface Config {
  servers: Record<string, MCPServerConfig>;
  port: number;
  debug?: boolean;
}

interface MCPSession {
  id: string;
  serverName: string;
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
// 設定読み込み
// ============================================================================

let config: Config;

try {
  const configPath = join(process.cwd(), 'mcp-servers.json');
  const configFile = readFileSync(configPath, 'utf-8');
  config = JSON.parse(configFile);
  
  if (!config.servers || Object.keys(config.servers).length === 0) {
    throw new Error('mcp-servers.jsonにサーバー設定がありません');
  }
} catch (error: any) {
  console.error('❌ 設定ファイルの読み込みに失敗:', error.message);
  console.error('💡 mcp-servers.jsonを作成してください');
  process.exit(1);
}

const PORT = config.port || 9123;
const DEBUG = config.debug || false;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15分

// ============================================================================
// セッション管理
// ============================================================================

const sessions = new Map<string, MCPSession>();

/**
 * 新しいMCPセッションを作成
 */
async function createSession(serverName: string): Promise<MCPSession> {
  const sessionId = randomUUID();
  
  log('info', `📝 セッション作成中: ${serverName} (${sessionId})`);
  
  const serverConfig = config.servers[serverName];
  if (!serverConfig) {
    throw new Error(`サーバー "${serverName}" が見つかりません`);
  }
  
  // 環境変数をマージ
  const env = {
    ...process.env,
    ...serverConfig.env,
  };
  
  // stdioトランスポート作成
  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    env,
  });
  
  // MCPクライアント作成
  const client = new Client(
    {
      name: 'Universal MCP Bridge',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );
  
  // 接続
  try {
    await client.connect(transport);
    
    const session: MCPSession = {
      id: sessionId,
      serverName,
      client,
      transport,
      createdAt: new Date(),
      lastActivity: new Date(),
      connected: true,
    };
    
    sessions.set(sessionId, session);
    log('success', `✅ セッション作成完了: ${serverName} (${sessionId})`);
    
    return session;
  } catch (error: any) {
    log('error', `❌ MCPサーバー接続失敗: ${serverName}`, error.message);
    throw error;
  }
}

/**
 * セッションを取得
 */
function getSession(sessionId: string): MCPSession | null {
  const session = sessions.get(sessionId);
  if (!session) {
    log('warn', `⚠️ セッションが見つかりません: ${sessionId}`);
    return null;
  }
  
  // 最終アクティビティを更新
  session.lastActivity = new Date();
  return session;
}

/**
 * 期限切れセッションのクリーンアップ
 */
function cleanupSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, session] of sessions.entries()) {
    const age = now - session.lastActivity.getTime();
    if (age > SESSION_TIMEOUT_MS) {
      log('info', `♻️ 期限切れセッションをクリーンアップ: ${id} (経過: ${Math.round(age / 1000)}秒)`);
      try {
        session.client.close();
      } catch (error) {
        log('warn', `⚠️ セッションクローズエラー ${id}:`, error);
      }
      sessions.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log('info', `♻️ ${cleaned}個のセッションをクリーンアップしました`);
  }
}

// 1分ごとにクリーンアップ実行
setInterval(cleanupSessions, 60 * 1000);

// ============================================================================
// ログ機能
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
// Expressサーバー設定
// ============================================================================

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());

// リクエストログ
app.use((req, res, next) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  log('debug', `${req.method} ${req.path}`, {
    sessionId,
    hasBody: !!req.body,
  });
  next();
});

// ============================================================================
// ルート: サーバー情報
// ============================================================================

app.get('/', (req: Request, res: Response) => {
  const serverList = Object.entries(config.servers).map(([name, cfg]) => ({
    name,
    endpoint: `/mcp/${name}`,
    command: cfg.command,
    description: cfg.description || '',
  }));
  
  res.json({
    name: 'Universal MCP Bridge',
    version: '1.0.0',
    description: '汎用stdio-to-HTTP/Streamable HTTPブリッジ',
    port: PORT,
    servers: serverList,
    activeSessions: sessions.size,
    documentation: 'https://github.com/rad-vrc/Akyodex/tree/main/akyodex-nextjs/universal-mcp-bridge',
  });
});

// ============================================================================
// ルート: ヘルスチェック
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    sessions: sessions.size,
    servers: Object.keys(config.servers),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ルート: MCPエンドポイント（POST）
// ============================================================================

app.post('/mcp/:serverName', async (req: Request, res: Response) => {
  try {
    const { serverName } = req.params;
    const request: JSONRPCRequest = req.body;
    const sessionIdHeader = req.headers['mcp-session-id'] as string;
    
    // サーバー設定確認
    if (!config.servers[serverName]) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: `MCPサーバー "${serverName}" が見つかりません`,
          data: { availableServers: Object.keys(config.servers) },
        },
      });
    }
    
    log('debug', `📥 リクエスト: ${serverName}/${request.method}`, { id: request.id });
    
    // initialize: 新しいセッション作成
    if (request.method === 'initialize') {
      const session = await createSession(serverName);
      
      // initializeリクエストをMCPサーバーに転送
      const result = await session.client.request(request, request.params);
      
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
        meta: {
          sessionId: session.id,
        },
      };
      
      log('success', `✅ セッション初期化完了: ${serverName} (${session.id})`);
      return res.json(response);
    }
    
    // その他のリクエスト: セッションIDが必要
    if (!sessionIdHeader) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32600,
          message: 'mcp-session-idヘッダーが必要です',
        },
      });
    }
    
    const session = getSession(sessionIdHeader);
    if (!session) {
      return res.status(404).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32001,
          message: 'セッションが見つかりません（期限切れの可能性があります）',
          data: { sessionId: sessionIdHeader },
        },
      });
    }
    
    // セッションのサーバー名確認
    if (session.serverName !== serverName) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32600,
          message: `このセッションは ${session.serverName} に紐付いています`,
          data: { expected: session.serverName, got: serverName },
        },
      });
    }
    
    // リクエストをMCPサーバーに転送
    try {
      const result = await session.client.request(request, request.params);
      
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
      
      log('debug', `✅ リクエスト完了: ${serverName}/${request.method}`);
      return res.json(response);
    } catch (error: any) {
      log('error', `❌ リクエスト失敗: ${serverName}/${request.method}`, error.message);
      
      return res.status(500).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message || '内部エラー',
          data: error.stack,
        },
      });
    }
  } catch (error: any) {
    log('error', '❌ ハンドルされていないエラー', error);
    
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'パースエラーまたはサーバーエラー',
        data: error.message,
      },
    });
  }
});

// ============================================================================
// ルート: SSEストリーミング（GET）
// ============================================================================

app.get('/mcp/:serverName', (req: Request, res: Response) => {
  const { serverName } = req.params;
  const sessionIdHeader = req.headers['mcp-session-id'] as string;
  
  // サーバー設定確認
  if (!config.servers[serverName]) {
    return res.status(404).json({
      error: `MCPサーバー "${serverName}" が見つかりません`,
      availableServers: Object.keys(config.servers),
    });
  }
  
  if (!sessionIdHeader) {
    return res.status(400).json({
      error: 'mcp-session-idヘッダーが必要です',
    });
  }
  
  const session = getSession(sessionIdHeader);
  if (!session) {
    return res.status(404).json({
      error: 'セッションが見つかりません',
      sessionId: sessionIdHeader,
    });
  }
  
  if (session.serverName !== serverName) {
    return res.status(400).json({
      error: `このセッションは ${session.serverName} に紐付いています`,
    });
  }
  
  // SSEヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  log('info', `🌊 SSEストリーム開始: ${serverName} (${sessionIdHeader})`);
  
  // 接続イベント送信
  res.write('event: message\n');
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    sessionId: session.id,
    server: serverName,
  })}\n\n`);
  
  // Pingで接続維持
  const pingInterval = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: {}\n\n');
  }, 30000);
  
  // クローズ時のクリーンアップ
  req.on('close', () => {
    clearInterval(pingInterval);
    log('info', `🌊 SSEストリーム終了: ${serverName} (${sessionIdHeader})`);
  });
});

// ============================================================================
// サーバー起動
// ============================================================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  log('success', '🚀 Universal MCP Bridge 起動完了');
  console.log('='.repeat(70));
  log('info', `📡 ポート: ${PORT}`);
  log('info', `🔧 設定ファイル: mcp-servers.json`);
  console.log('='.repeat(70));
  log('info', '\n📋 利用可能なMCPサーバー:');
  
  Object.entries(config.servers).forEach(([name, cfg]) => {
    console.log(`\n  🔹 ${name}`);
    console.log(`     📍 エンドポイント: http://localhost:${PORT}/mcp/${name}`);
    console.log(`     🛠️  コマンド: ${cfg.command} ${cfg.args.join(' ')}`);
    if (cfg.description) {
      console.log(`     📝 説明: ${cfg.description}`);
    }
    if (cfg.env && Object.keys(cfg.env).length > 0) {
      console.log(`     🔐 環境変数: ${Object.keys(cfg.env).join(', ')}`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  log('info', `🏥 ヘルスチェック: http://localhost:${PORT}/health`);
  log('info', `📖 サーバー情報: http://localhost:${PORT}/`);
  console.log('='.repeat(70) + '\n');
  
  if (DEBUG) {
    log('debug', '🔍 デバッグモード有効');
  }
  
  log('info', '✨ MCP接続を待機中...\n');
});

// ============================================================================
// グレースフルシャットダウン
// ============================================================================

process.on('SIGINT', () => {
  log('info', '\n🛑 シャットダウン中...');
  
  // 全セッションをクローズ
  for (const [id, session] of sessions.entries()) {
    try {
      session.client.close();
      log('info', `✅ セッションクローズ: ${id}`);
    } catch (error) {
      log('warn', `⚠️ セッションクローズエラー ${id}:`, error);
    }
  }
  
  log('success', '✅ シャットダウン完了');
  process.exit(0);
});
