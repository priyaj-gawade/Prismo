/**
 * Future Limo Compatibility Contract.
 * 
 * STRICT BOUNDARY:
 * This file contains pure TypeScript contracts only. It has zero dependencies on Limo,
 * zero imports from Limo, and defines the exact message schema and adapter contract
 * that Phase D8.8 will consume.
 */

import type { TargetType, FileChangeRecord } from './engine.ts';

export interface LimoDesignEngineRequest {
  projectId?: string;
  conversationId: string;
  requestType: 'create' | 'refine' | 'export';
  target: TargetType;
  prompt: string;
  designSystemId?: string;
  attachments?: string[];
  dimensions?: { width: number; height: number };
  targetElementId?: string; // Surgical edit targeting data-od-id
}

export interface LimoDesignEngineResponse {
  runId: string;
  projectId: string;
  status: 'succeeded' | 'failed';
  changedFiles: FileChangeRecord[];
  allFiles: string[];
  previewUrl: string;
  exportPath?: string;
  diagnostics: {
    provider: string;
    model: string;
    accountId: string;
    durationMs: number;
    fallbackOccurred: boolean;
    stockProvidersUsed: string[];
    toolsInvoked?: string[];
  };
  error?: string;
}

export type LimoStreamEventType = 
  | 'start'
  | 'text_delta'
  | 'tool_call'
  | 'asset_downloaded'
  | 'file_written'
  | 'preview_ready'
  | 'complete'
  | 'error';

export interface LimoStreamEvent {
  type: LimoStreamEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface LimoDesignEngineAdapter {
  execute(request: LimoDesignEngineRequest): Promise<LimoDesignEngineResponse>;
  executeStream(request: LimoDesignEngineRequest, onEvent: (event: LimoStreamEvent) => void): Promise<LimoDesignEngineResponse>;
  getPreviewUrl(projectId: string): Promise<string>;
  exportProject(projectId: string, format: 'png' | 'jpeg', dimensions?: { width: number; height: number }): Promise<string>;
}
