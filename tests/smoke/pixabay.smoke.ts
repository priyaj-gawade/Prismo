import path from 'node:path';
import fs from 'node:fs';
import { getEngineConfig } from '../../core/config/env.ts';
import { PixabayAdapter } from '../../core/assets/pixabay.ts';

export async function runPixabaySmoke(): Promise<boolean> {
  console.log('--- Real API Smoke Test: Pixabay ---');
  const config = getEngineConfig();
  if (config.pixabayKeys.length === 0) {
    console.warn('  [SKIP] No Pixabay keys available in .env');
    return true;
  }

  const adapter = new PixabayAdapter(config.pixabayKeys);
  const searchResult = await adapter.search({ query: 'minimalist office', limit: 2 });
  if (searchResult.assets.length === 0) {
    throw new Error('Pixabay search returned 0 assets for query: minimalist office');
  }

  console.log(`  [PASS] Pixabay returned ${searchResult.assets.length} photos`);
  const first = searchResult.assets[0];
  console.log(`  Photo 1: ${first.title} by ${first.author} (${first.width}x${first.height})`);

  const tmpDir = path.resolve('d8.7-smoke-tmp-pixabay');
  fs.mkdirSync(tmpDir, { recursive: true });
  const downloadedPath = await adapter.downloadAsset(first, tmpDir);
  if (!fs.existsSync(downloadedPath) || fs.statSync(downloadedPath).size === 0) {
    throw new Error('Pixabay asset download failed or produced empty file');
  }

  console.log(`  [PASS] Downloaded asset to: ${downloadedPath} (${fs.statSync(downloadedPath).size} bytes)`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('pixabay.smoke.ts')) {
  runPixabaySmoke().catch(console.error);
}
