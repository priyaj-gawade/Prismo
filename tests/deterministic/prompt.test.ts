import { PromptComposer } from '../../core/prompt/composer.ts';
import { DesignSystemParser } from '../../core/design-system/parser.ts';
import { TokenGenerator } from '../../core/design-system/tokens.ts';
import { DESIGN_PRESETS } from '../../core/design-system/presets.ts';
import { SkillRegistry } from '../../core/skills/registry.ts';
import { ArtifactValidator } from '../../core/validation/validator.ts';

export async function runPromptAndDesignTest(): Promise<boolean> {
  console.log('--- Testing Prompt Composition, Design System, Skills & Validation ---');

  // 1. Design System Parser & Presets
  const modernDark = DESIGN_PRESETS['modern-dark'];
  if (!modernDark || modernDark.colors.background !== '#0B0F17') {
    throw new Error('Modern Dark preset missing or incorrect');
  }

  const parser = new DesignSystemParser();
  const serialized = parser.serialize(modernDark);
  if (!serialized.includes('# Modern Dark Tech') || (!serialized.includes(`--primary: ${modernDark.colors.primary}`) && !serialized.includes(`primary: ${modernDark.colors.primary}`))) {
    throw new Error('DesignSystemParser serialization failed');
  }

  const parsed = parser.parse(serialized);
  if (parsed.colors['primary'] !== modernDark.colors.primary || parsed.colors['background'] !== '#0B0F17') {
    throw new Error('DesignSystemParser deserialization failed');
  }
  console.log('  [PASS] DesignSystemParser serialization & deserialization verified');

  // 2. Token Generator
  const tokenGen = new TokenGenerator();
  const cssTokens = tokenGen.generateCss(modernDark);
  const tokenValidation = tokenGen.validateTokens(cssTokens);
  if (!tokenValidation.valid || !cssTokens.includes(`--color-primary: ${modernDark.colors.primary};`)) {
    throw new Error(`Token generation or validation failed: ${JSON.stringify(tokenValidation.errors)}`);
  }
  console.log('  [PASS] TokenGenerator CSS variables generation and syntax validation verified');

  // 3. Skill Registry
  const skillRegistry = new SkillRegistry();
  const posterSkill = skillRegistry.getSkill('poster');

  if (!posterSkill) {
    throw new Error('Shipped poster skill failed to load from markdown');
  }
  console.log('  [PASS] SkillRegistry loaded shipped poster skill');

  // 4. Prompt Composer (Strict 10-Layer sequence)
  const composer = new PromptComposer();
  const composed = composer.compose({
    baseInstructions: 'Base Engine Standard',
    persistentMemory: 'User prefers dark mode',
    userInstructions: 'Keep code concise',
    projectInstructions: 'Brand name: Acorn',
    designMd: serialized,
    tokensCss: cssTokens,
    componentManifest: 'Buttons and Cards',
    universalRules: ['Mandatory data-od-id on all elements'],
    skill: posterSkill,
    workspaceFiles: [
      { path: 'index.html', size: 1024 },
      { path: 'styles.css', size: 2048 }
    ],
    retrievedContext: '## Retrieved Project Context\n- Hero button style',
    userPrompt: 'Generate a landing page for our new cloud product',
    refinementSectionId: 'hero-section'
  });

  if (!composed.systemInstruction.includes('## Layer 1: Core Base Instructions') ||
      !composed.systemInstruction.includes('## Layer 2: User & Aesthetic Memory') ||
      !composed.systemInstruction.includes('## Layer 5: Design System Specification') ||
      !composed.systemInstruction.includes('## Layer 9: Active Skill: poster')) {
    throw new Error('PromptComposer failed to assemble expected layer headers');
  }

  if (!composed.userMessage.includes('## Layer 10: Workspace Filesystem Tree') ||
      !composed.userMessage.includes('data-od-id="hero-section"') ||
      !composed.userMessage.includes('Generate a landing page for our new cloud product')) {
    throw new Error('PromptComposer user message structure failed');
  }

  const includedLayers = composed.layerDiagnostic.filter((l) => l.included).length;
  if (includedLayers !== 10) {
    throw new Error(`Expected all 10 layers to be included, got ${includedLayers}`);
  }
  console.log('  [PASS] PromptComposer strict 10-layer sequence & diagnostics verified');

  // 5. Artifact Validator
  const validator = new ArtifactValidator();
  const testHtmlValid = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header data-od-id="header-nav"><nav data-od-id="main-nav">Nav</nav></header>
  <main data-od-id="main-content">
    <section data-od-id="hero-banner"><h1>Hero</h1></section>
  </main>
  <footer data-od-id="global-footer"><p>Footer</p></footer>
</body>
</html>`;

  const report = validator.validate(testHtmlValid, 'body { color: red; }');
  if (!report.valid || report.odIdCoverage.percentage < 100) {
    throw new Error(`Valid HTML failed validation: ${JSON.stringify(report)}`);
  }

  const testHtmlInvalid = `<div>Missing doctype and body`;
  const invalidReport = validator.validate(testHtmlInvalid);
  if (invalidReport.valid || invalidReport.errors.length === 0) {
    throw new Error('Invalid HTML passed validation unexpectedly');
  }
  console.log('  [PASS] ArtifactValidator accurately checks HTML tags, CSS braces, and data-od-id coverage');

  // 6. Dynamic Prompt Generator & Dynamic Palette Detection
  const { generateDynamicPrompt, DOMAIN_TOPICS, COLOR_PALETTES } = await import('./dynamic_prompt_generator.ts');
  const { detectDynamicPreset } = await import('../../core/design-system/presets.ts');

  const generated = generateDynamicPrompt();
  const lines = generated.prompt.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 4 || lines.length > 5) {
    throw new Error(`Dynamic prompt expected 4-5 lines, got ${lines.length}`);
  }
  if (!generated.topic || !generated.domain || !generated.colorTheme) {
    throw new Error('Dynamic prompt missing domain, topic or color theme');
  }

  // Test all color palette directives in detectDynamicPreset
  for (const pal of COLOR_PALETTES) {
    const detected = detectDynamicPreset(`create a carousel with ${pal.directive}`);
    if (!detected) {
      throw new Error(`detectDynamicPreset failed to detect color palette: ${pal.directive}`);
    }
  }
  console.log(`  [PASS] Dynamic prompt generator & ${COLOR_PALETTES.length} dynamic color palettes verified`);

  console.log('Prompt & Design System tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('prompt.test.ts')) {
  runPromptAndDesignTest().catch(console.error);
}
