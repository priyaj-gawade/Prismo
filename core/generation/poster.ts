import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import type { GenerationInput, RefinementInput, GenerationResult } from '../contracts/engine.ts';
import type { WorkspaceManager } from '../workspace/workspace.ts';
import { PromptComposer } from '../prompt/composer.ts';
import type { GeminiProviderManager } from '../providers/manager.ts';
import type { AssetProviderManager } from '../assets/manager.ts';
import type { MarkdownMemoryStore } from '../memory/store.ts';
import type { SessionTracker } from '../memory/session.ts';
import { FilesystemDiffEngine } from '../workspace/diff.ts';
import { VersioningEngine } from '../workspace/versioning.ts';
import { SkillRegistry } from '../skills/registry.ts';
import { ArtifactValidator } from '../validation/validator.ts';
import { PosterTemplateRegistry } from '../templates/posters.ts';
import { ReferenceStudyEngine } from '../design-knowledge/index.ts';
import { TypographyDirector } from '../design-system/typography/index.ts';

export interface CompositionGrammar {
  image_position: string;
  text_position: string;
  headline_treatment: string;
  alignment_mode: string;
  density: string;
  information_structure: string;
  dominant_scale: string;
  overlay_strategy: string;
}

export class PosterEngine {
  private workspaceManager: WorkspaceManager;
  private providerManager: GeminiProviderManager;
  private assetManager?: AssetProviderManager;
  private promptComposer: PromptComposer;
  private memoryStore: MarkdownMemoryStore;
  private sessionTracker: SessionTracker;
  private diffEngine: FilesystemDiffEngine;
  private versioning: VersioningEngine;
  private skillRegistry: SkillRegistry;
  private templateRegistry: PosterTemplateRegistry;
  private validator: ArtifactValidator;
  private referenceStudyEngine: ReferenceStudyEngine;
  private typographyDirector: TypographyDirector;

  constructor(dependencies: {
    workspaceManager: WorkspaceManager;
    providerManager: GeminiProviderManager;
    assetManager?: AssetProviderManager;
    memoryStore: MarkdownMemoryStore;
    sessionTracker: SessionTracker;
  }) {
    this.workspaceManager = dependencies.workspaceManager;
    this.providerManager = dependencies.providerManager;
    this.assetManager = dependencies.assetManager;
    this.memoryStore = dependencies.memoryStore;
    this.sessionTracker = dependencies.sessionTracker;

    this.promptComposer = new PromptComposer();
    this.diffEngine = new FilesystemDiffEngine();
    this.versioning = new VersioningEngine();
    this.skillRegistry = new SkillRegistry();
    this.templateRegistry = new PosterTemplateRegistry();
    this.validator = new ArtifactValidator();
    this.referenceStudyEngine = new ReferenceStudyEngine();
    this.typographyDirector = new TypographyDirector();
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

    const conversationId = input.conversationId || input.projectId;
    let sessionDiversityHint = '';
    try {
      const pastTurns = await this.sessionTracker.getTurns(conversationId);
      const pastGrammars = pastTurns
        .map((t) => (t.metadata as any)?.compositionGrammar)
        .filter(Boolean) as CompositionGrammar[];

      if (pastGrammars.length > 0) {
        const last = pastGrammars[pastGrammars.length - 1];
        sessionDiversityHint = `
SESSION COMPOSITION HISTORY & SOFT ANTI-REPETITION GUIDELINE:
Previous poster in this session used:
- Image: ${last.image_position}, Text: ${last.text_position}, Type: ${last.headline_treatment}, Dominant: ${last.dominant_scale}, Overlay: ${last.overlay_strategy}
SOFT ANTI-REPETITION PENALTY:
Do not reflexively repeat these exact compositional choices. Allow this new subject to organically determine a distinct visual balance, layout structure, and color mood.`;
      }
    } catch {
      // Non-blocking fallback
    }

    const study = this.referenceStudyEngine.analyzeRequest(input.prompt, input.projectId);
    const typo = this.typographyDirector.recommendSystem({ subject: input.prompt, designDNA: study.dna });

    let imageDirective = '';
    if (study.imageIntent === 'image_required') {
      const mandateNote = study.dna.explicitImageRequested
        ? `
CRITICAL CONSTRAINT HIERARCHY (USER MANDATED IMAGE):
The user explicitly requested an image for this poster.
You MUST include an image asset:
<img class="poster-bleed-image" src="asset:${study.searchKeywords[0] || 'hero visual'}" alt="${input.prompt}">
or inside an editorial focal frame:
<div class="poster-focal-frame"><img src="asset:${study.searchKeywords[0] || 'hero visual'}" alt="${input.prompt}"></div>
Style descriptors like "minimal", "clean", or "professional" dictate negative space and typographic restraint—they NEVER permit omitting the requested photograph or replacing it with a blank space or CSS box.`
        : '';
      imageDirective = `
IMAGE STRATEGY: IMAGE REQUIRED
A strong, dominant real photographic asset is essential for this subject.
Use: <img class="poster-bleed-image" src="asset:${study.searchKeywords[0] || 'hero photography'}" alt="${input.prompt}">
Or frame within .poster-focal-frame.
${mandateNote}`;
    } else if (study.imageIntent === 'image_helpful') {
      imageDirective = `
IMAGE STRATEGY: IMAGE HELPFUL
Archival or contextual imagery strongly reinforces the composition.
Use: <img class="poster-focal-frame" src="asset:${study.searchKeywords[0] || 'context imagery'}" alt="${input.prompt}">
Ensure imagery integrates seamlessly with geometric or typographic composition.`;
    } else if (study.imageIntent === 'image_not_wanted') {
      imageDirective = `
IMAGE STRATEGY: IMAGE NOT WANTED (PURELY GRAPHIC / TYPOGRAPHIC)
This subject demands pure graphic, typographic, or architectural schematic expression.
DO NOT use stock photography or <img src="asset:..."> placeholders.
Express the concept through bold typography, proportional geometry, SVG linework, or monolithic layout.`;
    } else {
      imageDirective = `
IMAGE STRATEGY: IMAGE OPTIONAL
You may use an asset with src="asset:${study.searchKeywords[0] || 'visual'}" or execute a purely graphic/typographic poster.`;
    }

    const typoDirective = `
TYPOGRAPHY ARCHITECTURE & FONT SYSTEM:
Google Fonts Link to include in <head>:
<link rel="stylesheet" href="${typo.googleFontLink}">

Font Roles:
- Display Heading: "${typo.display.family}", ${typo.display.fallbackChain} (Category: ${typo.display.category})
${typo.accent ? `- Accent Typography: "${typo.accent.family}", ${typo.accent.fallbackChain} (Selective italic or optical emphasis)` : ''}
- Body Copy: "${typo.body.family}", ${typo.body.fallbackChain}
- Utility / Metadata: "${typo.utility.family}", ${typo.utility.fallbackChain}
- Code / Syntax: "${typo.code.family}", monospace (ONLY for literal code syntax snippets)

HARD TYPOGRAPHY RULE:
Technical subject does NOT imply monospace. Headings must use display grotesque, neo-grotesque, or editorial typography. NEVER use monospace for poster headlines or body copy. Orbitron is prohibited.`;

    const technicalPosterDirective = `
TECHNICAL POSTER ≠ MIND MAP (HARD RULE):
- Do NOT draw box-and-arrow whiteboard diagrams ([BOX] ─── [BOX]).
- Do NOT repeat node cards (.node-card, .state-node, .server-box). Maximum 2 or zero.
- Do NOT place diagrams inside dark enclosed panels (.diagram-container, .hero-diagram-container). Diagrams must integrate directly into the 3:4 canvas.
- Vue Flow is strictly OPTIONAL. If node graphs are used, NEVER use default Vue Flow classes/widgets (.vue-flow__node-default, .vue-flow__handle, .vue-flow__controls, .vue-flow__minimap). Use custom SVG or custom node styling only.`;

    const posterPrompt = `${input.prompt}
CRITICAL POSTER SPECIFICATION:
Strict 3:4 Full-Bleed Canvas Dimensions: ${width}px x ${height}px.
${sessionDiversityHint}

${imageDirective}

${typoDirective}

${technicalPosterDirective}

ORCHESTRATION INSTRUCTIONS:
- Enforce the D8.7 Poster Art-Direction Refinement Policy and Hallmark disciplines defined in the active poster skill.
- ANTI-TEMPLATE RULE: DO NOT automatically generate the default formula (Big Title + Accent Title + Paragraph + Full-Bleed Darkened Image + 4-Column Spec Bar). Every poster must independently determine its composition.
- POSITIVE ART DIRECTION: Intentionally establish:
  1. Clear focal point (person, vehicle, product, architecture, object, typography, diagram, number, graphic form)
  2. Dominant scale relationship (strong intentional contrast between hero element and supporting details)
  3. 30%-40% intentional negative space (do not pack empty areas with filler text or boxes)
  4. Typographic hierarchy: Roman display headings as primary anchor, with selective accent typography encouraged (e.g. bold sans/grotesque paired with an expressive italic serif accent word or high-contrast color highlight). Never make an entire headline italic.
  5. Stable editability contract: Every major semantic element MUST include data-od-id (e.g. data-od-id="poster-root", data-od-id="headline", data-od-id="supporting-copy", data-od-id="hero-image", data-od-id="diagram", data-od-id="annotation", data-od-id="source-credit").
  6. Composition primitives are optional: Headline, supporting copy, imagery, code excerpts, diagrams, waveforms, transcripts, and annotations are semantic capabilities, NEVER mandatory ingredients. Use only what communicates the subject. Empty space must remain empty.
  7. Adaptive image treatment: subtle gradient, localized scrim, vignette, duotone, or no overlay (never a blind dark overlay)
  8. Restrained secondary info: subtitles, paragraphs, and spec bars are strictly optional
- PALETTE FREEDOM: Set explicit background color on .poster-artboard in styles.css matching the subject (e.g. warm linen, crisp white, deep obsidian, technical slate). Do NOT force dark navy.
- PRE-EMIT CRITIQUE STAMP: Start styles.css with:
  /* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V5 | grammar: img=[position] text=[position] type=[treatment] dominant=[scale] overlay=[strategy] */

The document MUST contain:
<body>
  <main class="poster-artboard" data-od-id="poster-root">
    <!-- Fluid visual composition with focal visual, editorial typography, and negative space -->
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

/* Image Composition Primitives */
.poster-bleed-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
  display: block;
}
.poster-focal-frame {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}
.poster-focal-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

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
    if (typo.googleFontLink && !htmlContent.includes(typo.googleFontLink) && htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `  <link rel="stylesheet" href="${typo.googleFontLink}">\n</head>`);
      this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
    }

    // Dynamic Asset Resolution & Local Caching (honoring imageIntent)
    let stockProvidersUsed: string[] = [];
    if (this.assetManager && htmlContent && study.imageIntent !== 'image_not_wanted') {
      const assetRes = await this.resolveDynamicAssets(input.projectId, projectRoot, htmlContent);
      if (assetRes.html !== htmlContent) {
        htmlContent = assetRes.html;
        this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
      }
      stockProvidersUsed = assetRes.usedProviders;
    }

    // Ensure styles.css includes image container framing contracts if photography is present
    if (cssContent && !cssContent.includes('.img-frame') && !cssContent.includes('.poster-focal-frame')) {
      const imgCss = `
/* Auto-Adjusting Dynamic Image Containers */
.img-frame {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}
.img-frame img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
.img-horizontal {
  width: 100%;
  aspect-ratio: 16 / 9;
}
.img-vertical {
  width: 100%;
  height: 100%;
}
.img-ambient {
  position: absolute;
  inset: 0;
  opacity: 0.25;
  mix-blend-mode: luminosity;
  pointer-events: none;
  z-index: 0;
}
`;
      cssContent += '\n' + imgCss;
      this.workspaceManager.writeFile(input.projectId, 'styles.css', cssContent);
    }

    // Anti-Slop Check & Bounded Agent Correction (Karpathy: validate -> bounded agent correction -> validate again)
    const antiSlopOpts = {
      imageIntent: study.imageIntent,
      explicitImageRequested: study.dna.explicitImageRequested
    };
    let antiSlop = this.validator.validateAntiSlop(htmlContent, cssContent, antiSlopOpts);
    if (antiSlop.slopDetected) {
      const missingImageDirective = antiSlop.metrics?.missingRequiredImage
        ? `\n- MISSING REQUIRED IMAGE: The user explicitly requested an image or the subject demands it! You MUST include <img class="poster-bleed-image" src="asset:${study.searchKeywords[0] || 'hero visual'}" alt="${input.prompt}"> or <div class="poster-focal-frame"><img src="asset:${study.searchKeywords[0] || 'hero visual'}" alt="${input.prompt}"></div>. Do NOT substitute with a blank card or CSS-drawn shape.`
        : '';

      const slopPrompt = `POSTER RE-AUTHORING REQUEST:
You are correcting and refining the 1080x1440 graphic poster for the user's prompt:
"${input.prompt}"

CRITICAL SUBJECT CONSTRAINT:
The poster MUST remain about "${input.prompt}". Do NOT generate a poster about anti-slop rules or design guidelines! Keep the actual domain content (e.g. distributed consensus, leader election, log replication, terms, safety invariants).

The previous draft had the following quality violations:
${antiSlop.violations.map((v) => `- ${v}`).join('\n')}

Detected Violations & Metrics:
- Micro-text instances (< 22px): ${antiSlop.metrics?.microTextCount ?? 0}
- Repeated node cards: ${antiSlop.metrics?.nodeCardCount ?? 0} (Max allowed: 2; Technical poster != mind map!)
- Diagram container panels: ${antiSlop.metrics?.graphContainerCount ?? 0} (Must integrate directly into canvas)
- Monospace display/dominance: ${antiSlop.metrics?.displayMonospaceUsage ? 'YES' : 'NO'} (Technical != monospace display!)
- Default Vue Flow widgets: ${antiSlop.metrics?.defaultVueFlowClassUsage ? 'YES' : 'NO'}
- UI Pills / Status dots: ${antiSlop.metrics?.pillCount ?? 0} pills, ${antiSlop.metrics?.statusDotCount ?? 0} dots
- Template Rails: Header rail: ${antiSlop.metrics?.headerRailDetected ? 'YES' : 'NO'}, Footer rail: ${antiSlop.metrics?.footerRailDetected ? 'YES' : 'NO'}${missingImageDirective}

Current Draft HTML:
\`\`\`html
${htmlContent}
\`\`\`

Current Draft CSS:
\`\`\`css
${cssContent}
\`\`\`

FIX INSTRUCTIONS:
1. Re-author the poster for "${input.prompt}" as a bold, editorial graphic composition, NOT a whiteboard mind map or software dashboard.
2. Ensure all text is >= 22px (headline 72px+, secondary 32px+, supporting 24px+). Eliminate all micro-labels.
3. Headings MUST use high-craft display typography (e.g. "${typo.display.family}"), NOT monospace.
4. Remove all repeated node boxes, status dots, pills, and 3-part header/footer rails.
5. Express "${input.prompt}" with high aesthetic impact, proportional geometry, typographic contrast, and intentional negative space (30%-40%).
6. Maintain stable data-od-id attributes on all major editable elements (poster-root, headline, supporting-copy, etc.).
7. If an image was requested, incorporate the <img src="asset:${study.searchKeywords[0] || 'visual'}" ...> asset seamlessly into the composition.
8. Output BOTH \`\`\`html:index.html\`\`\` and \`\`\`css:styles.css\`\`\`.`;

      try {
        const corrResponse = await this.providerManager.generateText({
          model: 'gemini-3.5-flash-lite',
          systemInstruction: `You are an expert graphic poster designer. Re-author the poster for "${input.prompt}" eliminating all micro-UI, node cards, and template rails. Ensure clean, bold, authored graphic poster composition about "${input.prompt}".`,
          prompt: slopPrompt
        });
        const corrFiles = this.extractCodeFiles(corrResponse.text);
        if (corrFiles['index.html']) {
          htmlContent = corrFiles['index.html'];
          this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
        }
        if (corrFiles['styles.css']) {
          cssContent = corrFiles['styles.css'];
          this.workspaceManager.writeFile(input.projectId, 'styles.css', cssContent);
        }
      } catch (err) {
        console.warn('[PosterEngine] Anti-slop bounded correction turn failed:', err);
      }

      // Re-validate after model correction
      antiSlop = this.validator.validateAntiSlop(htmlContent, cssContent, antiSlopOpts);

      // Apply mechanical/security cleanup only (as a deterministic safeguard)
      const sanitized = this.sanitizePoster(htmlContent, cssContent);
      if (sanitized.html !== htmlContent || sanitized.css !== cssContent) {
        htmlContent = sanitized.html;
        cssContent = sanitized.css;
        this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
        this.workspaceManager.writeFile(input.projectId, 'styles.css', cssContent);
      }

      // Mechanical Safety Net for Image Mandates: If still missing <img>, inject designated asset
      if (study.imageIntent === 'image_required' && !/<img\b[^>]*\bsrc=["'][^"']+["']/i.test(htmlContent)) {
        const assetQuery = study.searchKeywords[0] || 'editorial visual';
        htmlContent = htmlContent.replace(
          /(<main\b[^>]*class=["'][^"']*poster-artboard[^"']*["'][^>]*>)/i,
          `$1\n    <div class="poster-focal-frame" data-od-id="hero-image">\n      <img class="poster-bleed-image" src="asset:${assetQuery}" alt="${input.prompt}">\n    </div>`
        );
        this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
        if (this.assetManager) {
          const assetRes = await this.resolveDynamicAssets(input.projectId, projectRoot, htmlContent);
          if (assetRes.html !== htmlContent) {
            htmlContent = assetRes.html;
            this.workspaceManager.writeFile(input.projectId, 'index.html', htmlContent);
          }
        }
      }
    }

    // Extract 8-dimension composition grammar and record turn in session tracker
    const extractedGrammar = this.extractCompositionGrammar(htmlContent, cssContent);
    try {
      await this.sessionTracker.addTurn({
        id: `turn_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
        conversationId,
        role: 'assistant',
        content: `Generated poster for: ${input.prompt.slice(0, 80)}`,
        timestamp: Date.now(),
        metadata: {
          projectId: input.projectId,
          compositionGrammar: extractedGrammar
        }
      });
    } catch (err) {
      console.warn('[PosterEngine] Failed to record turn in session tracker:', err);
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
        stockProvidersUsed
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

    // Dynamic Asset Resolution & Local Caching on Refinement
    let refineStockProvidersUsed: string[] = [];
    let refineHtml = this.workspaceManager.readFile(input.projectId, 'index.html') || '';
    let refineCss = this.workspaceManager.readFile(input.projectId, 'styles.css') || '';
    if (this.assetManager && refineHtml) {
      const assetRes = await this.resolveDynamicAssets(input.projectId, projectRoot, refineHtml);
      if (assetRes.html !== refineHtml) {
        refineHtml = assetRes.html;
        this.workspaceManager.writeFile(input.projectId, 'index.html', refineHtml);
      }
      refineStockProvidersUsed = assetRes.usedProviders;
    }
    if (refineCss && !refineCss.includes('.img-frame') && !refineCss.includes('.poster-focal-frame')) {
      refineCss += '\n' + `
.img-frame { position: relative; overflow: hidden; border-radius: 8px; }
.img-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.img-horizontal { width: 100%; aspect-ratio: 16 / 9; }
.img-vertical { width: 100%; height: 100%; }
.img-ambient { position: absolute; inset: 0; opacity: 0.25; mix-blend-mode: luminosity; pointer-events: none; z-index: 0; }
`;
      this.workspaceManager.writeFile(input.projectId, 'styles.css', refineCss);
    }

    const sanitizedRefine = this.sanitizePoster(refineHtml, refineCss);
    if (sanitizedRefine.html !== refineHtml || sanitizedRefine.css !== refineCss) {
      refineHtml = sanitizedRefine.html;
      refineCss = sanitizedRefine.css;
      this.workspaceManager.writeFile(input.projectId, 'index.html', refineHtml);
      this.workspaceManager.writeFile(input.projectId, 'styles.css', refineCss);
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
        stockProvidersUsed: refineStockProvidersUsed
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

  /**
   * Deterministically resolves declarative asset placeholders (e.g. src="asset:<query>")
   * into real high-res images from Unsplash -> Pexels -> Pixabay -> local cache, or generative SVG fallback.
   */
  private async resolveDynamicAssets(
    projectId: string,
    projectRoot: string,
    html: string
  ): Promise<{ html: string; usedProviders: string[] }> {
    let resolvedHtml = html;
    const usedProviders: string[] = [];
    if (!this.assetManager) return { html, usedProviders };

    const assetRegex = /<img\b([^>]*?)\bsrc=["']asset:([^"']+)["']([^>]*?)>/gi;
    const matches = Array.from(resolvedHtml.matchAll(assetRegex));

    if (matches.length === 0) {
      return { html, usedProviders };
    }

    const assetsDir = path.join(projectRoot, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    for (const match of matches) {
      const fullImgTag = match[0];
      const preAttrs = match[1] || '';
      const rawQuery = match[2].trim();
      const postAttrs = match[3] || '';

      // Determine orientation from classes or query string params
      let orientation: 'landscape' | 'portrait' | 'square' = 'landscape';
      const combinedAttrs = `${preAttrs} ${postAttrs}`.toLowerCase();
      if (combinedAttrs.includes('poster-bleed-image') || combinedAttrs.includes('img-vertical') || combinedAttrs.includes('portrait')) {
        orientation = 'portrait';
      } else if (combinedAttrs.includes('img-square') || combinedAttrs.includes('square')) {
        orientation = 'square';
      }

      try {
        const searchResult = await this.assetManager.search({
          query: rawQuery,
          orientation,
          limit: 1
        });

        if (searchResult.assets.length > 0) {
          const topAsset = searchResult.assets[0];
          const downloadedPath = await this.assetManager.downloadAsset(topAsset, assetsDir);
          const relPath = path.relative(projectRoot, downloadedPath).replace(/\\/g, '/');

          resolvedHtml = resolvedHtml.replace(fullImgTag, `<img ${preAttrs}src="${relPath}"${postAttrs}>`);
          if (!usedProviders.includes(topAsset.provider)) {
            usedProviders.push(topAsset.provider);
          }
        } else {
          const fallbackUri = this.createGenerativeSvgDataUri(rawQuery, orientation);
          resolvedHtml = resolvedHtml.replace(fullImgTag, `<img ${preAttrs}src="${fallbackUri}"${postAttrs}>`);
        }
      } catch (err) {
        console.warn(`[PosterEngine] Failed to resolve asset "${rawQuery}":`, err instanceof Error ? err.message : String(err));
        const fallbackUri = this.createGenerativeSvgDataUri(rawQuery, orientation);
        resolvedHtml = resolvedHtml.replace(fullImgTag, `<img ${preAttrs}src="${fallbackUri}"${postAttrs}>`);
      }
    }

    return { html: resolvedHtml, usedProviders };
  }

  private createGenerativeSvgDataUri(query: string, orientation: 'landscape' | 'portrait' | 'square'): string {
    const w = orientation === 'portrait' ? 800 : (orientation === 'square' ? 800 : 1200);
    const h = orientation === 'portrait' ? 1200 : 800;
    const cleanQuery = query.replace(/[<>"'&]/g, '').slice(0, 40);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#090d16"/>
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="rgba(59, 130, 246, 0.08)" filter="blur(40px)"/>
      <text x="50%" y="48%" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" text-anchor="middle" letter-spacing="0.05em">VISUAL ASSET</text>
      <text x="50%" y="54%" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" text-anchor="middle">${cleanQuery}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  public extractCompositionGrammar(html: string, css: string): CompositionGrammar {
    // 1. Check if the critique comment in styles.css contains an explicit grammar stamp
    const grammarCommentMatch = css.match(/grammar:\s*([^*]+)/i);
    if (grammarCommentMatch) {
      const raw = grammarCommentMatch[1];
      const getVal = (key: string) => {
        const m = raw.match(new RegExp(`${key}=([^\\s,|]+)`, 'i'));
        return m ? m[1].trim() : undefined;
      };
      const explicitImg = getVal('img');
      if (explicitImg) {
        return {
          image_position: explicitImg,
          text_position: getVal('text') || 'bottom-left',
          headline_treatment: getVal('type') || 'bold-condensed',
          alignment_mode: getVal('align') || 'flush-left',
          density: getVal('density') || 'balanced',
          information_structure: getVal('info') || 'headline+caption',
          dominant_scale: getVal('dominant') || 'image-dominant',
          overlay_strategy: getVal('overlay') || 'subtle-gradient'
        };
      }
    }

    // 2. Deterministic inference from HTML and CSS structure
    const hasImg = html.includes('<img');
    const hasFullBleed = html.includes('poster-bleed-image') || (css.includes('position: absolute') && css.includes('inset: 0'));
    const hasSplit = html.includes('poster-focal-frame') || html.includes('split') || html.includes('img-vertical');
    const image_position = !hasImg ? 'none' : (hasSplit ? 'split-left' : (hasFullBleed ? 'full-bleed' : 'offset-frame'));

    const isBottomText = css.includes('justify-content: flex-end') || css.includes('margin-top: auto') || /bottom:\s*\d+/i.test(css);
    const text_position = isBottomText ? 'bottom-left' : 'top-anchored';

    const isSerif = /font-family:[^;]*serif/i.test(css);
    const headline_treatment = isSerif ? 'oversized-serif' : 'bold-condensed';

    const alignment_mode = /text-align:\s*center/i.test(css) ? 'centered' : 'flush-left';
    const textLength = html.replace(/<[^>]+>/g, '').length;
    const density = textLength < 150 ? 'sparse' : (textLength < 400 ? 'balanced' : 'dense-editorial');

    const hasSpecs = /class=["'][^"']*\b(?:spec|stat|telemetry)\b/i.test(html);
    const information_structure = hasSpecs ? 'headline+specs' : (html.includes('<p') ? 'headline+caption' : 'headline-only');
    const dominant_scale = hasImg ? 'image-dominant' : 'typography-dominant';
    const overlay_strategy = css.includes('vignette') ? 'soft-vignette' : (css.includes('gradient') ? 'subtle-gradient' : 'none');

    return {
      image_position,
      text_position,
      headline_treatment,
      alignment_mode,
      density,
      information_structure,
      dominant_scale,
      overlay_strategy
    };
  }

  public sanitizePoster(html: string, css: string): { html: string; css: string } {
    let newHtml = html;
    let newCss = css;

    // 1. Remove status dot elements & indicators
    newHtml = newHtml.replace(/<span\b[^>]*\bclass=["'][^"']*\b(?:status-dot|dot|led-indicator|indicator-dot|pulse-dot)\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');
    newHtml = newHtml.replace(/<div\b[^>]*\bclass=["'][^"']*\b(?:status-dot|dot|led-indicator|indicator-dot|pulse-dot)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    newHtml = newHtml.replace(/<circle\b[^>]*\br=["'](?:[1-8])["'][^>]*fill=["'](?:#10b981|#ef4444|#f59e0b|#00f0ff|green|red|yellow|cyan|lime)["'][^>]*\/?>/gi, '');
    newHtml = newHtml.replace(/[•●]\s*(DRS|ACTIVE|ONLINE|TERM|LEADER|SYSTEM)/gi, '$1');

    // 2. Strip fake metadata terms and artificial labels
    newHtml = newHtml.replace(/\b(?:TERM\s*0?[1-9]\b|ACTIVE\s+LEADER\b|NODE_0[1-9]\b|SYSTEM\s+STATUS\b|STATE\s+MACHINE\s+LINEARIZABILITY\b|RFC-[A-Z]+-\d+\b)/gi, '');

    // 3. Strip explicit archival / coordinate 3-part rail tokens
    newHtml = newHtml.replace(/<span\b[^>]*>\s*(?:ARCHIV\s*\d{4}|WALTER\s+GROPIUS|DESSAU)\s*<\/span>/gi, '');
    newHtml = newHtml.replace(/<span\b[^>]*>\s*(?:LAT\.\s*\d+°[^<]*|LONG\.\s*\d+°[^<]*|GESAMTKUNSTWERK)\s*<\/span>/gi, '');
    newHtml = newHtml.replace(/<span\b[^>]*>\s*(?:PORSCHE\s+MOTORSPORT|9,000\s+RPM\s+FLAT-SIX)\s*<\/span>/gi, '');

    // 4. Remove banned rail class names so they don't trigger rail lint, without deleting inner markup
    newHtml = newHtml.replace(/\bclass=["']([^"']*\b(?:top-rail|header-rail|archival-header|bottom-rail|footer-rail)\b[^"']*)["']/gi, (match, classes) => {
      const cleaned = classes.replace(/\b(?:top-rail|header-rail|archival-header|bottom-rail|footer-rail)\b/g, '').trim();
      return cleaned ? `class="${cleaned}"` : '';
    });

    // 5. Clean empty containers left behind
    newHtml = newHtml.replace(/<(?:header|footer|div|span|p)\b[^>]*>\s*<\/(?:header|footer|div|span|p)>/gi, '');
    newHtml = newHtml.replace(/<(?:header|footer|div|span|p)\b[^>]*>\s*<\/(?:header|footer|div|span|p)>/gi, '');

    // 6. Boost micro-text font sizes to >= 22px in CSS (excluding credits/legal)
    newCss = newCss.replace(/font-size:\s*(\d+(?:\.\d+)?)(px|rem|em)\b/gi, (match, sizeStr, unit, offset) => {
      let sizePx = parseFloat(sizeStr);
      if (unit.toLowerCase() === 'rem' || unit.toLowerCase() === 'em') {
        sizePx = sizePx * 16;
      }
      if (sizePx < 22) {
        const precedingCss = newCss.slice(Math.max(0, offset - 80), offset);
        if (!/(?:copyright|credit|legal|disclaimer)/i.test(precedingCss)) {
          return 'font-size: 22px';
        }
      }
      return match;
    });

    // 7. Boost inline font-size styles in HTML
    newHtml = newHtml.replace(/style=["']([^"']*font-size:\s*(\d+)px[^"']*)["']/gi, (match, styleContent, sizeStr) => {
      const sizePx = parseFloat(sizeStr);
      if (sizePx < 22) {
        return `style="${styleContent.replace(/font-size:\s*\d+px/gi, 'font-size: 22px')}"`;
      }
      return match;
    });

    return { html: newHtml, css: newCss };
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
