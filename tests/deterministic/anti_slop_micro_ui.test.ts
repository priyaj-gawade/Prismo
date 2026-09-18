import assert from 'node:assert';
import { ArtifactValidator } from '../../core/validation/validator.ts';
import { PosterEngine } from '../../core/generation/poster.ts';

export async function runAntiSlopMicroUiTest() {
  console.log('--- Testing Anti-Slop Micro-UI & Chrome Elimination ---');
  const validator = new ArtifactValidator();

  // 1. Test Micro-Text Gate (< 22px threshold)
  {
    const html = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">TITLE</h1>
        <p class="desc-1">First detail</p>
        <p class="desc-2">Second detail</p>
        <p class="desc-3">Third detail</p>
      </div>
    `;
    const cssWithMicroText = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .desc-1 { font-size: 14px; }
      .desc-2 { font-size: 16px; }
      .desc-3 { font-size: 18px; }
    `;
    const res = validator.validateAntiSlop(html, cssWithMicroText);
    assert.strictEqual(res.slopDetected, true, 'Should detect micro-text violation');
    assert(res.violations.some(v => v.includes('Micro-text violation')), 'Should include micro-text violation message');
    assert.strictEqual(res.metrics.microTextCount, 3, 'Should count 3 micro-text instances');
    console.log('  [PASS] Test 1: Micro-text detection (< 22px) verified');
  }

  // 2. Test Pill / Chip Gate (> 1 prohibited)
  {
    const html = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">MINIMAL</h1>
        <div class="tag-chip">CATEGORY A</div>
        <div class="status-chip">CATEGORY B</div>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .tag-chip, .status-chip { font-size: 24px; }
    `;
    const res = validator.validateAntiSlop(html, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect multiple pills');
    assert(res.violations.some(v => v.includes('Pill/chip violation')), 'Should include pill/chip violation message');
    assert.strictEqual(res.metrics.pillCount, 2, 'Should record 2 pills');
    console.log('  [PASS] Test 2: Pill / Chip proliferation detection verified');
  }

  // 3. Test Status Indicator / Colored Dot Gate (0 allowed)
  {
    const htmlWithDot = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">SYSTEM</h1>
        <span class="status-dot"></span>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; }
    `;
    const res = validator.validateAntiSlop(htmlWithDot, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect status dot');
    assert(res.violations.some(v => v.includes('Status indicator violation')), 'Should include status indicator violation');
    assert(res.metrics.statusDotCount > 0, 'Status dot count should be > 0');
    console.log('  [PASS] Test 3: Status indicator / colored dot detection verified');
  }

  // 4. Test 3-Part Header Rail Gate
  {
    const htmlWithTopRail = `
      <div class="poster-artboard" data-od-id="poster-root">
        <header class="top-rail">
          <span>ARCHIV 1925</span>
          <span>WALTER GROPIUS</span>
          <span>DESSAU</span>
        </header>
        <h1 class="poster-headline">BAUHAUS</h1>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .top-rail { display: flex; justify-content: space-between; font-size: 24px; }
    `;
    const res = validator.validateAntiSlop(htmlWithTopRail, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect header rail');
    assert(res.violations.some(v => v.includes('header metadata rail')), 'Should flag 3-part header rail');
    assert.strictEqual(res.metrics.headerRailDetected, true, 'headerRailDetected should be true');
    console.log('  [PASS] Test 4: 3-part header rail detection verified');
  }

  // 5. Test 3-Part Footer Rail Gate
  {
    const htmlWithBottomRail = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">ARCHITECTURE</h1>
        <footer class="bottom-rail">
          <span>LAT. 51° 50' N</span>
          <span>GESAMTKUNSTWERK</span>
          <span>LONG. 12° 13' E</span>
        </footer>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .bottom-rail { display: flex; justify-content: space-between; font-size: 24px; }
    `;
    const res = validator.validateAntiSlop(htmlWithBottomRail, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect footer rail');
    assert(res.violations.some(v => v.includes('footer metadata rail')), 'Should flag 3-part footer rail');
    assert.strictEqual(res.metrics.footerRailDetected, true, 'footerRailDetected should be true');
    console.log('  [PASS] Test 5: 3-part footer rail detection verified');
  }

  // 6. Test Technical UI Slop & Fake Metadata Gate
  {
    const htmlWithFakeMeta = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">DISTRIBUTED LOG</h1>
        <div class="box">TERM 04</div>
        <div class="box">ACTIVE LEADER</div>
        <div class="box">NODE_01</div>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .box { font-size: 24px; }
    `;
    const res = validator.validateAntiSlop(htmlWithFakeMeta, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect fake metadata');
    assert(res.violations.some(v => v.includes('Fake metadata / technical UI slop detected')), 'Should flag fake metadata');
    assert(res.metrics.fakeMetadataCount >= 3, 'Should count all 3 fake metadata terms');
    console.log('  [PASS] Test 6: Technical UI slop & fake metadata detection verified');
  }

  // 7. Test Valid Clean Poster (zero slop)
  {
    const cleanHtml = `
      <div class="poster-artboard" data-od-id="poster-root">
        <div class="poster-focal-frame">
          <img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" alt="Porsche 911 GT3 RS" />
        </div>
        <div class="poster-copy">
          <h1 class="poster-headline">PORSCHE 911 GT3 RS</h1>
          <p class="poster-subtext">Naturally aspirated precision engineering.</p>
        </div>
      </div>
    `;
    const cleanCss = `
      .poster-artboard {
        position: relative;
        width: 1080px;
        height: 1440px;
        background: #0f1117;
        color: #ffffff;
      }
      .poster-focal-frame {
        position: relative;
        width: 900px;
        height: 600px;
        margin: 80px auto 40px auto;
      }
      .poster-headline {
        font-family: sans-serif;
        font-size: 88px;
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1.0;
        text-transform: uppercase;
      }
      .poster-subtext {
        font-family: sans-serif;
        font-size: 28px;
        color: #94a3b8;
        line-height: 1.4;
      }
    `;
    const res = validator.validateAntiSlop(cleanHtml, cleanCss);
    assert.strictEqual(res.slopDetected, false, 'Clean poster must have slopDetected: false');
    assert.strictEqual(res.violations.length, 0, 'Clean poster must have 0 violations');
    console.log('  [PASS] Test 7: Valid clean poster passes with zero violations');
  }

  // 8. Positive Reference Fixture: Porsche / Mustang clean poster
  {
    const positiveHtml = `
      <div class="poster-artboard" data-od-id="poster-root">
        <div class="hero-image-wrap">
          <img src="porsche.jpg" alt="Porsche GT3" />
        </div>
        <div class="headline-block">
          <h1 class="poster-headline">911 GT3 RS</h1>
          <p class="poster-caption">The aerodynamic benchmark for Weissach.</p>
        </div>
      </div>
    `;
    const positiveCss = `
      .poster-artboard { width: 1080px; height: 1440px; background: #000; }
      .hero-image-wrap { width: 100%; height: 900px; }
      .poster-headline { font-size: 110px; font-weight: 800; }
      .poster-caption { font-size: 32px; color: #aaa; }
    `;
    const res = validator.validateAntiSlop(positiveHtml, positiveCss);
    assert.strictEqual(res.slopDetected, false, 'Positive reference fixture must pass cleanly');
    console.log('  [PASS] Test 8: Positive Porsche/Mustang reference fixture verified');
  }

  // 9. Negative Fixtures: Bauhaus & Generic Mind-Map from manual review
  {
    // Negative Fixture A: Bauhaus with 3-part rails and micro-coordinates
    const bauhausNegativeHtml = `
      <div class="poster-artboard" data-od-id="poster-root">
        <header class="archival-header">
          <span>ARCHIV 1925</span>
          <span>WALTER GROPIUS</span>
          <span>DESSAU</span>
        </header>
        <h1>BAUHAUS</h1>
        <footer class="editorial-bottom">
          <span>LAT. 51° 50' N</span>
          <span>GESAMTKUNSTWERK</span>
          <span>LONG. 12° 13' E</span>
        </footer>
      </div>
    `;
    const bauhausNegativeCss = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .archival-header span { font-size: 13px; }
      .editorial-bottom span { font-size: 11px; }
      h1 { font-size: 96px; }
    `;
    const resA = validator.validateAntiSlop(bauhausNegativeHtml, bauhausNegativeCss);
    assert.strictEqual(resA.slopDetected, true, 'Negative Bauhaus fixture must fail');
    assert(resA.metrics.headerRailDetected, 'Bauhaus header rail must be detected');
    assert(resA.metrics.footerRailDetected, 'Bauhaus footer rail must be detected');
    assert(resA.metrics.microTextCount > 0, 'Bauhaus micro text must be detected');

    // Negative Fixture B: Generic Mind-Map Slop with TERM 04, green dot, ACTIVE LEADER, NODE_01
    const mindmapNegativeHtml = `
      <div class="poster-artboard" data-od-id="poster-root">
        <div class="top-row">
          <span class="term-badge"><span class="status-dot"></span>TERM 04</span>
          <span class="status-badge">ACTIVE LEADER</span>
        </div>
        <h1>GENERIC MINDMAP PROTOCOL</h1>
        <div class="diagram">
          <div class="ui-card">NODE_01</div>
          <div class="ui-card">NODE_02</div>
          <div class="ui-card">NODE_03</div>
        </div>
      </div>
    `;
    const mindmapNegativeCss = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .term-badge { font-size: 14px; }
      .status-badge { font-size: 14px; }
      .ui-card { font-size: 16px; }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
      h1 { font-size: 72px; }
    `;
    const resB = validator.validateAntiSlop(mindmapNegativeHtml, mindmapNegativeCss);
    assert.strictEqual(resB.slopDetected, true, 'Negative mind-map fixture must fail');
    assert(resB.metrics.statusDotCount > 0, 'Status dot must be detected');
    assert(resB.metrics.fakeMetadataCount > 0, 'Fake metadata must be detected');
    assert(resB.metrics.microTextCount > 0, 'Micro text must be detected');

    console.log('  [PASS] Test 9: Negative regression fixtures (Bauhaus & Generic Mind-Map) correctly flagged & rejected');
  }

  // 10. Sanitizer Contract Test (deterministic repair)
  {
    const mockEngine = new PosterEngine({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    const messyHtml = `
      <div class="poster-artboard">
        <header class="top-rail"><span>ARCHIV</span></header>
        <h1>SYSTEM<span class="status-dot"></span></h1>
        <p>• DRS ENGAGED</p>
        <div class="node">NODE_01</div>
      </div>
    `;
    const messyCss = `
      h1 { font-size: 72px; }
      p { font-size: 14px; }
      .node { font-size: 16px; }
    `;
    const sanitized = mockEngine.sanitizePoster(messyHtml, messyCss);
    assert(!sanitized.html.includes('status-dot'), 'Sanitizer must remove status dots');
    assert(!sanitized.html.includes('top-rail'), 'Sanitizer must remove top-rail wrapper');
    assert(!sanitized.html.includes('NODE_01'), 'Sanitizer must strip fake node metadata');
    assert(!sanitized.html.includes('• DRS'), 'Sanitizer must clean bullet before DRS');
    assert(!sanitized.css.includes('font-size: 14px'), 'Sanitizer must bump 14px font-size');
    assert(sanitized.css.includes('font-size: 22px'), 'Sanitizer must bump to 22px');
    console.log('  [PASS] Test 10: Deterministic sanitizer cleans micro-UI and bumps font sizes to >= 22px');
  }

  // 11. Anti-Mindmap Gate: Flag repeated node cards (> 2 prohibited)
  {
    const htmlWithRepeatedCards = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">DISTRIBUTED CONSENSUS</h1>
        <div class="node-card">NODE A</div>
        <div class="node-card">NODE B</div>
        <div class="node-card">NODE C</div>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .node-card { font-size: 24px; }
    `;
    const res = validator.validateAntiSlop(htmlWithRepeatedCards, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect repeated node cards');
    assert(res.violations.some((v) => v.includes('Mind-map slop detected')), 'Should flag mind-map slop');
    assert.strictEqual(res.metrics.nodeCardCount, 3, 'Should count 3 node cards');
    console.log('  [PASS] Test 11: Anti-Mindmap gate (> 2 repeated node cards) verified');
  }

  // 12. Generic Diagram Panel Gate: Flag enclosed diagram-container / hero-diagram-container
  {
    const htmlWithPanel = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">DISTRIBUTED CONSENSUS</h1>
        <div class="hero-diagram-container">
          <svg><circle cx="50" cy="50" r="40"/></svg>
        </div>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .hero-diagram-container { width: 800px; height: 600px; background: #111; }
    `;
    const res = validator.validateAntiSlop(htmlWithPanel, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect enclosed diagram panel');
    assert(res.violations.some((v) => v.includes('Diagram panel violation')), 'Should flag diagram panel violation');
    assert.strictEqual(res.metrics.graphContainerCount, 1, 'Should record 1 graph container');
    console.log('  [PASS] Test 12: Generic diagram panel gate (enclosed container) verified');
  }

  // 13. Default Vue Flow Styling Gate: Flag .vue-flow__node-default or .vue-flow__handle
  {
    const htmlWithVueFlow = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">FLOW ARCHITECTURE</h1>
        <div class="vue-flow__node-default">STEP 1</div>
      </div>
    `;
    const css = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
      .vue-flow__node-default { font-size: 24px; }
    `;
    const res = validator.validateAntiSlop(htmlWithVueFlow, css);
    assert.strictEqual(res.slopDetected, true, 'Should detect default Vue Flow class');
    assert(res.violations.some((v) => v.includes('Default Vue Flow styling detected')), 'Should flag default Vue Flow usage');
    assert.strictEqual(res.metrics.defaultVueFlowClassUsage, true, 'defaultVueFlowClassUsage should be true');
    console.log('  [PASS] Test 13: Default Vue Flow styling gate verified');
  }

  // 14. Monospace Display Gate: Technical Subject != Monospace Display!
  {
    const htmlWithMonoHeading = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">EVENT STREAM PIPELINE</h1>
        <p class="poster-body">High-throughput event streaming engine.</p>
      </div>
    `;
    const cssWithMonoHeading = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-family: 'JetBrains Mono', monospace; font-size: 80px; }
      .poster-body { font-family: sans-serif; font-size: 28px; }
    `;
    const res = validator.validateAntiSlop(htmlWithMonoHeading, cssWithMonoHeading);
    assert.strictEqual(res.slopDetected, true, 'Should flag monospace display heading');
    assert(res.violations.some((v) => v.includes('Monospace display violation')), 'Should include monospace display violation message');
    assert.strictEqual(res.metrics.displayMonospaceUsage, true, 'displayMonospaceUsage should be true');
    console.log('  [PASS] Test 14: Monospace display heading gate verified');
  }

  console.log('Anti-Slop Micro-UI tests PASSED!\n');
}
