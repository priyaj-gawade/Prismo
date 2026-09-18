import fs from 'node:fs';
import path from 'node:path';
import { ProjectWorkspace } from '../../core/workspace/workspace.ts';
import { DeterministicContextRetriever } from '../../core/retrieval/retriever.ts';
import { MarkdownMemoryStore } from '../../core/memory/store.ts';

export async function runRetrievalTest(): Promise<boolean> {
  console.log('--- Testing Deterministic Multi-Source Context Retrieval ---');

  const testRoot = path.resolve('d8.7-test-retrieval-proj');
  fs.mkdirSync(testRoot, { recursive: true });

  const workspace = new ProjectWorkspace(testRoot);
  await workspace.initializeStarterFiles('Retrieval Test Project');

  // Add rich DESIGN.md with distinct sections
  const designMd = `# Design System Specification

## Color Palette
Primary: #6366F1 (Indigo)
Secondary: #10B981 (Emerald)
Background: #0F172A (Deep Slate)
Surface: #1E293B

## Typography
Font Family: Outfit, Inter, system-ui
Headings: font-weight 700, letter-spacing -0.02em
Body: font-weight 400, line-height 1.6

## Spacing Rules
Base unit: 4px. Use 16px (1rem), 24px (1.5rem), 32px (2rem) rhythm.
`;
  fs.writeFileSync(path.join(testRoot, 'DESIGN.md'), designMd, 'utf8');

  // Add rich index.html with data-od-id sections
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Retrieval Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header data-od-id="main_nav_bar">
    <nav><a href="#home">Home</a><a href="#features">Features</a></nav>
  </header>
  <section data-od-id="hero_banner_section">
    <h1>Supercharge Your Workflow</h1>
    <p>The next-generation platform for high-performance design.</p>
    <button data-od-id="hero_cta_button" class="btn-primary">Get Started</button>
  </section>
  <footer data-od-id="global_footer">
    <p>&copy; 2026 Test Engine</p>
  </footer>
</body>
</html>`;
  fs.writeFileSync(path.join(testRoot, 'index.html'), indexHtml, 'utf8');

  const testMemDir = path.join(testRoot, 'memory');
  const memoryStore = new MarkdownMemoryStore(testMemDir);
  await memoryStore.saveEntry('user', 'font-pref', 'Font Selection', 'User loves using Outfit font for modern tech sites.');

  const retriever = new DeterministicContextRetriever();

  // Test 1: Query for Typography
  const typoResults = await retriever.retrieve('typography and fonts', workspace, memoryStore);
  if (typoResults.length === 0) {
    throw new Error('Retriever returned empty results for typography query');
  }

  const topSource = typoResults[0];
  const containsFontOrTypo = (topSource.sectionHeading || '').toLowerCase().includes('typography') ||
                             (topSource.content || '').toLowerCase().includes('outfit') ||
                             (topSource.content || '').toLowerCase().includes('font');
  if (!containsFontOrTypo) {
    throw new Error(`Top ranked result did not match typography: ${JSON.stringify(topSource)}`);
  }
  console.log(`  [PASS] Typography query accurately ranked relevant section (Score: ${topSource.score})`);

  // Test 2: Query for Hero CTA Button
  const heroResults = await retriever.retrieve('hero cta button', workspace, memoryStore);
  if (heroResults.length === 0) {
    throw new Error('Retriever returned empty results for hero query');
  }

  const hasHeroMatch = heroResults.some((r) => (r.content || '').includes('hero_cta_button') || (r.sectionHeading || '').includes('hero'));
  if (!hasHeroMatch) {
    throw new Error('Retriever failed to score hero section snippet');
  }
  console.log('  [PASS] HTML section-level data-od-id snippet accurately retrieved and ranked');

  // Test 3: Markdown formatting
  const formattedMd = retriever.formatAsMarkdown(heroResults.slice(0, 3));
  if (!formattedMd.includes('## Retrieved Project Context') || !formattedMd.includes('### [')) {
    throw new Error('Retrieved context markdown formatting failed');
  }
  console.log('  [PASS] Formatted prompt markdown block verified');

  // Clean up
  fs.rmSync(testRoot, { recursive: true, force: true });
  console.log('Retrieval tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('retrieval.test.ts')) {
  runRetrievalTest().catch(console.error);
}
