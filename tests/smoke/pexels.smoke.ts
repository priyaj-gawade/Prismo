import path from 'node:path';
import fs from 'node:fs';
import { getEngineConfig } from '../../core/config/env.ts';
import { PexelsAdapter } from '../../core/assets/pexels.ts';

export async function runPexelsSmoke(): Promise<boolean> {
  console.log('--- Real API Smoke Test: Pexels ---');
  const config = getEngineConfig();
  if (config.pexelsKeys.length === 0) {
    console.warn('  [SKIP] No Pexels keys available in .env');
    return true;
  }

  const adapter = new PexelsAdapter(config.pexelsKeys);
  const searchResult = await adapter.search({ query: 'modern architecture', limit: 2 });
  if (searchResult.assets.length === 0) {
    throw new Error('Pexels search returned 0 assets for query: modern architecture');
  }

  console.log(`  [PASS] Pexels returned ${searchResult.assets.length} photos`);
  const first = searchResult.assets[0];
  console.log(`  Photo 1: ${first.title} by ${first.author} (${first.width}x${first.height})`);

  const tmpDir = path.resolve('d8.7-smoke-tmp-pexels');
  fs.mkdirSync(tmpDir, { recursive: true });
  const downloadedPath = await adapter.downloadAsset(first, tmpDir);
  if (!fs.existsSync(downloadedPath) || fs.statSync(downloadedPath).size === 0) {
    throw new Error('Pexels asset download failed or produced empty file');
  }

  console.log(`  [PASS] Downloaded asset to: ${downloadedPath} (${fs.statSync(downloadedPath).size} bytes)`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('pexels.smoke.ts')) {
  runPexelsSmoke().catch(console.error);
}
