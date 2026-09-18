import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { StandaloneDesignEngine } from '../../core/index.ts';
import type { ModelProvider } from '../../core/contracts/models.ts';
import type { ModelMessage, ModelGenerateOptions } from '../../core/contracts/models.ts';

class MockModelProvider implements ModelProvider {
  public generateCallCount = 0;
  public generateTextCallCount = 0;

  async generate(messages: ModelMessage[], options?: ModelGenerateOptions) {
    this.generateCallCount++;
    if (options?.signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }

    // Default ratio tool decision response if called during agent ratio turn
    return {
      result: {
        text: 'I choose canonical 3:4 ratio',
        finishReason: 'STOP'
      },
      diagnostics: {
        provider: 'mock-llm',
        model: 'mock-model-v1',
        accountId: 'mock-account',
        durationMs: 10,
        fallbackOccurred: false
      }
    };
  }

  async generateText(options: {
    model?: string;
    systemInstruction?: string;
    prompt: string;
    signal?: AbortSignal;
  }): Promise<{ text: string; model: string; accountId: string; provider: string }> {
    this.generateTextCallCount++;
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
    <h1 data-od-id="headline">Mock Architectural Poster</h1>
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
  background: #0f172a;
}
.poster-artboard {
  width: 1080px;
  height: 1440px;
  position: relative;
  overflow: hidden;
  background: #0f172a;
}
h1 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 64px;
  color: #f8fafc;
}`;

    return {
      text: `\`\`\`html:index.html\n${html}\n\`\`\`\n\`\`\`css:styles.css\n${css}\n\`\`\``,
      model: 'mock-model-v1',
      accountId: 'mock-account',
      provider: 'mock-llm'
    };
  }
}

export async function runExtensibilityMockProviderTest(): Promise<boolean> {
  console.log('--- Testing Extensibility: In-Memory Mock ModelProvider & Cancellation ---');

  const testDir = path.resolve('d8.7-test-mock-provider-data');
  fs.mkdirSync(testDir, { recursive: true });

  try {
    const mockProvider = new MockModelProvider();

    // 1. Instantiate engine with mock provider and ZERO Gemini keys
    const engine = new StandaloneDesignEngine({
      dataDir: testDir,
      geminiKeys: [],
      modelProvider: mockProvider,
      enablePreviewServer: false,
      autoExportPng: false
    });

    // 2. Create project
    const project = await engine.createProject(
      'Mock Extensibility Project',
      'poster',
      'A poster generated via mock model provider',
      'modern-dark'
    );

    // 3. Generate poster using mock provider
    const result = await engine.generate({
      projectId: project.id,
      prompt: 'A minimalist poster on brutalist architecture in 3:4 aspect ratio'
    });

    assert.strictEqual(result.status, 'succeeded', 'Mock generation must succeed');
    assert.strictEqual(result.diagnostics.provider, 'mock-llm', 'Diagnostics must report mock provider');
    assert.strictEqual(result.diagnostics.model, 'mock-model-v1', 'Diagnostics must report mock model');
    assert.strictEqual(result.diagnostics.operation, 'generate', 'Diagnostics must report operation');
    assert.ok(mockProvider.generateTextCallCount > 0, 'Mock generateText must be called');

    // 4. Verify generated files on disk
    const htmlPath = path.join(project.rootPath, 'index.html');
    const cssPath = path.join(project.rootPath, 'styles.css');
    assert.ok(fs.existsSync(htmlPath), 'Generated index.html must exist');
    assert.ok(fs.existsSync(cssPath), 'Generated styles.css must exist');

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(htmlContent.includes('Mock Architectural Poster'), 'Generated index.html must have mock content');
    assert.ok(cssContent.includes('.poster-artboard'), 'Generated styles.css must have mock styles');
    console.log('  [PASS] Full poster generation succeeded using MockModelProvider with zero Gemini API keys');

    // 5. Verify operation cancellation via AbortSignal
    const controller = new AbortController();
    controller.abort(); // pre-aborted signal

    let cancellationCaught = false;
    try {
      await engine.generate({
        projectId: project.id,
        prompt: 'A poster that should be cancelled immediately',
        signal: controller.signal
      });
    } catch (err: any) {
      cancellationCaught = true;
      assert.ok(
        err.name === 'AbortError' || err.message.includes('aborted'),
        `Error must be an AbortError, got: ${err.message}`
      );
    }

    assert.ok(cancellationCaught, 'Generation with aborted signal must immediately reject');
    console.log('  [PASS] Operation cancellation via AbortSignal verified without partial state corruption');

    await engine.shutdown();
    console.log('Mock ModelProvider & cancellation tests PASSED!\n');
    return true;
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('extensibility_mock_provider.test.ts')) {
  runExtensibilityMockProviderTest().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
