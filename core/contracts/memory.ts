/**
 * Memory subsystem contracts: short-term sessions and long-term Markdown buckets.
 */

export type MemoryBucket = 'profile' | 'user' | 'feedback' | 'project' | 'reference' | 'rule';

export interface MemoryEntry {
  id: string;
  bucket: MemoryBucket;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface SessionTurn {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ResumableSessionState {
  sessionId: string;
  conversationId: string;
  model: string;
  promptHash: string;
  lastAssistantMessageId?: string;
  updatedAt: number;
}

export interface MemoryStore {
  saveEntry(bucket: MemoryBucket, slug: string, title: string, content: string, tags?: string[]): Promise<MemoryEntry>;
  getEntry(bucket: MemoryBucket, slug: string): Promise<MemoryEntry | null>;
  listEntries(bucket?: MemoryBucket): Promise<MemoryEntry[]>;
  deleteEntry(bucket: MemoryBucket, slug: string): Promise<boolean>;
  readActiveMemory(): Promise<string>;
}
