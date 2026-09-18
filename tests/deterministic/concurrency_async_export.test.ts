import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { HeadlessExporter } from '../../core/export/exporter.ts';

export async function runConcurrencyAsyncExportTest(): Promise<boolean> {
  console.log('--- Testing Asynchronous Non-Blocking Headless Exporter & Concurrency ---');

  const exporter = new HeadlessExporter();
  const tempDir = path.resolve('d8.7-test-concurrency-export');
  fs.mkdirSync(tempDir, { recursive: true });

  const testHtml = path.join(tempDir, 'test.html');
  fs.writeFileSync(
    testHtml,
    `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; width: 1080px; height: 1440px; background: #0f172a; color: #38bdf8; font-family: sans-serif; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 64px; }
  </style>
</head>
<body>
  <h1>Async Concurrency Test</h1>
</body>
</html>`
  );

  try {
    // 1. Set up an event-loop heartbeat timer to verify Node.js event loop is not blocked
    let tickCount = 0;
    let maxJitterMs = 0;
    let lastTickTime = Date.now();

    const heartbeat = setInterval(() => {
      tickCount++;
      const now = Date.now();
      const elapsed = now - lastTickTime;
      lastTickTime = now;
      if (elapsed > maxJitterMs) {
        maxJitterMs = elapsed;
      }
    }, 15);

    // 2. Launch 3 concurrent exports simultaneously
    const out1 = path.join(tempDir, 'out1.png');
    const out2 = path.join(tempDir, 'out2.png');
    const out3 = path.join(tempDir, 'out3.png');

    const startTime = Date.now();
    const exportPromises = [
      exporter.exportUrl(testHtml, { width: 1080, height: 1440, format: 'png', outputPath: out1 }),
      exporter.exportUrl(testHtml, { width: 1080, height: 1440, format: 'png', outputPath: out2 }),
      exporter.exportUrl(testHtml, { width: 1080, height: 1440, format: 'png', outputPath: out3 })
    ];

    const results = await Promise.all(exportPromises);
    const totalDuration = Date.now() - startTime;

    clearInterval(heartbeat);

    // 3. Verify event loop continued ticking while exports were running
    // With blocking spawnSync, tickCount would be 0 until completion, causing huge jitter (> 1500ms).
    // With non-blocking spawn(), tickCount ticks dozens or hundreds of times.
    assert.ok(
      tickCount > 10,
      `Event loop heartbeat must tick during async exports (got ${tickCount} ticks over ${totalDuration}ms)`
    );
    console.log(
      `  [PASS] Event loop remained active during concurrent exports (${tickCount} ticks, max drift: ${maxJitterMs}ms)`
    );

    // 4. Verify all 3 output files were generated and valid
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      assert.strictEqual(res.width, 1080);
      assert.strictEqual(res.height, 1440);
      assert.strictEqual(res.format, 'png');
      assert.ok(fs.existsSync(res.filePath), `File ${res.filePath} must exist`);

      const val = exporter.validateImageFile(res.filePath, 'png');
      assert.ok(val.valid, `Export ${i + 1} validation failed: ${val.error}`);
    }
    console.log('  [PASS] All 3 concurrent exports completed successfully with valid binary image headers');

    // 5. Verify AbortSignal cancellation behavior
    const abortController = new AbortController();
    abortController.abort(); // pre-aborted

    const abortedOut = path.join(tempDir, 'aborted.png');
    let abortCaught = false;

    try {
      await exporter.exportUrl(testHtml, {
        width: 1080,
        height: 1440,
        format: 'png',
        outputPath: abortedOut,
        signal: abortController.signal
      });
    } catch (err: any) {
      abortCaught = true;
      assert.ok(
        err.message.includes('aborted') || err.message.includes('AbortError'),
        `Error message must indicate abort, got: ${err.message}`
      );
    }

    assert.ok(abortCaught, 'Export with aborted signal must reject');
    assert.ok(!fs.existsSync(abortedOut), 'Aborted export must not leave output file');
    console.log('  [PASS] AbortSignal promptly cancelled export operation');

    console.log('Concurrency & async export tests PASSED!\n');
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('concurrency_async_export.test.ts')) {
  runConcurrencyAsyncExportTest().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
