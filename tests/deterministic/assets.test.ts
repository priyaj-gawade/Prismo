import fs from 'node:fs';
import path from 'node:path';
import { LocalAssetAdapter } from '../../core/assets/local.ts';
import { UnsplashAdapter } from '../../core/assets/unsplash.ts';
import { AssetProviderManager } from '../../core/assets/manager.ts';

export async function runAssetsTest(): Promise<boolean> {
  console.log('--- Testing Asset Provider Models & Zero-Fake-Data Enforcement ---');

  // Test 1: Unsplash without keys MUST fail cleanly and NEVER return fake data
  const emptyUnsplash = new UnsplashAdapter([]);
  let caught = false;
  try {
    await emptyUnsplash.search({ query: 'nature' });
  } catch (err: unknown) {
    caught = true;
    if (!(err instanceof Error) || !err.message.includes('No Unsplash API keys configured')) {
      throw new Error(`Unexpected error message: ${(err as Error).message}`);
    }
  }
  if (!caught) {
    throw new Error('Unsplash adapter returned data when keys were missing! Fake data is strictly forbidden.');
  }
  console.log('  [PASS] Missing keys strictly produce clean provider error (zero fake data)');

  // Test 2: Local Asset Adapter
  const testAssetsDir = path.resolve('d8.7-test-assets');
  fs.mkdirSync(testAssetsDir, { recursive: true });
  fs.writeFileSync(path.join(testAssetsDir, 'hero_banner.jpg'), 'fake jpg content');
  fs.writeFileSync(path.join(testAssetsDir, 'logo.svg'), '<svg></svg>');

  const localAdapter = new LocalAssetAdapter(testAssetsDir);
  const localResults = await localAdapter.search({ query: 'hero' });
  if (localResults.assets.length === 0 || !localResults.assets[0].title.includes('hero')) {
    throw new Error('Local asset search failed to find hero_banner.jpg');
  }
  console.log('  [PASS] Local asset scanning and search verified');

  // Test 3: Asset Provider Manager with fallback
  const manager = new AssetProviderManager({
    pexelsKeys: [],
    pixabayKeys: [],
    unsplashKeys: [],
    localAssetsDir: testAssetsDir,
    preferredOrder: ['pexels', 'pixabay', 'unsplash', 'local']
  });

  const fallbackResult = await manager.search({ query: 'logo' });
  if (fallbackResult.assets.length === 0 || fallbackResult.assets[0].provider !== 'local') {
    throw new Error(`Fallback to local assets failed. Got: ${JSON.stringify(fallbackResult)}`);
  }
  console.log('  [PASS] Multi-provider search fallback to local verified');

  // Clean up
  fs.rmSync(testAssetsDir, { recursive: true, force: true });
  console.log('Asset tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('assets.test.ts')) {
  runAssetsTest().catch(console.error);
}
