export interface FailureAnalysis {
  isRetryable: boolean;
  isRateLimit: boolean;
  isAuthFailure: boolean;
  suggestedCooldownMs: number;
  reason: string;
}

export class CircuitBreaker {
  static analyzeError(err: unknown, statusCode?: number): FailureAnalysis {
    const message = err instanceof Error ? err.message : String(err);
    const code = statusCode || 0;

    // 429: Rate Limit
    if (code === 429 || message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate limit')) {
      return {
        isRetryable: true,
        isRateLimit: true,
        isAuthFailure: false,
        suggestedCooldownMs: 30000, // 30s cooldown
        reason: 'Rate limit or quota reached (HTTP 429)'
      };
    }

    // 401 / 403: Bad / expired key
    if (code === 401 || code === 403 || message.toLowerCase().includes('api key not valid') || message.toLowerCase().includes('permission denied')) {
      return {
        isRetryable: false,
        isRateLimit: false,
        isAuthFailure: true,
        suggestedCooldownMs: 3600000, // 1 hour disable
        reason: 'Invalid API key or unauthorized (HTTP 401/403)'
      };
    }

    // 5xx: Transient server error
    if (code >= 500 || message.includes('500') || message.includes('503') || message.toLowerCase().includes('overloaded')) {
      return {
        isRetryable: true,
        isRateLimit: false,
        isAuthFailure: false,
        suggestedCooldownMs: 10000, // 10s cooldown
        reason: `Transient server error (HTTP ${code || '5xx'})`
      };
    }

    // Network timeout / connection reset
    if (message.includes('fetch failed') || message.includes('ECONNRESET') || message.includes('ETIMEDOUT') || message.includes('timeout')) {
      return {
        isRetryable: true,
        isRateLimit: false,
        isAuthFailure: false,
        suggestedCooldownMs: 5000, // 5s cooldown
        reason: `Network transport failure: ${message}`
      };
    }

    return {
      isRetryable: false,
      isRateLimit: false,
      isAuthFailure: false,
      suggestedCooldownMs: 0,
      reason: message
    };
  }
}
