import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { StandaloneDesignEngine } from '../../core/index.ts';

export async function runEmbeddedEngineModeTest(): Promise<boolean> {
  console.log('--- Testing Embedded Headless Engine Mode (No HTTP Server, No Auto-Export) ---');

  const testDir = path.resolve('d8.7-test-embedded-data');
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // 1. Instantiate engine in headless host mode
    const engine = new StandaloneDesignEngine({
      dataDir: testDir,
      geminiKeys: [],
      enablePreviewServer: false,
      autoExportPng: false
    });

    // 2. Create project
    const project = await engine.createProject(
      'Embedded Headless Poster',
      'poster',
      'A technical poster for embedded headless execution',
      'modern-dark'
    );

    assert.ok(project.id.startsWith('proj_'), 'Project ID must be generated');
    assert.strictEqual(project.target, 'poster', 'Project target must be poster');

    // 3. Verify starter artifacts generated in workspace
    const artifacts = await engine.getArtifacts(project.id);
    const fileNames = artifacts.map((a) => a.path);
    assert.ok(fileNames.includes('index.html'), 'Starter index.html must exist');
    assert.ok(fileNames.includes('DESIGN.md'), 'Starter DESIGN.md must exist');
    assert.ok(fileNames.includes('tokens.css'), 'Starter tokens.css must exist');
    assert.ok(fileNames.includes('styles.css'), 'Starter styles.css must exist');
    console.log('  [PASS] Headless workspace created starter artifacts without network or UI dependencies');

    // 4. Verify preview() behavior without preview server
    const preview = await engine.preview(project.id);
    assert.strictEqual(preview.port, 0, 'Headless preview port must be 0 (no network socket bound)');
    assert.ok(preview.url.startsWith('file:'), `Preview URL must be a file URL, got ${preview.url}`);
    assert.strictEqual(preview.projectRoot, project.rootPath, 'Preview projectRoot must match project root');

    const resolvedFile = fileURLToPath(preview.url);
    assert.ok(fs.existsSync(resolvedFile), `Local preview file must exist at ${resolvedFile}`);
    console.log('  [PASS] Preview returns file:// URL with port 0 when preview server is disabled');

    // 5. Verify inspect contract
    const inspection = await engine.inspect(project.id);
    assert.strictEqual(inspection.metadata.id, project.id);
    assert.ok(inspection.files.length >= 4, 'Inspection files must include all starter artifacts');
    console.log('  [PASS] Headless inspection contract verified');

    // 6. Shutdown engine cleanly
    await engine.shutdown();
    console.log('  [PASS] Headless engine shutdown cleanly without dangling sockets');

    console.log('Embedded headless engine mode tests PASSED!\n');
    return true;
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('embedded_engine_mode.test.ts')) {
  runEmbeddedEngineModeTest().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
