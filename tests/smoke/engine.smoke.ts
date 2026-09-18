import path from 'node:path';
import fs from 'node:fs';
import { getEngineConfig } from '../../core/config/env.ts';
import { StandaloneDesignEngine } from '../../core/engine.ts';

export async function runEngineSmoke(): Promise<boolean> {
  console.log('--- Real Engine Smoke Test: Generation, Surgical Refinement & Versioning ---');
  const config = getEngineConfig();
  const testDataDir = path.resolve('d8.7-smoke-engine-data');
  fs.mkdirSync(testDataDir, { recursive: true });

  const engine = new StandaloneDesignEngine({
    dataDir: testDataDir,
    previewPort: 5188,
    geminiKeys: config.geminiKeys,
    pexelsKeys: config.pexelsKeys,
    pixabayKeys: config.pixabayKeys,
    unsplashKeys: config.unsplashKeys
  });

  try {
    // 1. Create Project
    const project = await engine.createProject(
      'Smoke Test Tech SaaS',
      'landing-page',
      'Focus on high-speed developer experience',
      'modern-dark'
    );
    console.log(`  [PASS] Created project: ${project.id} (target: ${project.target}, version: v${project.version})`);

    // 2. Full Generation
    console.log('  Triggering real LLM generation for SaaS landing page...');
    const genResult = await engine.generate({
      projectId: project.id,
      conversationId: 'smoke_conv_1',
      prompt: 'Build a high-conversion landing page with nav, hero, features grid, metrics, and cta. Output index.html, styles.css, script.js with data-od-id attributes.'
    });

    if (genResult.status !== 'succeeded') {
      throw new Error(`Generation failed: ${genResult.error}`);
    }
    console.log(`  [PASS] Generation succeeded: model=${genResult.diagnostics.model} (${genResult.diagnostics.accountId}) in ${genResult.diagnostics.durationMs}ms`);
    console.log(`  Changed files: ${genResult.changedFiles.map((f) => f.path).join(', ')}`);

    const html = fs.readFileSync(path.join(project.rootPath, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(project.rootPath, 'styles.css'), 'utf8');

    if (!html.includes('data-od-id=') || html.length < 300) {
      throw new Error('Generated HTML missing data-od-id attributes or incomplete');
    }
    console.log(`  [PASS] Generated HTML length: ${html.length} bytes with data-od-id tags verified`);

    // 3. Surgical Section Refinement
    console.log('  Triggering surgical refinement targeting hero section...');
    const refineResult = await engine.refine({
      projectId: project.id,
      conversationId: 'smoke_conv_1',
      targetElementId: 'hero-section',
      instruction: 'Update the hero headline to "Build 10x Faster with Antigravity" and add a secondary outline button.'
    });

    if (refineResult.status !== 'succeeded') {
      throw new Error(`Refinement failed: ${refineResult.error}`);
    }
    console.log(`  [PASS] Surgical refinement succeeded: model=${refineResult.diagnostics.model} (${refineResult.diagnostics.accountId})`);

    // 4. Verify Versioning
    const inspection = await engine.inspect(project.id);
    console.log(`  [PASS] Version count: ${inspection.versions}, current version: v${inspection.metadata.version}`);
    if (inspection.metadata.version < 2) {
      throw new Error('Project version was not bumped after generation/refinement');
    }

    // 5. Rollback
    console.log('  Rolling back to version 1...');
    const rolledBack = await engine.rollback(project.id, 1);
    console.log(`  [PASS] Successfully rolled back to version: v${rolledBack.version}`);

    return true;
  } finally {
    await engine.shutdown();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

runEngineSmoke();
