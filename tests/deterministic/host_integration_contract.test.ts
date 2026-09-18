import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import {
  StandaloneDesignEngine,
  type ModelProvider,
  type ModelMessage,
  type ModelGenerateOptions,
  type GenerationResult,
  type SupportedRatio
} from '../../core/index.ts';

/**
 * In-memory ModelProvider simulating a host-managed AI backend (e.g. Limo worker).
 * Emits valid Hallmark/anti-slop poster HTML & CSS with zero external network access.
 */
class HostEmbeddedModelProvider implements ModelProvider {
  public turnsExecuted = 0;

  async generate(messages: ModelMessage[], options?: ModelGenerateOptions) {
    if (options?.signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }
    return {
      result: { text: 'I choose canonical 3:4 ratio', finishReason: 'STOP' },
      diagnostics: {
        provider: 'host-embedded-llm',
        model: 'host-llm-v1',
        accountId: 'host-worker-0',
        durationMs: 12,
        fallbackOccurred: false
      }
    };
  }

  async generateText(options: {
    model?: string;
    systemInstruction?: string;
    prompt: string;
    signal?: AbortSignal;
  }) {
    this.turnsExecuted++;
    if (options.signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="poster-artboard" data-od-id="poster-root">
    <h1 data-od-id="headline">Host Embedded Design Capability</h1>
    <p data-od-id="supporting-copy">Clean decoupled headless execution turn ${this.turnsExecuted}</p>
  </main>
</body>
</html>`;

    const css = `/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V5 | grammar: img=none text=center type=display dominant=headline overlay=none */
* { box-sizing: border-box; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 1080px !important;
  height: 1440px !important;
  overflow: hidden !important;
  background: #090d16;
}
.poster-artboard {
  width: 1080px;
  height: 1440px;
  position: relative;
  overflow: hidden;
  background: #090d16;
}
h1 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 56px;
  color: #f1f5f9;
}
p {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  color: #94a3b8;
}`;

    return {
      text: `\`\`\`html:index.html\n${html}\n\`\`\`\n\`\`\`css:styles.css\n${css}\n\`\`\``,
      model: 'host-llm-v1',
      accountId: 'host-worker-0',
      provider: 'host-embedded-llm'
    };
  }
}

export async function runHostIntegrationContractTest(): Promise<boolean> {
  console.log('--- Testing Host Integration Contract via core/index.ts (No Studio, No Chrome, No Gemini Keys) ---');

  const testDir = path.resolve('d8.7-test-host-integration-data');
  fs.mkdirSync(testDir, { recursive: true });

  try {
    const mockProvider = new HostEmbeddedModelProvider();

    // 1. Host instantiates D8.7 engine using ONLY core/index.ts public API
    const engine = new StandaloneDesignEngine({
      dataDir: testDir,
      geminiKeys: [],              // No Gemini API keys required
      modelProvider: mockProvider, // Host supplies provider
      enablePreviewServer: false,  // Headless mode: no preview HTTP server or port binding
      autoExportPng: false         // Headless mode: no automatic Chrome screenshot
    });

    // 2. Host creates a design project
    const project = await engine.createProject(
      'Host Integrated Poster',
      'poster',
      'A poster demonstrating headless host integration',
      'modern-dark'
    );

    assert.ok(project.id.startsWith('proj_'), 'Project ID must be generated');
    assert.strictEqual(project.target, 'poster', 'Target must be poster');
    console.log('  [PASS] Project initialized in headless workspace');

    // 3. Host triggers generation and receives structured native result
    const genResult = await engine.generate({
      projectId: project.id,
      prompt: 'A brutalist technical poster for distributed systems with 3:4 geometry'
    });

    // Verify host consumption contract
    assert.strictEqual(genResult.status, 'succeeded', 'Generation must succeed');
    assert.ok(genResult.runId.startsWith('run_'), 'runId must be generated');
    assert.strictEqual(genResult.projectId, project.id, 'projectId must match');
    assert.strictEqual(genResult.entryHtmlFile, 'index.html', 'entryHtmlFile must be index.html');
    assert.strictEqual(genResult.ratioState?.ratio, '3:4', 'Ratio must be 3:4');
    assert.ok(genResult.changedFiles.length > 0, 'changedFiles must record generated artifacts');
    assert.ok(genResult.allFiles.includes('index.html'), 'allFiles must include index.html');
    assert.ok(genResult.allFiles.includes('styles.css'), 'allFiles must include styles.css');

    // Verify structured diagnostics consumed by host
    assert.strictEqual(genResult.diagnostics.provider, 'host-embedded-llm', 'Diagnostics must report host provider');
    assert.strictEqual(genResult.diagnostics.model, 'host-llm-v1', 'Diagnostics must report host model');
    assert.strictEqual(genResult.diagnostics.operation, 'generate', 'Diagnostics must report generate operation');
    assert.ok(typeof genResult.diagnostics.durationMs === 'number', 'Duration must be recorded');
    console.log('  [PASS] Structured generation result & diagnostics verified without Studio or Chrome');

    // 4. Host inspects artifacts via public engine methods
    const artifacts = await engine.getArtifacts(project.id);
    const artifactPaths = artifacts.map((a) => a.path);
    assert.ok(artifactPaths.includes('index.html'), 'Artifacts must include index.html');
    assert.ok(artifactPaths.includes('styles.css'), 'Artifacts must include styles.css');
    assert.ok(artifactPaths.includes('tokens.css'), 'Artifacts must include tokens.css');
    assert.ok(artifactPaths.includes('DESIGN.md'), 'Artifacts must include DESIGN.md');

    const htmlPath = path.join(project.rootPath, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(htmlContent.includes('Host Embedded Design Capability'), 'index.html content must match host turn');
    console.log('  [PASS] Artifact inspection and file integrity verified');

    // 5. Host executes a refinement turn
    const refineResult = await engine.refine({
      projectId: project.id,
      instruction: 'Increase typographic scale and tighten letter spacing'
    });

    assert.strictEqual(refineResult.status, 'succeeded', 'Refinement must succeed');
    assert.strictEqual(refineResult.diagnostics.operation, 'refine', 'Diagnostics must report refine operation');
    assert.strictEqual(refineResult.diagnostics.provider, 'host-embedded-llm', 'Diagnostics must maintain provider');

    // 6. Host inspects project version history
    const inspection = await engine.inspect(project.id);
    assert.strictEqual(inspection.metadata.id, project.id);
    assert.ok(inspection.versions >= 2, `Version count must be >= 2 (got ${inspection.versions})`);
    console.log(`  [PASS] Refinement turn completed with version tracking (${inspection.versions} versions)`);

    // 7. Preview remains an optional local convenience capability
    const preview = await engine.preview(project.id);
    assert.strictEqual(preview.port, 0, 'Headless preview port must be 0 (no socket bound)');
    assert.ok(preview.url.startsWith('file:'), 'Headless preview URL must be a local file URI');
    console.log('  [PASS] Preview remains an optional convenience capability returning file://');

    // 8. Host operation cancellation via AbortSignal
    const cancelController = new AbortController();
    cancelController.abort(); // Pre-abort signal

    let cancellationCaught = false;
    try {
      await engine.generate({
        projectId: project.id,
        prompt: 'Generation to be cancelled immediately',
        signal: cancelController.signal
      });
    } catch (err: any) {
      cancellationCaught = true;
      assert.ok(
        err.name === 'AbortError' || err.message.includes('aborted'),
        `Error must be AbortError, got: ${err.message}`
      );
    }
    assert.ok(cancellationCaught, 'Aborted host operation must immediately reject');
    console.log('  [PASS] Host operation cancellation verified');

    // 9. Clean shutdown
    await engine.shutdown();
    console.log('  [PASS] Engine shutdown cleanly');

    console.log('Host integration contract tests PASSED!\n');
    return true;
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('host_integration_contract.test.ts')) {
  runHostIntegrationContractTest().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
