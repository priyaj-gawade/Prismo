import type { AccountHealthStats } from '../contracts/models.ts';
import { CircuitBreaker } from './circuit-breaker.ts';

export interface PoolAccountEntry {
  id: string; // 'account_1', 'account_2', 'account_3'
  keyRef: string; // 'GEMINI_KEY_1'
  apiKey: string;
  enabled: boolean;
  health: 'healthy' | 'cooldown' | 'exhausted' | 'invalid';
  consecutiveFailures: number;
  cooldownUntil: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestAt: number;
  lastSuccessAt: number;
  lastFailureReason?: string;
}

export class GeminiAccountPool {
  private accounts: PoolAccountEntry[] = [];
  private lastSelectedIdx = -1;

  constructor(apiKeys: string[]) {
    this.accounts = apiKeys.map((key, idx) => ({
      id: `account_${idx + 1}`,
      keyRef: `GEMINI_KEY_${idx + 1}`,
      apiKey: key,
      enabled: Boolean(key && key.trim().length > 0),
      health: 'healthy',
      consecutiveFailures: 0,
      cooldownUntil: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestAt: 0,
      lastSuccessAt: 0
    }));
  }

  getPoolSize(): number {
    return this.accounts.length;
  }

  getAccountsSnapshot(): AccountHealthStats[] {
    return this.accounts.map((a) => ({
      id: a.id,
      keyRef: a.keyRef,
      enabled: a.enabled,
      health: a.health,
      consecutiveFailures: a.consecutiveFailures,
      cooldownUntil: a.cooldownUntil,
      totalRequests: a.totalRequests,
      successfulRequests: a.successfulRequests,
      failedRequests: a.failedRequests,
      lastFailureReason: a.lastFailureReason
    }));
  }

  /**
   * Acquires the next eligible account using least-recently-used among healthy accounts.
   */
  acquireAccount(excludeAccountIds: Set<string> = new Set()): PoolAccountEntry | null {
    const now = Date.now();

    // First, recover any accounts whose cooldown has elapsed
    for (const acc of this.accounts) {
      if (acc.health === 'cooldown' && acc.cooldownUntil <= now) {
        acc.health = 'healthy';
        acc.consecutiveFailures = 0;
      }
    }

    const eligible = this.accounts.filter(
      (a) => a.enabled && a.health === 'healthy' && !excludeAccountIds.has(a.id)
    );

    if (eligible.length === 0) return null;

    // Pick least recently requested to spread load
    eligible.sort((a, b) => a.lastRequestAt - b.lastRequestAt);
    const chosen = eligible[0];
    chosen.totalRequests += 1;
    chosen.lastRequestAt = now;
    return chosen;
  }

  recordSuccess(accountId: string): void {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (!acc) return;
    acc.health = 'healthy';
    acc.consecutiveFailures = 0;
    acc.cooldownUntil = 0;
    acc.successfulRequests += 1;
    acc.lastSuccessAt = Date.now();
  }

  recordFailure(accountId: string, err: unknown, statusCode?: number): { isRetryable: boolean; reason: string } {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (!acc) return { isRetryable: false, reason: 'Unknown account' };

    const analysis = CircuitBreaker.analyzeError(err, statusCode);
    const now = Date.now();

    acc.failedRequests += 1;
    acc.consecutiveFailures += 1;
    acc.lastFailureReason = analysis.reason;

    if (analysis.isAuthFailure) {
      acc.health = 'invalid';
      acc.enabled = false;
    } else if (analysis.isRateLimit) {
      acc.health = 'cooldown';
      acc.cooldownUntil = now + analysis.suggestedCooldownMs * Math.min(acc.consecutiveFailures, 4);
    } else if (analysis.isRetryable) {
      acc.health = 'cooldown';
      acc.cooldownUntil = now + analysis.suggestedCooldownMs;
    } else {
      acc.health = 'cooldown';
      acc.cooldownUntil = now + 5000;
    }

    return {
      isRetryable: analysis.isRetryable,
      reason: analysis.reason
    };
  }

  /**
   * For testing: manually set an account's state
   */
  setAccountCooldown(accountId: string, cooldownMs: number): void {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.health = 'cooldown';
      acc.cooldownUntil = Date.now() + cooldownMs;
    }
  }
}
