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

export class PosterEngine {
  private workspaceManager: WorkspaceManager;
  private providerManager: GeminiProviderManager;
  private promptComposer: PromptComposer;
  private memoryStore: MarkdownMemoryStore;
  private sessionTracker: SessionTracker;
  private diffEngine: FilesystemDiffEngine;
  private versioning: VersioningEngine;
  private skillRegistry: SkillRegistry;

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
    this.validator = new ArtifactValidator();
  }

  private validator: ArtifactValidator;

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
The document MUST contain:
<body>
  <main class="poster-artboard" data-od-id="poster-root">
    <!-- Visual composition with bold typography, focal imagery/graphics, badges, details -->
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
  padding: 60px 48px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  /* Visual styling, background, typography, colors, borders dictated by user prompt and DESIGN.md */
}

Ensure you output BOTH:
1. \`\`\`html:index.html\`\`\`
2. \`\`\`css:styles.css\`\`\` with COMPLETE visual styling for all classes in the poster.`;

    const activeMemory = await this.memoryStore.readActiveMemory();
    const designMd = this.workspaceManager.readFile(input.projectId, 'DESIGN.md') || undefined;
    const tokensCss = this.workspaceManager.readFile(input.projectId, 'tokens.css') || undefined;

    const composed = this.promptComposer.compose({
      persistentMemory: activeMemory,
      projectInstructions: `Strict 3:4 Canvas Dimensions: ${width}x${height}`,
      designMd,
      tokensCss,
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
      files['styles.css'] = files['styles.css'].replace(/^```[a-zA-Z0-9_\-:]*\r?\n/, '').replace(/\r?\n```$/, '').trim();
    }

    return files;
  }
}
