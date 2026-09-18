import { validateModelId, UnsupportedModelError } from '../../core/providers/allowlist.ts';
import { GeminiAccountPool } from '../../core/providers/pool.ts';
import { CircuitBreaker } from '../../core/providers/circuit-breaker.ts';

export function runPoolTest(): boolean {
  console.log('--- Testing Gemini Model Allowlist, Pool & Circuit Breaker ---');

  // Test 1: Strict Model Allowlist
  const valid1 = validateModelId('gemini-3.5-flash-lite');
  const valid2 = validateModelId('gemini-3.1-flash-lite');
  if (valid1 !== 'gemini-3.5-flash-lite' || valid2 !== 'gemini-3.1-flash-lite') {
    throw new Error('Valid models failed check');
  }
  console.log('  [PASS] Allowed models accepted');

  let rejected = false;
  try {
    validateModelId('gemini-1.5-pro');
  } catch (err) {
    if (err instanceof UnsupportedModelError) rejected = true;
  }
  if (!rejected) throw new Error('Failed to reject unallowed model gemini-1.5-pro');

  rejected = false;
  try {
    validateModelId('gpt-4o');
  } catch (err) {
    if (err instanceof UnsupportedModelError) rejected = true;
  }
  if (!rejected) throw new Error('Failed to reject unallowed model gpt-4o');
  console.log('  [PASS] Unallowed models strictly rejected with UnsupportedModelError');

  // Test 2: Pool Rotation & Acquisition
  const pool = new GeminiAccountPool(['mock_key_1', 'mock_key_2', 'mock_key_3']);
  if (pool.getPoolSize() !== 3) throw new Error('Expected 3 pool accounts');

  const acc1 = pool.acquireAccount();
  const acc2 = pool.acquireAccount();
  const acc3 = pool.acquireAccount();

  if (!acc1 || !acc2 || !acc3) throw new Error('Failed to acquire accounts');
  if (acc1.id === acc2.id || acc2.id === acc3.id) {
    throw new Error(`Accounts should cycle: got ${acc1.id}, ${acc2.id}, ${acc3.id}`);
  }
  console.log('  [PASS] Account acquisition distributed across all 3 pool accounts');

  // Test 3: Circuit Breaker on 429 Rate Limit
  const failureAnalysis = CircuitBreaker.analyzeError('Resource has been exhausted (e.g. check quota)', 429);
  if (!failureAnalysis.isRetryable || !failureAnalysis.isRateLimit) {
    throw new Error('Failed to classify HTTP 429 as retryable rate limit');
  }
  console.log('  [PASS] Circuit breaker accurately classifies HTTP 429');

  // Test 4: Cooldown & Failover
  pool.recordFailure(acc1.id, new Error('Rate limit exceeded'), 429);
  const snap1 = pool.getAccountsSnapshot().find((a) => a.id === acc1.id);
  if (snap1?.health !== 'cooldown') {
    throw new Error(`Expected account 1 to be in cooldown, got: ${snap1?.health}`);
  }

  // Next acquisition must skip account 1
  const failoverAcc = pool.acquireAccount();
  if (!failoverAcc || failoverAcc.id === acc1.id) {
    throw new Error(`Failover failed: acquired cooled down account ${failoverAcc?.id}`);
  }
  console.log(`  [PASS] Account 1 placed in cooldown; automatic failover selected ${failoverAcc.id}`);

  // Test 5: Recovery on Success
  pool.recordSuccess(failoverAcc.id);
  const snap2 = pool.getAccountsSnapshot().find((a) => a.id === failoverAcc.id);
  if (snap2?.health !== 'healthy' || snap2.successfulRequests !== 1) {
    throw new Error('Failed to record success on failover account');
  }
  console.log('  [PASS] Success correctly recorded and stats tracked');

  console.log('Gemini Pool tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('pool.test.ts')) {
  runPoolTest().catch(console.error);
}
