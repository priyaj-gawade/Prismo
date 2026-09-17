import { randomUUID } from 'node:crypto';
import type { GenerationInput, RefinementInput, GenerationResult } from '../contracts/engine.ts';
import type { WorkspaceManager } from '../workspace/workspace.ts';
import { PromptComposer } from '../prompt/composer.ts';
import type { GeminiProviderManager } from '../providers/manager.ts';
import type { MarkdownMemoryStore } from '../memory/store.ts';
import type { SessionTracker } from '../memory/session.ts';
import { FilesystemDiffEngine } from '../workspace/diff.ts';
import { VersioningEngine } from '../workspace/versioning.ts';
import { SkillRegistry } from '../skills/registry.ts';
import { ArtifactValidator } from '../validation/validator.ts';
import { PosterTemplateRegistry } from '../templates/posters.ts';

export class PosterEngine {
  private workspaceManager: WorkspaceManager;
  private providerManager: GeminiProviderManager;
  private promptComposer: PromptComposer;
  private memoryStore: MarkdownMemoryStore;
  private sessionTracker: SessionTracker;
  private diffEngine: FilesystemDiffEngine;
  private versioning: VersioningEngine;
  private skillRegistry: SkillRegistry;
  private templateRegistry: PosterTemplateRegistry;
  private validator: ArtifactValidator;

  constructor(dependencies: {
    workspaceManager: WorkspaceManager;
    providerManager: GeminiProviderManager;
    memoryStore: MarkdownMemoryStore;
    sessionTracker: SessionTracker;
  }) {
    this.workspaceManager = dependencies.workspaceManager;
    this.providerManager = dependencies.providerManager;
    this.memoryStore = dependencies.memoryStore;
    this.sessionTracker = dependencies.sessionTracker;

    this.promptComposer = new PromptComposer();
    this.diffEngine = new FilesystemDiffEngine();
    this.versioning = new VersioningEngine();
    this.skillRegistry = new SkillRegistry();
    this.templateRegistry = new PosterTemplateRegistry();
    this.validator = new ArtifactValidator();
  }

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const startTime = Date.now();
    const runId = `run_poster_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const project = this.workspaceManager.getProject(input.projectId);
    if (!project) throw new Error(`Project ${input.projectId} not found`);

    const projectRoot = project.rootPath;
    const preSnapshot = await this.diffEngine.snapshot(projectRoot);
    const skill = this.skillRegistry.getSkill('poster');

    // Strict 3:4 aspect ratio enforcement (canonical 1080 x 1440)
    const width = input.dimensions?.width || 1080;
    const height = input.dimensions?.height || 1440;

    const ratioCheck = this.validator.validatePosterDimensions(width, height);
    if (!ratioCheck.valid) {
      throw new Error(ratioCheck.error);
    }

    const posterPrompt = `${input.prompt}
CRITICAL POSTER REQUIREMENT:
Strict 3:4 Full-Bleed Canvas Dimensions: ${width}px x ${height}px.

STRUCTURE & LAYOUT RULES:
1. NO HEADER PILLS / BADGES: Do NOT generate top badge pills (e.g. "SYS.DOC // 02", "PROGRAMMING EXCELLENCE", "ARCHIVAL EDITION", "EST. 1974") or date tags. Start directly with the main headline/hero.
2. NO FOOTER SPEC BARS: Do NOT generate bottom telemetry bars, edition labels, fake URLs, or brand spec footers.
3. DYNAMIC VISUAL ARCHETYPE SELECTION:
   Dynamically choose the optimal layout composition based on prompt intent:
   - 🏗️ ARCHITECTURE & EXECUTION PIPELINES (Frameworks, APIs, Compilers, Workflows):
     Create horizontal/multi-step flow containers with step nodes (e.g. STEP 01 effect() -> STEP 02 track() -> STEP 03 trigger()), connector arrows, runtime badges, and code syntax cards.
   - 🍱 ASYMMETRIC BENTO GRIDS (Complex platforms, multi-feature products):
     Use a 12-column grid combining 1 large focal card (grid-column: span 12 or span 8) with 2-3 compact feature/metric cards (grid-column: span 6 or span 4).
   - 📊 METRIC & STAT INFOGRAPHICS (Numbers, benchmarks, research):
     Feature large bold KPI numbers (48px–64px), progress gauges, and stat callouts.
   - ⚖️ COMPARISON MATRICES (Left vs Right, Before vs After, Pro vs Con):
     Split 2-column side-by-side cards with highlight tags.
   - 📜 EDITORIAL FEATURE DECKS (Narratives, guides, facts):
     3–4 rich feature cards spanning the grid with custom accent borders and glassmorphism.
4. TYPOGRAPHY SCALING:
   - Main Headline: 64px–76px (bold, punchy, letter-spacing: -0.03em, word-break: break-word).
   - Subheading: 24px–28px (readable, clear line-height: 1.45).
   - Card Titles: 22px–26px (font-weight: 700).
   - Card Body: 17px–19px (line-height: 1.55).
   - DIAGRAMS / ARCHITECTURE FLOWS / STEP CARDS: Node titles MUST be 18px–22px, badges 15px–17px, connector arrows 20px–24px.
   - ABSOLUTE MINIMUM FONT SIZE: NEVER use font sizes below 16px anywhere.

The document MUST contain:
<body>
  <main class="poster-artboard" data-od-id="poster-root">
    <div class="poster-backdrop" data-od-id="poster-bg"></div>
    <div class="poster-content" data-od-id="poster-body">
      <header class="poster-hero" data-od-id="poster-hero">
        <h1 class="poster-headline" data-od-id="poster-headline">Title</h1>
        <p class="poster-subtext" data-od-id="poster-subtext">Subtitle</p>
      </header>
      <section class="poster-grid" data-od-id="poster-grid">
        <!-- Dynamic Bento cards, architecture execution pipelines, metric blocks, or feature decks -->
      </section>
    </div>
  </main>
</body>

Mandatory CSS Requirements:
* { box-sizing: border-box; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: ${width}px !important;
  height: ${height}px !important;
  overflow: hidden !important;
  background: transparent;
}
.poster-artboard {
  width: ${width}px;
  height: ${height}px;
  margin: 0;
  padding: 64px 60px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.poster-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 24px;
  position: relative;
  z-index: 10;
}
.poster-hero {
  flex-shrink: 0;
}
.poster-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}
.poster-grid > * {
  height: 100%;
}
/* Individual cards, pipeline containers, or bento blocks should have tight uniform gap (20px), stretch to fill height, and have generous internal padding (24px to 32px) */

Ensure you output BOTH:
1. \`\`\`html:index.html\`\`\`
2. \`\`\`css:styles.css\`\`\` with COMPLETE visual styling for all classes in the poster.`;

    const activeMemory = await this.memoryStore.readActiveMemory();
    const designMd = this.workspaceManager.readFile(input.projectId, 'DESIGN.md') || undefined;
    const tokensCss = this.workspaceManager.readFile(input.projectId, 'tokens.css') || undefined;

    const templateGroundedContext = this.templateRegistry.formatGroundedContext(input.prompt);

    const composed = this.promptComposer.compose({
      persistentMemory: activeMemory,
      projectInstructions: `Strict 3:4 Canvas Dimensions: ${width}x${height}`,
      designMd,
      tokensCss,
      templateGroundedContext,
      skill,
      userPrompt: posterPrompt
    });

    const llmResponse = await this.providerManager.generateText({
      model: 'gemini-3.5-flash-lite',
      systemInstruction: composed.systemInstruction,
      prompt: composed.userMessage
    });

    let files = this.extractCodeFiles(llmResponse.text);
    for (const [filename, content] of Object.entries(files)) {
      this.workspaceManager.writeFile(input.projectId, filename, content);
    }

    let htmlContent = this.workspaceManager.readFile(input.projectId, 'index.html') || '';
    let cssContent = this.workspaceManager.readFile(input.projectId, 'styles.css') || '';

    // Bounded agent correction turn if CSS is incomplete
    let validation = this.validator.validate(htmlContent, cssContent, 'poster');
    const isCssIncomplete = !cssContent ||
      cssContent.length < 100 ||
      (validation.selectorCoverage && validation.selectorCoverage.coverageRatio < 0.35);

    if (isCssIncomplete) {
      const missing = validation.selectorCoverage?.missingKeyClasses || [];
      const correctionPrompt = `CRITICAL FORMAT CORRECTION:
Your generated poster HTML in index.html is missing matching CSS styles in styles.css.
Key unstyled classes: ${missing.slice(0, 15).join(', ')}

Output the COMPLETE \`\`\`css:styles.css\`\`\` stylesheet now for the 1080x1440 poster.
Ensure .poster-artboard has width: ${width}px; height: ${height}px; overflow: hidden; with full graphic design, typography, and styling.`;

      try {
        const corrResponse = await this.providerManager.generateText({
          model: 'gemini-3.5-flash-lite',
          systemInstruction: 'You are an expert poster designer. Output complete, production-grade styles.css for a 3:4 poster.',
          prompt: correctionPrompt
        });
        const corrFiles = this.extractCodeFiles(corrResponse.text);
        if (corrFiles['styles.css']) {
          this.workspaceManager.writeFile(input.projectId, 'styles.css', corrFiles['styles.css']);
          cssContent = corrFiles['styles.css'];
          files['styles.css'] = cssContent;
        }
      } catch (err) {
        console.warn('[PosterEngine] Bounded correction turn failed:', err);
      }
    }

    // Mechanical syntax checks
    if (!htmlContent.includes('styles.css') && htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', '  <link rel="stylesheet" href="styles.css">\n</head>');
      this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
    }
    if (!htmlContent.includes('tokens.css') && htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', '  <link rel="stylesheet" href="tokens.css">\n</head>');
      this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
    }

    const postSnapshot = await this.diffEngine.snapshot(projectRoot);
    const changes = this.diffEngine.computeDiff(preSnapshot, postSnapshot);

    if (changes.length > 0) {
      const v = await this.versioning.createVersion(projectRoot, `Poster generate: ${input.prompt.slice(0, 40)}`, runId);
      this.workspaceManager.updateProjectMetadata(input.projectId, { version: v.version });
    }

    return {
      runId,
      projectId: input.projectId,
      target: 'poster',
      status: 'succeeded',
      changedFiles: changes,
      allFiles: this.workspaceManager.listFiles(input.projectId).map((f) => f.path),
      entryHtmlFile: 'index.html',
      previewUrl: `/projects/${input.projectId}/index.html`,
      diagnostics: {
        model: llmResponse.model,
        accountId: llmResponse.accountId,
        durationMs: Date.now() - startTime,
        fallbackOccurred: false,
        stockProvidersUsed: []
      }
    };
  }

  async refine(input: RefinementInput): Promise<GenerationResult> {
    const startTime = Date.now();
    const runId = `refine_poster_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const project = this.workspaceManager.getProject(input.projectId);
    if (!project) throw new Error(`Project ${input.projectId} not found`);

    const projectRoot = project.rootPath;
    const preSnapshot = await this.diffEngine.snapshot(projectRoot);
    const skill = this.skillRegistry.getSkill('poster');

    const activeMemory = await this.memoryStore.readActiveMemory();
    const designMd = this.workspaceManager.readFile(input.projectId, 'DESIGN.md') || undefined;
    const tokensCss = this.workspaceManager.readFile(input.projectId, 'tokens.css') || undefined;
    const workspaceFiles = this.workspaceManager.listFiles(input.projectId);

    const composed = this.promptComposer.compose({
      persistentMemory: activeMemory,
      projectInstructions: project.instructions,
      designMd,
      tokensCss,
      skill,
      workspaceFiles,
      userPrompt: input.instruction,
      refinementSectionId: input.targetElementId
    });

    const llmResponse = await this.providerManager.generateText({
      model: 'gemini-3.5-flash-lite',
      systemInstruction: composed.systemInstruction,
      prompt: composed.userMessage
    });

    const files = this.extractCodeFiles(llmResponse.text);
    for (const [filename, content] of Object.entries(files)) {
      this.workspaceManager.writeFile(input.projectId, filename, content);
    }

    const postSnapshot = await this.diffEngine.snapshot(projectRoot);
    const changes = this.diffEngine.computeDiff(preSnapshot, postSnapshot);

    if (changes.length > 0) {
      const v = await this.versioning.createVersion(projectRoot, `Poster refine: ${input.instruction.slice(0, 40)}`, runId);
      this.workspaceManager.updateProjectMetadata(input.projectId, { version: v.version });
    }

    return {
      runId,
      projectId: input.projectId,
      target: 'poster',
      status: 'succeeded',
      changedFiles: changes,
      allFiles: this.workspaceManager.listFiles(input.projectId).map((f) => f.path),
      entryHtmlFile: 'index.html',
      previewUrl: `/projects/${input.projectId}/index.html`,
      diagnostics: {
        model: llmResponse.model,
        accountId: llmResponse.accountId,
        durationMs: Date.now() - startTime,
        fallbackOccurred: false,
        stockProvidersUsed: []
      }
    };
  }

  private extractCodeFiles(response: string): Record<string, string> {
    const files: Record<string, string> = {};

    // 1. First pass: Match standard closed code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_\-]+)?(?::([^\r\n]+))?\r?\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const lang = (match[1] || '').toLowerCase();
      const filenameHint = (match[2] || '').trim();
      let code = match[3].trim();

      code = code.replace(/^```[a-zA-Z0-9_\-:]*\r?\n/, '').replace(/\r?\n```$/, '');

      if (filenameHint) {
        files[filenameHint] = code;
      } else if (lang === 'html' || code.includes('<!DOCTYPE') || code.includes('<html')) {
        files['index.html'] = code;
      } else if (lang === 'css' || code.includes(':root') || code.includes('.poster-artboard')) {
        files['styles.css'] = code;
      } else if (lang === 'javascript' || lang === 'js') {
        files['script.js'] = code;
      }
    }

    // 2. Second pass: Handle unclosed blocks
    if (!files['index.html'] && (response.includes('```html') || response.includes('<!DOCTYPE html>') || response.includes('<html'))) {
      const htmlBlockMatch = response.match(/```html(?::[^\r\n]+)?\r?\n([\s\S]*?)(?:```|$)/i);
      if (htmlBlockMatch && htmlBlockMatch[1] && htmlBlockMatch[1].trim()) {
        files['index.html'] = htmlBlockMatch[1].trim();
      } else if (response.includes('<!DOCTYPE html>')) {
        const docStart = response.indexOf('<!DOCTYPE html>');
        let rawHtml = response.slice(docStart);
        const fenceEnd = rawHtml.indexOf('```');
        if (fenceEnd !== -1) {
          rawHtml = rawHtml.slice(0, fenceEnd);
        }
        files['index.html'] = rawHtml.trim();
      }
    }

    if (!files['styles.css'] && response.includes('```css')) {
      const cssBlockMatch = response.match(/```css(?::[^\r\n]+)?\r?\n([\s\S]*?)(?:```|$)/i);
      if (cssBlockMatch && cssBlockMatch[1] && cssBlockMatch[1].trim()) {
        files['styles.css'] = cssBlockMatch[1].trim();
      }
    }

    // 3. Extract inline <style>...</style> if styles.css wasn't explicitly output
    if (files['index.html']) {
      const styleMatches = files['index.html'].matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const extractedStyles: string[] = [];
      for (const sm of styleMatches) {
        if (sm[1] && sm[1].trim()) {
          extractedStyles.push(sm[1].trim());
        }
      }
      if (extractedStyles.length > 0) {
        const combined = extractedStyles.join('\n\n');
        if (!files['styles.css'] || files['styles.css'].length < combined.length) {
          files['styles.css'] = combined;
        }
      }
    }

    // 4. Sanitize index.html
    if (files['index.html']) {
      let cleanHtml = files['index.html'];
      cleanHtml = cleanHtml.replace(/^```[a-zA-Z0-9_\-:]*\r?\n/, '').replace(/\r?\n```$/, '');
      if (cleanHtml.includes('<!DOCTYPE html>')) {
        cleanHtml = cleanHtml.slice(cleanHtml.indexOf('<!DOCTYPE html>'));
      } else if (cleanHtml.includes('<html')) {
        cleanHtml = cleanHtml.slice(cleanHtml.indexOf('<html'));
      }

      // Deterministically strip AI slop header/footer metadata
      cleanHtml = this.sanitizePosterHtml(cleanHtml);

      if (cleanHtml.includes('data-lucide')) {
        if (!cleanHtml.includes('lucide@latest') && !cleanHtml.includes('lucide.js') && cleanHtml.includes('</head>')) {
          cleanHtml = cleanHtml.replace('</head>', '  <script src="https://unpkg.com/lucide@latest"></script>\n</head>');
        }
        if (!cleanHtml.includes('lucide.createIcons') && cleanHtml.includes('</body>')) {
          cleanHtml = cleanHtml.replace('</body>', '  <script>\n    if (window.lucide) { lucide.createIcons(); }\n  </script>\n</body>');
        }
      }

      files['index.html'] = cleanHtml.trim();
    }

    if (files['styles.css']) {
      let cleanCss = files['styles.css'].replace(/^```[a-zA-Z0-9_\-:]*\r?\n/, '').replace(/\r?\n```$/, '').trim();
      cleanCss = this.sanitizePosterCss(cleanCss);
      files['styles.css'] = cleanCss;
    }

    return files;
  }

  /**
   * Deterministically removes AI-slop header pills, edition numbers, EST dates,
   * verification seals, faux top navigation bars, and robotic footer specs from generated poster HTML.
   * Preserves intentional editorial/directional footers (.editorial-footer, .telemetry-footer).
   */
  private sanitizePosterHtml(html: string): string {
    let clean = html;

    // 1. Remove top navigation bars and editorial topbars
    clean = clean.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    clean = clean.replace(/<(?:header|div)\s+class="[^"]*\b(?:poster-header|editorial-topbar|editorial-nav|topbar)\b[^"]*"[^>]*>[\s\S]*?<\/(?:header|div)>/gi, '');

    // 2. Remove old AI-slop footer classes (spec telemetry, fake URLs, archival edition seals)
    clean = clean.replace(/<(?:footer|div)\s+class="[^"]*\bposter-footer\b[^"]*"[^>]*>[\s\S]*?<\/(?:footer|div)>/gi, '');
    clean = clean.replace(/<div\s+class="[^"]*\bfooter-(?:badge-seal|brand-info|specs)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    // 3. Remove standalone top badge containers, edition pills, or robotic meta tags outside the hero
    clean = clean.replace(/<div\s+class="[^"]*\bbadge-container\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    clean = clean.replace(/<div\s+class="[^"]*\bheader-meta\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    clean = clean.replace(/<span\s+class="[^"]*\bposter-badge\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');

    // 4. Remove elements matching AI-slop text triggers
    clean = clean.replace(/<[a-z0-9]+\b[^>]*>(?:\s*(?:SYS\.DOC|ARCHIVAL\s+EDITION|PROGRAMMING\s+EXCELLENCE|EST\.\s*\d{4}|FELINE\s+ARCHIVES|VERIFIED\s+TRUTHS|1080\s*[×x]\s*1440\s*ARTBOARD|ENGINE\s+LAB)[^<]*)<\/[a-z0-9]+>/gi, '');

    // 5. Remove fake divider lines at the top of content or bottom
    clean = clean.replace(/<hr\s*\/?>/gi, '');

    return clean;
  }

  /**
   * Deterministically removes CSS rules targeting stripped AI-slop header/footer elements.
   */
  private sanitizePosterCss(css: string): string {
    let clean = css;
    clean = clean.replace(/\.poster-header\s*\{[\s\S]*?\}/gi, '');
    clean = clean.replace(/\.poster-footer\s*\{[\s\S]*?\}/gi, '');
    clean = clean.replace(/\.editorial-topbar\s*\{[\s\S]*?\}/gi, '');
    clean = clean.replace(/\.editorial-nav\s*\{[\s\S]*?\}/gi, '');
    clean = clean.replace(/\.header-meta\s*\{[\s\S]*?\}/gi, '');
    clean = clean.replace(/\.badge-container\s*\{[\s\S]*?\}/gi, '');
    clean = clean.replace(/\.footer-(?:badge-seal|brand-info|specs)\s*\{[\s\S]*?\}/gi, '');
    return clean;
  }

  public getTemplateRegistry(): PosterTemplateRegistry {
    return this.templateRegistry;
  }

  public applyTemplate(projectId: string, templateId: string, overrides: Record<string, string> = {}): boolean {
    const rendered = this.templateRegistry.renderWithSlots(templateId, overrides);
    if (!rendered) return false;
    this.workspaceManager.writeFile(projectId, 'index.html', rendered.html);
    this.workspaceManager.writeFile(projectId, 'styles.css', rendered.css);
    return true;
  }
}
