import fs from 'node:fs';
import path from 'node:path';
import type { ResumableSessionState, SessionTurn } from '../contracts/memory.ts';

export class SessionTracker {
  private baseDir: string;
  private dbPath: string;
  private jsonPath: string;
  private sqliteDb: any = null;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'd8.7-data');
    fs.mkdirSync(this.baseDir, { recursive: true });
    this.dbPath = path.join(this.baseDir, 'memory.sqlite');
    this.jsonPath = path.join(this.baseDir, 'sessions.json');
    this.initStorage();
  }

  private initStorage(): void {
    try {
      // Check if node:sqlite is present in the runtime
      // @ts-ignore
      const sqliteModule = (globalThis as any).process?.getBuiltinModule?.('node:sqlite');
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.sqliteDb = new sqliteModule.DatabaseSync(this.dbPath);
        this.sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            metadata TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, timestamp);

          CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_hash TEXT NOT NULL,
            last_assistant_message_id TEXT,
            updated_at INTEGER NOT NULL
          );
        `);
        return;
      }
    } catch {
      // SQLite not available or experimental flag not passed, fallback to JSON storage
    }

    if (!fs.existsSync(this.jsonPath)) {
      fs.writeFileSync(this.jsonPath, JSON.stringify({ messages: [], sessions: {} }, null, 2), 'utf8');
    }
  }

  async addTurn(turn: SessionTurn): Promise<void> {
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        INSERT OR REPLACE INTO messages (id, conversation_id, role, content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        turn.id,
        turn.conversationId,
        turn.role,
        turn.content,
        turn.timestamp,
        turn.metadata ? JSON.stringify(turn.metadata) : null
      );
      return;
    }

    const data = this.readJson();
    data.messages.push(turn);
    this.writeJson(data);
  }

  async getTurns(conversationId: string): Promise<SessionTurn[]> {
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        SELECT id, conversation_id, role, content, timestamp, metadata
        FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `);
      const rows = stmt.all(conversationId) as any[];
      return rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        timestamp: r.timestamp,
        metadata: r.metadata ? JSON.parse(r.metadata) : undefined
      }));
    }

    const data = this.readJson();
    return (data.messages as SessionTurn[])
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async saveSession(session: ResumableSessionState): Promise<void> {
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        INSERT OR REPLACE INTO sessions (session_id, conversation_id, model, prompt_hash, last_assistant_message_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        session.sessionId,
        session.conversationId,
        session.model,
        session.promptHash,
        session.lastAssistantMessageId || null,
        session.updatedAt
      );
      return;
    }

    const data = this.readJson();
    data.sessions[session.sessionId] = session;
    this.writeJson(data);
  }

  async getSession(sessionId: string): Promise<ResumableSessionState | null> {
    if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        SELECT session_id, conversation_id, model, prompt_hash, last_assistant_message_id, updated_at
        FROM sessions
        WHERE session_id = ?
      `);
      const row = stmt.get(sessionId) as any;
      if (!row) return null;
      return {
        sessionId: row.session_id,
        conversationId: row.conversation_id,
        model: row.model,
        promptHash: row.prompt_hash,
        lastAssistantMessageId: row.last_assistant_message_id || undefined,
        updatedAt: row.updated_at
      };
    }

    const data = this.readJson();
    return (data.sessions[sessionId] as ResumableSessionState) || null;
  }

  async formatHistoryAsMarkdown(conversationId: string): Promise<string> {
    const turns = await this.getTurns(conversationId);
    if (turns.length === 0) return '';

    const lines: string[] = ['## Conversation History'];
    for (const turn of turns) {
      lines.push(`### ${turn.role === 'user' ? 'User' : 'Assistant'}`);
      lines.push(turn.content.trim());
      lines.push('');
    }
    return lines.join('\n');
  }

  private readJson(): { messages: SessionTurn[]; sessions: Record<string, ResumableSessionState> } {
    try {
      if (!fs.existsSync(this.jsonPath)) {
        return { messages: [], sessions: {} };
      }
      return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
    } catch {
      return { messages: [], sessions: {} };
    }
  }

  private writeJson(data: { messages: SessionTurn[]; sessions: Record<string, ResumableSessionState> }): void {
    fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2), 'utf8');
  }
}
