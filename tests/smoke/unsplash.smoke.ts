import { getEngineConfig } from '../../core/config/env.ts';
import { UnsplashAdapter } from '../../core/assets/unsplash.ts';

export async function runUnsplashSmoke(): Promise<boolean> {
  console.log('--- Real API Smoke Test: Unsplash ---');
  const config = getEngineConfig();
  if (config.unsplashKeys.length === 0) {
    console.warn('  [SKIP] No Unsplash keys available in .env');
    return true;
  }

  const adapter = new UnsplashAdapter(config.unsplashKeys);
  const searchResult = await adapter.search({ query: 'minimalist design', limit: 2 });
  if (searchResult.assets.length === 0) {
    throw new Error('Unsplash search returned 0 assets for query: minimalist design');
  }

  console.log(`  [PASS] Unsplash returned ${searchResult.assets.length} photos`);
  const first = searchResult.assets[0];
  console.log(`  Photo 1: ${first.title} by ${first.author} (${first.width}x${first.height})`);
  console.log(`  Attribution: ${first.attribution}`);
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('unsplash.smoke.ts')) {
  runUnsplashSmoke().catch(console.error);
}
