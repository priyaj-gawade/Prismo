import type {
  AllowedGeminiModel,
  ModelMessage,
  ModelGenerateOptions,
  ModelGenerateResult,
  AccountHealthStats,
  ModelProvider,
  ProviderExecutionDiagnostics
} from '../contracts/models.ts';
import { GeminiAccountPool } from './pool.ts';
import { GeminiApiClient } from './gemini.ts';
import { validateModelId } from './allowlist.ts';

export type { ProviderExecutionDiagnostics };

export class GeminiProviderManager implements ModelProvider {
  private pool: GeminiAccountPool;
  private client: GeminiApiClient;
  private defaultModel: AllowedGeminiModel = 'gemini-3.5-flash-lite';
  private fallbackModel: AllowedGeminiModel = 'gemini-3.1-flash-lite';

  constructor(
    apiKeysOrOptions: string[] | { apiKeys: string[]; defaultModel?: AllowedGeminiModel },
    defaultModel: AllowedGeminiModel = 'gemini-3.5-flash-lite'
  ) {
    const keys = Array.isArray(apiKeysOrOptions) ? apiKeysOrOptions : (apiKeysOrOptions?.apiKeys || []);
    const model = Array.isArray(apiKeysOrOptions) ? defaultModel : (apiKeysOrOptions?.defaultModel || defaultModel);

    this.pool = new GeminiAccountPool(keys);
    this.client = new GeminiApiClient();
    this.defaultModel = validateModelId(model);
  }

  getPool(): GeminiAccountPool {
    return this.pool;
  }

  getHealthStats(): AccountHealthStats[] {
    return this.pool.getAccountsSnapshot();
  }

  async generate(
    messages: ModelMessage[],
    options: ModelGenerateOptions = {}
  ): Promise<{ result: ModelGenerateResult; diagnostics: ProviderExecutionDiagnostics }> {
    const requestedModel = options.model ? validateModelId(options.model) : this.defaultModel;
    const start = Date.now();

    const attemptedAccounts: string[] = [];
    const excludedAccounts = new Set<string>();
    const maxAttempts = Math.min(this.pool.getPoolSize(), 3);

    let lastError: unknown = null;
    let fallbackOccurred = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const account = this.pool.acquireAccount(excludedAccounts);
      if (!account) {
        throw new Error(
          `All Gemini accounts in the pool are currently exhausted, on cooldown, or disabled. ` +
          `Attempted: [${attemptedAccounts.join(', ')}]. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
        );
      }

      attemptedAccounts.push(account.id);
      excludedAccounts.add(account.id);

      if (attempt > 1) {
        fallbackOccurred = true;
      }

      try {
        const result = await this.client.generateContent(
          account.apiKey,
          requestedModel,
          messages,
          options
        );

        this.pool.recordSuccess(account.id);
        result.accountId = account.id;

        const durationMs = Date.now() - start;
        return {
          result,
          diagnostics: {
            model: requestedModel,
            accountId: account.id,
            durationMs,
            fallbackOccurred,
            attemptsCount: attempt,
            attemptedAccounts
          }
        };
      } catch (err: unknown) {
        lastError = err;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        const failure = this.pool.recordFailure(account.id, err, statusCode);

        console.warn(`[GeminiPool] Account ${account.id} failed (attempt ${attempt}/${maxAttempts}): ${failure.reason}`);

        if (!failure.isRetryable && !failure.reason.includes('Rate limit')) {
          // If non-retryable fatal error (e.g. malformed prompt schema), fail fast
          throw err;
        }
      }
    }

    throw new Error(
      `Gemini generation failed after ${maxAttempts} attempts across accounts: [${attemptedAccounts.join(', ')}]. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }

  async generateText(options: {
    model?: string;
    systemInstruction?: string;
    prompt: string;
    signal?: AbortSignal;
  }): Promise<{ text: string; model: string; accountId: string }> {
    if (options.signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }
    const messages: ModelMessage[] = [
      { role: 'user', content: options.prompt }
    ];
    const genOptions: ModelGenerateOptions = {
      model: options.model as any,
      systemInstruction: options.systemInstruction,
      signal: options.signal
    };
    const { result, diagnostics } = await this.generate(messages, genOptions);
    return {
      text: result.text,
      model: diagnostics.model,
      accountId: diagnostics.accountId
    };
  }

  getPoolDiagnostics(): AccountHealthStats[] {
    return this.pool.getAccountsSnapshot();
  }
}
