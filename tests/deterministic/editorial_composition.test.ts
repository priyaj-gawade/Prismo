import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PosterEditor } from '../../core/generation/editable.ts';
import { TypographyDirector } from '../../core/design-system/typography/director.ts';
import { FontRegistry } from '../../core/design-system/typography/registry.ts';
import { ReferenceStudyEngine } from '../../core/design-knowledge/study.ts';
import { ArtifactValidator } from '../../core/validation/validator.ts';

export async function runEditorialCompositionTest() {
  console.log('----------------------------------------------------');
  console.log('  TEST SUITE: EDITABLE EDITORIAL COMPOSITION SYSTEM ');
  console.log('----------------------------------------------------');

  const validator = new ArtifactValidator();

  // 1. Zero Raft References Across Repository Test
  {
    const targetDirs = ['core', 'skills', 'templates', 'tests'];
    const raftRegex = /\braft\b/i;
    let foundRaft = false;
    const violations: string[] = [];

    function scanDir(dirPath: string) {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(ts|js|json|md|html|css)$/.test(entry.name) && entry.name !== 'editorial_composition.test.ts') {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (raftRegex.test(line)) {
              // Ignore matches inside words like 'kraft', 'craft', or 'draft'
              const words = line.split(/[^a-zA-Z0-9_-]+/);
              if (words.some((w) => w.toLowerCase() === 'raft')) {
                foundRaft = true;
                violations.push(`${fullPath}:${idx + 1}: ${line.trim()}`);
              }
            }
          });
        }
      }
    }

    const baseDir = path.resolve('c:/Users/Admin/Downloads/image creation/d8.7');
    for (const d of targetDirs) {
      scanDir(path.join(baseDir, d));
    }

    assert.strictEqual(
      foundRaft,
      false,
      `Raft references must be completely eliminated from the codebase! Found:\n${violations.join('\n')}`
    );
    console.log('  [PASS] Test 1: Complete elimination of Raft verified repository-wide (0 occurrences)');
  }

  // 2. PosterEditor Programmatic Semantic Editability via data-od-id
  {
    const sampleHtml = `
      <main class="poster-artboard" data-od-id="poster-root">
        <header class="poster-hero" data-od-id="hero-header">
          <div class="tape-badge" data-od-id="category-badge">ARCHITECTURE</div>
          <h1 class="poster-headline" data-od-id="headline">
            <span class="headline-sans" data-od-id="headline-sans">Your agent is a</span>
            <span class="headline-serif" data-od-id="headline-serif">graph</span>
          </h1>
          <p class="poster-subtext" data-od-id="supporting-copy">
            Three primitives run everything. Shared State, Nodes that do the work, and Edges.
          </p>
        </header>
        <section class="embedded-card" data-od-id="diagram">
          <img src="asset:diagram" alt="Architecture Graph" data-od-id="hero-image" />
        </section>
        <footer data-od-id="source-credit">@fullstackparody</footer>
      </main>
    `;

    // A. Inspect elements
    const elements = PosterEditor.inspectElements(sampleHtml);
    assert(elements.length >= 6, 'Must detect at least 6 editable semantic elements');
    const ids = PosterEditor.listEditableIds(sampleHtml);
    assert(ids.includes('headline'), 'Must include headline');
    assert(ids.includes('supporting-copy'), 'Must include supporting-copy');
    assert(ids.includes('hero-image'), 'Must include hero-image');
    assert(ids.includes('source-credit'), 'Must include source-credit');

    // B. Non-destructive content update
    const updatedHtml = PosterEditor.updateContent(
      sampleHtml,
      'supporting-copy',
      'Cyclic graph execution replaces linear chains for autonomous agent loops.'
    );
    assert(
      updatedHtml.includes('Cyclic graph execution replaces linear chains'),
      'Must successfully update element content by data-od-id'
    );
    assert(
      !updatedHtml.includes('Three primitives run everything'),
      'Old content must be cleanly replaced'
    );

    // C. Non-destructive attribute update
    const imgUpdatedHtml = PosterEditor.updateAttribute(
      sampleHtml,
      'hero-image',
      'src',
      'assets/real_agent_graph.png'
    );
    assert(
      imgUpdatedHtml.includes('src="assets/real_agent_graph.png"'),
      'Must update src attribute without modifying surrounding tags'
    );

    // D. Edit element helper
    const multiEditHtml = PosterEditor.editElement(sampleHtml, 'headline-serif', {
      text: 'state machine'
    });
    assert(
      multiEditHtml.includes('<span class="headline-serif" data-od-id="headline-serif">state machine</span>'),
      'Must update selective accent text cleanly'
    );

    console.log('  [PASS] Test 2: PosterEditor semantic editability by data-od-id verified');
  }

  // 3. Selective Accent Typography Validation
  {
    const director = new TypographyDirector();
    const reco = director.recommendSystem({
      subject: 'LangGraph Multi-Agent Architecture'
    });

    assert(reco.display, 'Must have display font definition');
    assert(reco.accent, 'Must recommend selective accent font definition');
    assert.strictEqual(
      reco.accent.family,
      'Instrument Serif',
      'Accent font should recommend expressive serif for editorial accenting'
    );
    assert(
      reco.googleFontLink.includes('Instrument+Serif'),
      'Google Font link must include Instrument Serif'
    );

    // Verify that selective accent headlines pass anti-slop validation without Hallmark violation
    const selectiveAccentHtml = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline" data-od-id="headline">
          Save this for your <span class="headline-serif"><em>next build</em></span>
        </h1>
        <p class="poster-subtext" data-od-id="supporting-copy">Follow for more AI tooling, decoded.</p>
      </div>
    `;
    const selectiveAccentCss = `
      .poster-artboard { width: 1080px; height: 1440px; background: #d8bc98; }
      .poster-headline { font-size: 88px; font-weight: 800; font-family: 'Syne', sans-serif; }
      .headline-serif em { font-family: 'Instrument Serif', serif; font-style: italic; color: #c8522c; }
      .poster-subtext { font-size: 28px; color: #333; }
    `;

    const res = validator.validateAntiSlop(selectiveAccentHtml, selectiveAccentCss);
    assert.strictEqual(res.slopDetected, false, 'Selective accent typography must pass validation');
    assert(
      !res.violations.some((v) => v.includes('Hallmark Typography violation')),
      'Must not trigger Hallmark violation for selective accent words'
    );

    // Fully-italic heading must still be flagged
    const fullItalicHtml = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline"><em>ALL ITALIC HEADING WITHOUT DISPLAY CONTRAST</em></h1>
      </div>
    `;
    const fullItalicCss = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-size: 80px; }
    `;
    const failRes = validator.validateAntiSlop(fullItalicHtml, fullItalicCss);
    assert.strictEqual(failRes.slopDetected, true, 'Fully italic heading must be flagged');
    assert(
      failRes.violations.some((v) => v.includes('entirely wrapped in <em>')),
      'Must flag entirely italic headings'
    );

    console.log('  [PASS] Test 3: Selective accent typography supported and fully-italic headings properly gated');
  }

  // 4. Anti-Template Acceptance Test (Preventing Rigid Layout Skeletons)
  {
    const studyEngine = new ReferenceStudyEngine();

    // Subject A: Video editing with physical tool
    const studyA = studyEngine.analyzeRequest('Claude Code video editing with physical clapperboard', 'p_a');
    // Subject B: Multi-agent cyclic graph
    const studyB = studyEngine.analyzeRequest('LangGraph multi-agent architecture and state machines', 'p_b');
    // Subject C: Speech-to-text audio telemetry
    const studyC = studyEngine.analyzeRequest('ElevenLabs Scribe speech-to-text model release', 'p_c');

    // Verify dynamic queries are not rigid template strings
    assert.notStrictEqual(
      studyA.searchKeywords[0],
      studyB.searchKeywords[0],
      'Search queries must be dynamic and subject-derived'
    );
    assert.notStrictEqual(
      studyB.searchKeywords[0],
      studyC.searchKeywords[0],
      'Queries across different technical topics must vary organically'
    );

    // Verify each subject independently determines image intent
    assert.strictEqual(studyA.imageIntent, 'image_required', 'Video clapperboard demands hero photo');
    assert.strictEqual(studyB.imageIntent, 'image_optional', 'LangGraph architecture can be diagrammatic');

    console.log('  [PASS] Test 4: Anti-Template acceptance verified (no rigid layout skeletons or fixed keywords)');
  }

  // 5. Strict 3:4 Integer Ratio Validation
  {
    const dimPass = validator.validatePosterDimensions(1080, 1440);
    assert.strictEqual(dimPass.valid, true, '1080x1440 must be valid 3:4 integer ratio');

    const dimFail = validator.validatePosterDimensions(1080, 1080);
    assert.strictEqual(dimFail.valid, false, '1080x1080 must fail poster 3:4 check');

    console.log('  [PASS] Test 5: Strict 3:4 integer ratio contract verified (1080x1440)');
  }

  console.log('====================================================');
  console.log('  ALL EDITABLE EDITORIAL COMPOSITION TESTS PASSED!  ');
  console.log('====================================================\n');
}

if (process.argv[1]?.endsWith('editorial_composition.test.ts')) {
  runEditorialCompositionTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
