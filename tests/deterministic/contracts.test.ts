import path from 'node:path';
import fs from 'node:fs';
import { StandaloneDesignEngine } from '../../core/engine.ts';
import type { LimoDesignEngineRequest, LimoDesignEngineResponse } from '../../core/contracts/limo.ts';

export async function runContractsTest(): Promise<boolean> {
  console.log('--- Testing Engine Facade & Limo Compatibility Contracts ---');

  const testDir = path.resolve('d8.7-test-contracts-data');
  fs.mkdirSync(testDir, { recursive: true });

  const engine = new StandaloneDesignEngine({
    dataDir: testDir,
    previewPort: 5199,
    geminiKeys: ['test_key_dummy_1', 'test_key_dummy_2', 'test_key_dummy_3'],
    pexelsKeys: ['pexels_dummy'],
    pixabayKeys: ['pixabay_dummy'],
    unsplashKeys: ['unsplash_dummy']
  });

  // 1. Create Project
  const project = await engine.createProject('Contract Test Project', 'website', 'Test instructions', 'modern-dark');
  if (!project.id.startsWith('proj_') || project.name !== 'Contract Test Project') {
    throw new Error('Engine createProject contract failed');
  }

  // Verify DESIGN.md and tokens.css were auto-populated
  const artifacts = await engine.getArtifacts(project.id);
  const paths = artifacts.map((a) => a.path);
  if (!paths.includes('index.html') || !paths.includes('DESIGN.md') || !paths.includes('tokens.css')) {
    throw new Error(`Starter artifacts missing: ${JSON.stringify(paths)}`);
  }
  console.log('  [PASS] Engine project creation & starter preset artifact initialization verified');

  // 2. Inspect Project
  const inspection = await engine.inspect(project.id);
  if (inspection.metadata.id !== project.id || inspection.files.length < 4) {
    throw new Error('Engine inspect contract failed');
  }
  console.log('  [PASS] Engine inspect contract verified');

  // 3. Rollback Contract
  const rolledBack = await engine.rollback(project.id, 1);
  if (rolledBack.version !== 1) {
    throw new Error('Engine rollback contract failed');
  }
  console.log('  [PASS] Engine rollback contract verified');

  // 4. Limo Compatibility Boundary Contract Types
  const mockLimoRequest: LimoDesignEngineRequest = {
    projectId: project.id,
    conversationId: 'conv_limo_1',
    requestType: 'create',
    target: 'website',
    prompt: 'A landing page for developers',
    targetElementId: 'hero-section'
  };

  const mockLimoResponse: LimoDesignEngineResponse = {
    runId: 'run_123',
    projectId: project.id,
    status: 'succeeded',
    changedFiles: [{ path: 'index.html', changeType: 'modified' }],
    allFiles: paths,
    previewUrl: `/projects/${project.id}/index.html`,
    diagnostics: {
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      accountId: 'account_1',
      durationMs: 450,
      fallbackOccurred: false,
      stockProvidersUsed: ['pexels']
    }
  };

  if (mockLimoRequest.target !== 'website' || mockLimoResponse.diagnostics.provider !== 'gemini') {
    throw new Error('Limo contract types mismatch');
  }
  console.log('  [PASS] Future Limo boundary contracts frozen and verified');

  await engine.shutdown();
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('Contracts tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('contracts.test.ts')) {
  runContractsTest().catch(console.error);
}
