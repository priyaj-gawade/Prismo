import { getEngineConfig, redactSecrets, parseEnvContent } from '../../core/config/env.ts';

export function runEnvTest(): boolean {
  console.log('--- Testing Environment & Secret Redaction ---');

  // Test 1: Block parsing for Unsplash
  const mockEnv = `
GEMINI_KEY_1=gemini_test_1
PEXELS_KEY_1=pexels_test_1
PIXABAY_KEY_1=pixabay_test_1
UNSPLASH_KEY_1 = {
    Application ID
    9999
    Access Key
    mock_unsplash_key_123
    Secret key
    mock_secret_456
}
`;
  const parsed = parseEnvContent(mockEnv);
  if (parsed.UNSPLASH_KEY_1 !== 'mock_unsplash_key_123') {
    throw new Error(`Failed to parse Unsplash block. Got: ${parsed.UNSPLASH_KEY_1}`);
  }
  console.log('  [PASS] Unsplash block parsing verified');

  // Test 2: Parent .env loading
  const config = getEngineConfig();
  console.log(`  Loaded Gemini keys: ${config.geminiKeys.length}`);
  console.log(`  Loaded Pexels keys: ${config.pexelsKeys.length}`);
  console.log(`  Loaded Pixabay keys: ${config.pixabayKeys.length}`);
  console.log(`  Loaded Unsplash keys: ${config.unsplashKeys.length}`);

  if (config.geminiKeys.length < 3) {
    throw new Error(`Expected at least 3 Gemini keys from parent .env, got ${config.geminiKeys.length}`);
  }
  if (config.pexelsKeys.length < 3) {
    throw new Error(`Expected at least 3 Pexels keys from parent .env, got ${config.pexelsKeys.length}`);
  }
  if (config.pixabayKeys.length < 3) {
    throw new Error(`Expected at least 3 Pixabay keys from parent .env, got ${config.pixabayKeys.length}`);
  }
  if (config.unsplashKeys.length < 1) {
    throw new Error(`Expected at least 1 Unsplash key from parent .env, got ${config.unsplashKeys.length}`);
  }
  console.log('  [PASS] Real parent .env loading verified');

  // Test 3: Secret Redaction
  const sampleKey = config.geminiKeys[0];
  const logged = `Calling endpoint with key=${sampleKey} and extra`;
  const sanitized = redactSecrets(logged, config.geminiKeys);
  if (sanitized.includes(sampleKey)) {
    throw new Error(`Redaction failed: raw key still visible in '${sanitized}'`);
  }
  if (!sanitized.includes('[REDACTED]')) {
    throw new Error(`Redaction marker missing in '${sanitized}'`);
  }
  console.log('  [PASS] Secret redaction verified');

  console.log('Environment tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('env.test.ts')) {
  runEnvTest().catch(console.error);
}

