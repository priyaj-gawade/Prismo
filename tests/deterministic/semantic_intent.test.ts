import { ReferenceStudyEngine } from '../../core/design-knowledge/study.ts';
import { ArtifactValidator } from '../../core/validation/validator.ts';

export async function runSemanticIntentTests(): Promise<void> {
  console.log('\n----------------------------------------------------');
  console.log('  TEST SUITE: SEMANTIC VISUAL INTENT & QUERY SYNTHESIS');
  console.log('----------------------------------------------------');

  const engine = new ReferenceStudyEngine();
  const validator = new ArtifactValidator();

  // Test 1: Natural Language Visual Mandate Detection
  const userBookTalkPrompt = 'poster design, clean layout, minimal style, professional tone, for organizing a book talk event name "Genesis" with a suitable image';
  const bookTalkStudy = engine.studySubject(userBookTalkPrompt);

  if (bookTalkStudy.imageIntent !== 'image_required') {
    throw new Error(`Expected image_required for "${userBookTalkPrompt}", got ${bookTalkStudy.imageIntent}`);
  }
  if (!bookTalkStudy.explicitImageRequested) {
    throw new Error('Expected explicitImageRequested === true for prompt containing "with a suitable image"');
  }
  console.log('  [PASS] Test 1A: "with a suitable image" successfully triggers image_required');

  const photoPhrases = [
    'Author meet-and-greet with picture of vintage library',
    'Tech launch event featuring photography of sleek hardware',
    'Minimalist architecture lecture with a photo',
    'Festival lineup with an image of stage lighting'
  ];

  for (const phrase of photoPhrases) {
    const study = engine.studySubject(phrase);
    if (study.imageIntent !== 'image_required' || !study.explicitImageRequested) {
      throw new Error(`Expected image_required for "${phrase}", got ${study.imageIntent}`);
    }
  }
  console.log('  [PASS] Test 1B: Diverse natural language photo phrases ("with picture", "featuring photography", "with a photo") verified');

  // Test 2: Explicit Negative Intent
  const negativePrompt = 'Design manifesto on software engineering: purely typographic, text only, no images';
  const negStudy = engine.studySubject(negativePrompt);
  if (negStudy.imageIntent !== 'image_not_wanted') {
    throw new Error(`Expected image_not_wanted for negative prompt, got ${negStudy.imageIntent}`);
  }
  console.log('  [PASS] Test 2: Negative intent ("purely typographic, text only, no images") sets image_not_wanted');

  // Test 3: Concrete Visual Query Synthesis (Eliminates meta-prompt noise)
  const synth = engine.synthesizeVisualQuery(userBookTalkPrompt);
  if (synth.primary.includes('poster design') || synth.primary.includes('clean layout') || synth.primary.includes('minimal style')) {
    throw new Error(`Synthesized query still contains meta-prompt noise: "${synth.primary}"`);
  }
  if (!synth.primary.toLowerCase().includes('book')) {
    throw new Error(`Synthesized query should target book/library domain, got "${synth.primary}"`);
  }
  console.log(`  [PASS] Test 3: Query synthesis cleaned meta-prompt noise -> Primary: "${synth.primary}"`);

  // Test 4: Constraint Hierarchy (Minimal style does NOT cancel image mandate)
  const minimalWithImagePrompt = 'Ultra minimal, clean, sparse, negative space poster with a suitable image of a sports car';
  const minimalStudy = engine.studySubject(minimalWithImagePrompt);
  if (minimalStudy.imageIntent !== 'image_required') {
    throw new Error(`Constraint Hierarchy violated: "minimal" style cancelled explicit image request`);
  }
  console.log('  [PASS] Test 4: Constraint Hierarchy verified (user image request strictly overrides "minimal" style)');

  // Test 5: Validator Image Contract Gate
  const missingImgHtml = `
    <main class="poster-artboard">
      <h1 class="poster-headline">GENESIS</h1>
      <p class="poster-subtext">An intimate conversation with author Elena Vance.</p>
      <div class="book-card-mockup">GENESIS BOOK</div>
    </main>
  `;
  const cleanCss = `
    .poster-artboard { width: 1080px; height: 1440px; }
    .poster-headline { font-size: 80px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .poster-subtext { font-size: 24px; }
  `;

  const flagged = validator.validateAntiSlop(missingImgHtml, cleanCss, {
    imageIntent: 'image_required',
    explicitImageRequested: true
  });

  if (!flagged.slopDetected || !flagged.metrics?.missingRequiredImage) {
    throw new Error('Validator failed to flag missing required image when image_required was passed');
  }
  console.log('  [PASS] Test 5A: Validator Image Contract gate catches missing <img> when image_required');

  const validImgHtml = `
    <main class="poster-artboard">
      <div class="poster-focal-frame">
        <img class="poster-bleed-image" src="asset:open vintage book dramatic library lighting" alt="Genesis book talk">
      </div>
      <h1 class="poster-headline">GENESIS</h1>
      <p class="poster-subtext">An intimate conversation with author Elena Vance.</p>
    </main>
  `;

  const validCheck = validator.validateAntiSlop(validImgHtml, cleanCss, {
    imageIntent: 'image_required',
    explicitImageRequested: true
  });

  if (validCheck.metrics?.missingRequiredImage) {
    throw new Error('Validator falsely flagged valid <img> as missing');
  }
  console.log('  [PASS] Test 5B: Valid poster with <img> passes Image Contract check cleanly');

  // Test 6: Broadened Automotive & High-Performance Editorial Domain Matching
  const automotiveAndEditorialPrompts = [
    { prompt: 'BMW M5: Sheer Driving Pleasure', expectedBrand: 'BMW' },
    { prompt: 'Ferrari F40 track tribute poster', expectedBrand: 'Ferrari' },
    { prompt: 'Mercedes AMG GT high performance coupe', expectedBrand: 'Mercedes' },
    { prompt: 'Rolex Submariner precision horology luxury timepiece', expectedBrand: 'luxury' },
    { prompt: 'Marathon runner breaking boundaries athletic exhibition', expectedBrand: 'athletic' },
    { prompt: 'Supersonic jet aviation aerospace innovation', expectedBrand: 'aerospace' }
  ];

  for (const item of automotiveAndEditorialPrompts) {
    const study = engine.studySubject(item.prompt);
    if (study.referenceId !== 'cinematic-editorial' || study.imageIntent !== 'image_required') {
      throw new Error(`Expected cinematic-editorial and image_required for "${item.prompt}", got ref=${study.referenceId}, intent=${study.imageIntent}`);
    }
  }
  console.log('  [PASS] Test 6: Broadened domain matching (BMW, Ferrari, AMG, Rolex, Athletics, Aerospace) verified');

  // Test 7: Directional Dark Scrim Contract & Validator
  const bleedImageNoScrimHtml = `
    <main class="poster-artboard">
      <div class="hero-image-container">
        <img class="poster-bleed-image" src="asset:BMW M5" alt="BMW M5">
      </div>
      <header class="poster-header">
        <div class="brand-tag">BAYERISCHE MOTOREN WERKE</div>
      </header>
      <div class="content-stack">
        <h1 class="poster-headline">SHEER DRIVING PLEASURE</h1>
        <p class="poster-subtext">Engineered with uncompromising precision.</p>
      </div>
    </main>
  `;
  const noScrimCss = `
    .poster-artboard { width: 1080px; height: 1440px; position: relative; }
    .poster-headline { font-size: 80px; }
  `;

  // Validator should flag missing directional scrim on full-bleed photo with text
  const scrimCheck = validator.validateAntiSlop(bleedImageNoScrimHtml, noScrimCss);
  if (!scrimCheck.metrics?.missingDirectionalScrim) {
    throw new Error('Validator failed to flag missing directional scrim on full-bleed image with text overlay');
  }
  console.log('  [PASS] Test 7A: Validator flags missing dark scrim on full-bleed image with text overlay');

  // Test 7B: Directional Scrim Safety Net auto-injection: text position == dark effect position
  // When top header + bottom content-stack exist -> scrim-dual
  const { PosterEngine } = await import('../../core/generation/poster.ts');
  const dummyEngine = new PosterEngine({
    workspaceManager: {} as any,
    providerManager: {} as any,
    assetManager: {} as any,
    memoryStore: {} as any,
    sessionTracker: {} as any
  });

  const injectedDual = dummyEngine.ensureDirectionalScrim(bleedImageNoScrimHtml, noScrimCss);
  if (!injectedDual.html.includes('scrim-dual') || !injectedDual.html.includes('poster-scrim')) {
    throw new Error('Directional scrim safety net failed to inject scrim-dual for dual-anchored text');
  }
  if (!injectedDual.css.includes('.scrim-dual') || !injectedDual.css.includes('.poster-scrim')) {
    throw new Error('Directional scrim safety net failed to inject scrim-dual CSS');
  }
  console.log('  [PASS] Test 7B: Scrim Safety Net successfully injected .scrim-dual matching dual text placement');

  // When bottom content only -> scrim-bottom
  const bottomOnlyHtml = `
    <main class="poster-artboard">
      <img class="poster-bleed-image" src="asset:Porsche 911" alt="Porsche">
      <div class="content-stack">
        <h1 class="poster-headline">THE ART OF PURE DOWNFORCE</h1>
      </div>
    </main>
  `;
  const injectedBottom = dummyEngine.ensureDirectionalScrim(bottomOnlyHtml, noScrimCss);
  if (!injectedBottom.html.includes('scrim-bottom')) {
    throw new Error('Directional scrim safety net failed to inject scrim-bottom for bottom text');
  }
  console.log('  [PASS] Test 7C: Scrim Safety Net successfully injected .scrim-bottom for bottom text');

  // When top header only -> scrim-top
  const topOnlyHtml = `
    <main class="poster-artboard">
      <img class="poster-bleed-image" src="asset:Supersonic Jet" alt="Jet">
      <header class="poster-header">
        <h1 class="poster-headline">SUPERSONIC AERODYNAMICS</h1>
      </header>
    </main>
  `;
  const injectedTop = dummyEngine.ensureDirectionalScrim(topOnlyHtml, noScrimCss);
  if (!injectedTop.html.includes('scrim-top')) {
    throw new Error('Directional scrim safety net failed to inject scrim-top for top-anchored text');
  }
  console.log('  [PASS] Test 7D: Scrim Safety Net successfully injected .scrim-top for top-anchored text');

  // Test 8: PosterTemplateRegistry matches motorsport-supercars template
  const { PosterTemplateRegistry } = await import('../../core/templates/posters.ts');
  const templateReg = new PosterTemplateRegistry();
  const matchedSupercarTpl = templateReg.findBestTemplate('BMW M5 track weapon with sheer driving pleasure');
  if (!matchedSupercarTpl || matchedSupercarTpl.meta.id !== 'motorsport-supercars') {
    throw new Error(`Expected PosterTemplateRegistry to match motorsport-supercars, got: ${matchedSupercarTpl?.meta.id}`);
  }
  console.log(`  [PASS] Test 8: PosterTemplateRegistry matched grounded template "${matchedSupercarTpl.meta.name}"`);

  console.log('====================================================');
  console.log('  ALL SEMANTIC VISUAL INTENT & SCRIM TESTS PASSED!  ');
  console.log('====================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSemanticIntentTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
