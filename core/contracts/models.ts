/**
 * Model and Provider Types for Gemini-exclusive D8.7 engine.
 */

export type AllowedGeminiModel = 'gemini-3.5-flash-lite' | 'gemini-3.1-flash-lite';

export interface FunctionCallPart {
  name: string;
  args: Record<string, unknown>;
  thought_signature?: string;
  [key: string]: unknown;
}

export interface FunctionResponsePart {
  name: string;
  response: Record<string, unknown>;
}

export interface ModelMessagePart {
  text?: string;
  functionCall?: FunctionCallPart;
  functionResponse?: FunctionResponsePart;
  thought_signature?: string;
  thought?: unknown;
  [key: string]: unknown;
}

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content?: string;
  parts?: ModelMessagePart[];
}

export interface FunctionParameterProperty {
  type: string;
  description?: string;
  enum?: readonly string[] | string[];
}

export interface FunctionParametersSchema {
  type: string;
  properties: Record<string, FunctionParameterProperty>;
  required?: readonly string[] | string[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: FunctionParametersSchema;
}

export interface ToolDefinition {
  functionDeclarations: readonly FunctionDeclaration[] | FunctionDeclaration[];
}

export interface ModelGenerateOptions {
  model?: AllowedGeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  responseSchema?: Record<string, unknown>;
  responseMimeType?: string;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface ProviderExecutionDiagnostics {
  model: string;
  accountId: string;
  durationMs: number;
  fallbackOccurred: boolean;
  attemptsCount: number;
  attemptedAccounts: string[];
}

export interface ModelProvider {
  generate(
    messages: ModelMessage[],
    options?: ModelGenerateOptions
  ): Promise<{ result: ModelGenerateResult; diagnostics: ProviderExecutionDiagnostics }>;

  generateText?(options: {
    model?: string;
    systemInstruction?: string;
    prompt: string;
    signal?: AbortSignal;
  }): Promise<{ text: string; model: string; accountId: string }>;
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
  functionCalls?: FunctionCallPart[];
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
