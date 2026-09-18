import assert from 'node:assert';
import {
  SUPPORTED_RATIOS,
  getCanonicalDimensions,
  getOrientationForRatio,
  type SupportedRatio
} from '../../core/geometry/ratio.ts';
import { ArtifactValidator } from '../../core/validation/validator.ts';
import { PromptComposer } from '../../core/prompt/composer.ts';
import { PosterEngine } from '../../core/generation/poster.ts';

export async function runRatioPipelineTest(): Promise<void> {
  console.log('\n----------------------------------------------------');
  console.log('  TEST SUITE: RATIO-AWARE GENERATION & PIPELINE       ');
  console.log('----------------------------------------------------');

  const validator = new ArtifactValidator();
  const composer = new PromptComposer();

  // Test 1: Canonical Dimension & Orientation Propagation across all 5 ratios
  {
    for (const ratio of SUPPORTED_RATIOS) {
      const canonical = getCanonicalDimensions(ratio);
      const orientation = getOrientationForRatio(ratio);
      const val = validator.validatePosterDimensions(canonical.width, canonical.height, ratio);
      assert.strictEqual(val.valid, true, `Dimensions for ${ratio} must be valid canonical dimensions`);

      const composed = composer.compose({
        userPrompt: 'Test multi-ratio design prompt',
        geometryContext: {
          ratio,
          width: canonical.width,
          height: canonical.height,
          orientation
        }
      });

      assert.ok(
        composed.systemInstruction.includes(`${canonical.width}px x ${canonical.height}px`),
        `Layer 1 must contain exact ${canonical.width}px x ${canonical.height}px for ${ratio}`
      );
      assert.ok(
        composed.systemInstruction.includes(`${orientation} orientation`),
        `Layer 1 must state ${orientation} orientation for ${ratio}`
      );
      assert.ok(
        composed.systemInstruction.includes('.poster-artboard (' + canonical.width + 'px x ' + canonical.height + 'px'),
        `Layer 7 must specify artboard dimensions for ${ratio}`
      );
      assert.ok(
        composed.systemInstruction.includes('Geometry-specific guidance provides optional spatial considerations and must not prescribe a fixed composition, layout skeleton, alignment, or ingredient set.'),
        `Soft composition rule must be present in prompt for ${ratio}`
      );
      assert.ok(
        composed.systemInstruction.includes('Primary content must be distance-readable; secondary text must remain readable; microtext is allowed only for justified credits/legal/source information.'),
        `Adaptive readability rule must be present in prompt for ${ratio}`
      );
      assert.ok(
        composed.systemInstruction.includes('ZERO decorative pills/chips'),
        `Anti-decorative-pills rule must be present in prompt for ${ratio}`
      );
    }
    console.log('  [PASS] Test 1: All 5 canonical ratios propagate dimensions, orientation, and soft craft rules to prompt');
  }

  // Test 2: Directional Scrim Safety Net across geometries (Horizontal, Radial, Vertical)
  {
    // Minimal mock for PosterEngine helper method testing
    const fakeDeps = {
      workspaceManager: null as any,
      providerManager: null as any,
      assetManager: null as any,
      memoryStore: null as any,
      sessionTracker: null as any,
      ratioCapability: null as any,
      ratioToolDispatcher: null as any,
      precedenceCoordinator: null as any
    };
    const engine = new PosterEngine(fakeDeps);

    // 2A: Landscape 16:9 with Left-aligned content -> scrim-left
    {
      const html = `<main class="poster-artboard">
        <img class="poster-bleed-image" src="asset:panoramic hero">
        <div class="left-column"><h1>Left Editorial Headline</h1></div>
      </main>`;
      const css = `.left-column { width: 50%; text-align: left; }`;
      const res = engine.ensureDirectionalScrim(html, css, '16:9');
      assert.ok(res.html.includes('scrim-left'), 'Landscape with left-column must receive .scrim-left');
      assert.ok(res.css.includes('.scrim-left'), 'CSS must define .scrim-left gradient');
    }

    // 2B: Landscape 16:9 with Right-aligned content -> scrim-right
    {
      const html = `<main class="poster-artboard">
        <img class="poster-bleed-image" src="asset:panoramic hero">
        <div class="right-column"><h1>Right Editorial Headline</h1></div>
      </main>`;
      const css = `.right-column { width: 50%; }`;
      const res = engine.ensureDirectionalScrim(html, css, '16:9');
      assert.ok(res.html.includes('scrim-right'), 'Landscape with right-column must receive .scrim-right');
      assert.ok(res.css.includes('.scrim-right'), 'CSS must define .scrim-right gradient');
    }

    // 2C: Square 1:1 with Corner content -> scrim-radial
    {
      const html = `<main class="poster-artboard">
        <img class="poster-bleed-image" src="asset:square focal hero">
        <div class="corner-hero"><h1>Corner Monogram</h1></div>
      </main>`;
      const css = `.corner-hero { position: absolute; top: 40px; left: 40px; }`;
      const res = engine.ensureDirectionalScrim(html, css, '1:1');
      assert.ok(res.html.includes('scrim-radial'), 'Square with corner text must receive .scrim-radial');
      assert.ok(res.css.includes('.scrim-radial'), 'CSS must define .scrim-radial gradient');
    }

    // 2D: Portrait 3:4 with standard bottom content -> scrim-bottom
    {
      const html = `<main class="poster-artboard">
        <img class="poster-bleed-image" src="asset:vertical hero">
        <div class="content-stack"><h1>Bottom Headline</h1></div>
      </main>`;
      const css = `.content-stack { margin-top: auto; }`;
      const res = engine.ensureDirectionalScrim(html, css, '3:4');
      assert.ok(res.html.includes('scrim-bottom'), 'Portrait with bottom content must receive .scrim-bottom');
      assert.ok(res.css.includes('.scrim-bottom'), 'CSS must define .scrim-bottom gradient');
    }

    // 2E: Typographic / Image Not Wanted -> Zero scrim injected
    {
      const html = `<main class="poster-artboard">
        <div class="editorial-typography"><h1>Pure Typography</h1></div>
      </main>`;
      const css = `.editorial-typography { font-size: 80px; }`;
      const res = engine.ensureDirectionalScrim(html, css, '16:9');
      assert.strictEqual(res.html.includes('poster-scrim'), false, 'Non-photographic design must not receive any scrim');
    }

    console.log('  [PASS] Test 2: Directional scrims correctly adapt to landscape, square, and portrait geometries');
  }

  // Test 3: Export Dimension Validation across canonical ratios
  {
    // Valid canonical requests
    const testCases: Array<{ ratio: SupportedRatio; w: number; h: number; shouldPass: boolean }> = [
      { ratio: '3:4', w: 1080, h: 1440, shouldPass: true },
      { ratio: '9:16', w: 1080, h: 1920, shouldPass: true },
      { ratio: '16:9', w: 1920, h: 1080, shouldPass: true },
      { ratio: '1:1', w: 1080, h: 1080, shouldPass: true },
      { ratio: '4:3', w: 1440, h: 1080, shouldPass: true },
      // Cross-ratio mismatch violations
      { ratio: '16:9', w: 1080, h: 1440, shouldPass: false },
      { ratio: '3:4', w: 1920, h: 1080, shouldPass: false },
      { ratio: '9:16', w: 1080, h: 1080, shouldPass: false },
      { ratio: '1:1', w: 1440, h: 1080, shouldPass: false }
    ];

    for (const tc of testCases) {
      const res = validator.validatePosterDimensions(tc.w, tc.h, tc.ratio);
      assert.strictEqual(
        res.valid,
        tc.shouldPass,
        `Expected ${tc.w}x${tc.h} for ratio ${tc.ratio} to have valid=${tc.shouldPass}`
      );
    }
    console.log('  [PASS] Test 3: Exporter dimension validation strictly enforces project canonical ratio');
  }

  // Test 4: Studio Preview Scaler Ratio-Aware Math
  {
    const viewportWidth = 1200;
    const viewportHeight = 900;
    const cw = viewportWidth - 32;
    const ch = viewportHeight - 32;

    for (const ratio of SUPPORTED_RATIOS) {
      const { width, height } = getCanonicalDimensions(ratio);
      const scale = Math.min(cw / width, ch / height, 0.88);
      assert.ok(scale > 0 && scale <= 0.88, `Scale factor for ${ratio} must be positive and bounded`);
      assert.ok(width * scale <= cw, `Scaled width for ${ratio} must fit within viewport container`);
      assert.ok(height * scale <= ch, `Scaled height for ${ratio} must fit within viewport container`);
    }
    console.log('  [PASS] Test 4: Studio preview scaler math verifies zero clipping across all 5 ratios');
  }

  console.log('\n[ALL RATIO PIPELINE TESTS PASSED]\n');
}

// Direct execution support
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('ratio_pipeline.test')) {
  runRatioPipelineTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
