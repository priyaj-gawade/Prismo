/**
 * Model and Provider Types for Gemini-exclusive D8.7 engine.
 */

export type AllowedGeminiModel = 'gemini-3.5-flash-lite' | 'gemini-3.1-flash-lite';

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModelGenerateOptions {
  model?: AllowedGeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  responseSchema?: Record<string, unknown>;
  responseMimeType?: string;
}

export interface ModelUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface ModelGenerateResult {
  text: string;
  model: AllowedGeminiModel;
  accountId: string; // Safe identifier (e.g. 'account_1')
  usage?: ModelUsage;
  finishReason?: string;
}

export interface AccountHealthStats {
  id: string;
  keyRef: string;
  enabled: boolean;
  health: 'healthy' | 'cooldown' | 'exhausted' | 'invalid';
  consecutiveFailures: number;
  cooldownUntil: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastFailureReason?: string;
}
