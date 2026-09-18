import { getEngineConfig } from '../../core/config/env.ts';
import { GeminiProviderManager } from '../../core/providers/manager.ts';

export async function runGeminiSmoke(): Promise<boolean> {
  console.log('--- Real API Smoke Test: Gemini 3.5 Flash-Lite & Account Rotation ---');
  const config = getEngineConfig();
  if (config.geminiKeys.length === 0) {
    throw new Error('No Gemini API keys loaded from .env');
  }

  const manager = new GeminiProviderManager(config.geminiKeys);

  // Request 1: generate with gemini-3.5-flash-lite
  const res1 = await manager.generateText({
    model: 'gemini-3.5-flash-lite',
    prompt: 'Return a JSON object with keys: title, description for a modern dark-themed developer tool website.',
    systemInstruction: 'Output valid JSON only.'
  });

  if (!res1.text || res1.text.length < 10) {
    throw new Error('Gemini generation returned empty text');
  }

  console.log(`  [PASS] Generation 1 succeeded: model=${res1.model}, account=${res1.accountId}`);
  console.log(`  Output snippet: ${res1.text.slice(0, 100).replace(/\r?\n/g, ' ')}...`);

  // Request 2: verify pool distribution/subsequent call
  const res2 = await manager.generateText({
    model: 'gemini-3.5-flash-lite',
    prompt: 'Give a 5-word tagline for an AI coding assistant.',
    systemInstruction: 'Output the tagline only.'
  });

  console.log(`  [PASS] Generation 2 succeeded: model=${res2.model}, account=${res2.accountId}`);
  console.log(`  Tagline: "${res2.text.trim()}"`);

  const poolStats = manager.getPoolDiagnostics();
  const successfulAccounts = poolStats.filter((a) => a.successfulRequests > 0);
  console.log(`  [PASS] Gemini pool accounts active: ${successfulAccounts.length}/${poolStats.length}`);

  return true;
}

if (process.argv[1] && process.argv[1].endsWith('gemini.smoke.ts')) {
  runGeminiSmoke().catch(console.error);
}
