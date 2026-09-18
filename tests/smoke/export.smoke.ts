import path from 'node:path';
import fs from 'node:fs';
import { getEngineConfig } from '../../core/config/env.ts';
import { StandaloneDesignEngine } from '../../core/engine.ts';

export async function runExportSmoke(): Promise<boolean> {
  console.log('--- Real API Smoke Test: Headless Browser PNG & JPEG Export ---');
  const config = getEngineConfig();
  const testDataDir = path.resolve('d8.7-smoke-export-data');
  fs.mkdirSync(testDataDir, { recursive: true });

  const engine = new StandaloneDesignEngine({
    dataDir: testDataDir,
    previewPort: 5189,
    geminiKeys: config.geminiKeys
  });

  try {
    const project = await engine.createProject('Export Test Project', 'poster', 'A bold typographic social poster', 'modern-dark');

    // 1. Export PNG (strictly 3:4 at 1080x1440)
    const pngResult = await engine.export(project.id, {
      format: 'png',
      width: 1080,
      height: 1440
    });

    if (!fs.existsSync(pngResult.filePath) || pngResult.fileSize === 0) {
      throw new Error(`PNG export failed: ${pngResult.filePath}`);
    }
    if (!pngResult.filePath.includes(path.join('exports', project.id))) {
      throw new Error(`PNG export not inside exports/${project.id}: ${pngResult.filePath}`);
    }
    console.log(`  [PASS] PNG Exported: ${pngResult.filePath} (${pngResult.width}x${pngResult.height}, ${pngResult.fileSize} bytes in ${pngResult.durationMs}ms)`);

    // 2. Export JPEG (strictly 3:4 at 1080x1440)
    const jpgResult = await engine.export(project.id, {
      format: 'jpeg',
      width: 1080,
      height: 1440
    });

    if (!fs.existsSync(jpgResult.filePath) || jpgResult.fileSize === 0) {
      throw new Error(`JPEG export failed: ${jpgResult.filePath}`);
    }
    if (!jpgResult.filePath.includes(path.join('exports', project.id))) {
      throw new Error(`JPEG export not inside exports/${project.id}: ${jpgResult.filePath}`);
    }
    console.log(`  [PASS] JPEG Exported: ${jpgResult.filePath} (${jpgResult.width}x${jpgResult.height}, ${jpgResult.fileSize} bytes in ${jpgResult.durationMs}ms)`);

    return true;
  } finally {
    await engine.shutdown();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith('export.smoke.ts')) {
  runExportSmoke().catch(console.error);
}
