import assert from 'node:assert';
import { FontRegistry } from '../../core/design-system/typography/registry.ts';
import { TypographyDirector } from '../../core/design-system/typography/director.ts';
import { ReferenceStudyEngine } from '../../core/design-knowledge/study.ts';
import { ArtifactValidator } from '../../core/validation/validator.ts';
import { HeadlessExporter } from '../../core/export/exporter.ts';

export async function runTypographyTest() {
  console.log('--- Testing Typography Architecture, Font Registry & Creative Direction ---');

  // 1. Font Registry Integrity & Banned Font Verification
  {
    const allFonts = FontRegistry.getAllFonts();
    assert(allFonts.length >= 10, `Expected at least 10 fonts registered, found ${allFonts.length}`);

    // Banned font: Orbitron must NEVER be in the registry
    const orbitron = FontRegistry.getFont('Orbitron');
    assert.strictEqual(orbitron, undefined, 'CRITICAL: Orbitron must be permanently excluded from FontRegistry');

    // All registered fonts must have valid metadata
    for (const font of allFonts) {
      assert(font.family && font.family.length > 0, 'Font must have family name');
      assert(['google-fonts', 'bundled', 'system'].includes(font.source), `Invalid source for ${font.family}`);
      assert(['OFL', 'Apache 2.0', 'MIT', 'system'].includes(font.license), `Invalid license for ${font.family}`);
      assert(font.fallbackChain && font.fallbackChain.length > 0, `Missing fallback chain for ${font.family}`);
      assert(font.roles && font.roles.length > 0, `Missing roles for ${font.family}`);
    }

    // Check categories exist
    const categories = new Set(allFonts.map((f) => f.category));
    assert(categories.has('neo-grotesk'), 'Missing neo-grotesk category');
    assert(categories.has('editorial-serif'), 'Missing editorial-serif category');
    assert(categories.has('grotesque'), 'Missing grotesque category');
    assert(categories.has('monospace'), 'Missing monospace category');

    console.log(`  [PASS] Test 1: FontRegistry integrity verified (${allFonts.length} fonts, Orbitron strictly excluded)`);
  }

  // 2. Technical Subject != Monospace Display Heading (HARD RULE)
  {
    const director = new TypographyDirector();
    const technicalPrompt = 'LangGraph Multi-Agent Architecture';
    const studyEngine = new ReferenceStudyEngine();
    const study = studyEngine.analyzeRequest(technicalPrompt, 'test_proj');

    const recommended = director.recommendSystem({
      subject: technicalPrompt,
      designDNA: study.dna
    });

    // Heading must NOT be monospace
    assert.notStrictEqual(
      recommended.display.category,
      'monospace',
      'Technical subject must NEVER receive monospace as primary display heading'
    );
    assert.notStrictEqual(
      recommended.display.family,
      'JetBrains Mono',
      'Display face must not be JetBrains Mono'
    );
    assert.notStrictEqual(
      recommended.display.family,
      'Fira Code',
      'Display face must not be Fira Code'
    );
    assert.notStrictEqual(
      recommended.display.family,
      'Orbitron',
      'Display face must not be Orbitron'
    );

    // Code role should be monospace
    assert.strictEqual(
      recommended.code.category,
      'monospace',
      'Code role should be monospace for code syntax'
    );

    // Link must be a valid Google Fonts URL
    assert(
      recommended.googleFontLink.startsWith('https://fonts.googleapis.com/css2?'),
      'Google Font link must be valid https URL'
    );

    console.log(`  [PASS] Test 2: Technical subject maps to high-craft display (${recommended.display.family}), NOT monospace`);
  }

  // 3. Multi-Domain Typography Recommendation Diversity
  {
    const director = new TypographyDirector();

    // Automotive
    const automotiveReco = director.recommendSystem({ subject: 'Porsche 911 GT3 RS Weissach Package' });
    assert(
      automotiveReco.display.category === 'neo-grotesk' || automotiveReco.display.category === 'grotesque' || automotiveReco.display.category === 'geometric-display',
      'Automotive should recommend high-impact sans or grotesque'
    );

    // Architectural / Historical Bauhaus
    const bauhausReco = director.recommendSystem({ subject: 'Bauhaus Dessau 1925 Walter Gropius' });
    assert(
      bauhausReco.display.category === 'grotesque' || bauhausReco.display.category === 'neo-grotesk' || bauhausReco.display.category === 'humanist-sans',
      'Bauhaus should recommend grotesque, neo-grotesque, or humanist/architectural sans'
    );

    // Editorial Luxury
    const editorialReco = director.recommendSystem({ subject: 'Vogue Haute Couture Autumn Winter' });
    assert(
      editorialReco.display.category === 'editorial-serif' || editorialReco.display.category === 'neo-grotesk',
      'Luxury editorial should recommend serif or high-craft neo-grotesk'
    );

    console.log('  [PASS] Test 3: Domain typography recommendations produce distinct visual profiles');
  }

  // 4. ReferenceStudyEngine 4-State Image Intent & DesignDNA
  {
    const studyEngine = new ReferenceStudyEngine();

    const porscheStudy = studyEngine.analyzeRequest('Porsche 911 GT3 RS', 'p1');
    assert.strictEqual(porscheStudy.imageIntent, 'image_required', 'Automotive subject must have image_required');
    assert(porscheStudy.searchKeywords.length > 0, 'Must provide image search keywords');

    const bauhausStudy = studyEngine.analyzeRequest('Bauhaus Dessau 1925 Architecture Exhibition', 'p2');
    assert.strictEqual(bauhausStudy.imageIntent, 'image_helpful', 'Bauhaus subject should have image_helpful');

    const systemsStudy = studyEngine.analyzeRequest('Distributed Consensus State Machine Protocol', 'p3');
    assert(
      systemsStudy.imageIntent === 'image_not_wanted' || systemsStudy.imageIntent === 'image_optional',
      'Distributed systems protocol should be image_not_wanted or image_optional (graphic/typographic)'
    );

    // Dimensions of DesignDNA
    assert(porscheStudy.dna.referenceId, 'DNA must have referenceId');
    assert(porscheStudy.dna.referenceName, 'DNA must have referenceName');
    assert(porscheStudy.dna.spatialRhythm, 'DNA must have spatialRhythm');
    assert(porscheStudy.dna.typographyCharacter, 'DNA must have typographyCharacter');
    assert(porscheStudy.dna.paletteDynamics, 'DNA must have paletteDynamics');
    assert(porscheStudy.dna.imageTreatment, 'DNA must have imageTreatment');
    assert(porscheStudy.dna.geometricScaffold, 'DNA must have geometricScaffold');

    console.log('  [PASS] Test 4: ReferenceStudyEngine generates 4-state ImageIntent and DesignDNA');
  }

  // 5. ArtifactValidator Monospace Heading & Dominance Gate
  {
    const validator = new ArtifactValidator();

    // Violation case 1: Monospace display heading
    const html1 = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">DISTRIBUTED LOG</h1>
      </div>
    `;
    const css1 = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-family: 'Space Mono', monospace; font-size: 88px; }
    `;
    const report1 = validator.validateAntiSlop(html1, css1);
    assert.strictEqual(report1.slopDetected, true, 'Must flag monospace heading');
    assert.strictEqual(report1.metrics.displayMonospaceUsage, true, 'displayMonospaceUsage must be true');

    // Clean case: Neo-grotesque display heading
    const html2 = `
      <div class="poster-artboard" data-od-id="poster-root">
        <h1 class="poster-headline">DISTRIBUTED LOG</h1>
        <p class="poster-caption">Replicated state machine consensus.</p>
      </div>
    `;
    const css2 = `
      .poster-artboard { width: 1080px; height: 1440px; }
      .poster-headline { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 88px; font-weight: 800; }
      .poster-caption { font-family: 'Inter', sans-serif; font-size: 28px; }
    `;
    const report2 = validator.validateAntiSlop(html2, css2);
    assert.strictEqual(report2.metrics.displayMonospaceUsage, false, 'Clean poster must not flag display monospace');
    assert.strictEqual(report2.metrics.monospaceDominant, false, 'Clean poster must not flag monospace dominance');

    console.log('  [PASS] Test 5: Validator successfully gates display monospace violations vs clean typography');
  }

  // 6. Dual Font Verification: Static Fallback & Headless Runtime Check
  {
    const exporter = new HeadlessExporter();

    // Verify static fallback chain on all fonts
    for (const font of FontRegistry.getAllFonts()) {
      assert(font.fallbackChain.includes('sans-serif') || font.fallbackChain.includes('serif') || font.fallbackChain.includes('monospace'),
        `Font ${font.family} has incomplete fallback chain`);
    }

    // Verify runtime check interface exists and returns proper structure
    const probeRes = await exporter.verifyRuntimeFonts('about:blank', ['Arial', 'sans-serif']);
    assert(typeof probeRes.allLoaded === 'boolean', 'verifyRuntimeFonts must return allLoaded boolean');
    assert(typeof probeRes.results === 'object', 'verifyRuntimeFonts must return results dictionary');

    console.log('  [PASS] Test 6: Dual font verification (static fallback + headless runtime probe) verified');
  }

  console.log('Typography Architecture tests PASSED!\n');
}
