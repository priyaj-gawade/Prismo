import fs from 'node:fs';
import path from 'node:path';

export interface PosterTemplateMeta {
  id: string;
  name: string;
  archetype: string;
  description: string;
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  fonts: string[];
  colors: Record<string, string>;
  slots: Record<string, any>;
}

export interface PosterTemplateRecord {
  meta: PosterTemplateMeta;
  html: string;
  css: string;
  folderPath: string;
}

export class PosterTemplateRegistry {
  private templatesRoot: string;
  private templates: Map<string, PosterTemplateRecord> = new Map();
  private isLoaded = false;

  constructor(customRoot?: string) {
    if (customRoot && fs.existsSync(customRoot)) {
      this.templatesRoot = customRoot;
    } else {
      const candidates = [
        path.resolve(process.cwd(), 'templates'),
        path.resolve(process.cwd(), 'd8.7', 'templates'),
        path.resolve('c:/Users/Admin/Downloads/image creation/d8.7/templates')
      ];
      this.templatesRoot = candidates.find((c) => fs.existsSync(c)) || candidates[0];
    }
  }

  public ensureLoaded(): void {
    if (this.isLoaded) return;
    if (!fs.existsSync(this.templatesRoot)) return;

    try {
      const entries = fs.readdirSync(this.templatesRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dirPath = path.join(this.templatesRoot, entry.name);
        const metaPath = path.join(dirPath, 'template.json');
        const htmlPath = path.join(dirPath, 'index.html');
        const cssPath = path.join(dirPath, 'styles.css');

        if (fs.existsSync(metaPath) && fs.existsSync(htmlPath)) {
          try {
            const metaRaw = fs.readFileSync(metaPath, 'utf8');
            const meta: PosterTemplateMeta = JSON.parse(metaRaw);
            const html = fs.readFileSync(htmlPath, 'utf8');
            const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

            this.templates.set(meta.id, {
              meta,
              html,
              css,
              folderPath: dirPath
            });
          } catch (err) {
            console.warn(`[PosterTemplateRegistry] Error loading template from ${dirPath}:`, err);
          }
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('[PosterTemplateRegistry] Failed to read templates directory:', err);
    }
  }

  public listTemplates(): PosterTemplateMeta[] {
    this.ensureLoaded();
    return Array.from(this.templates.values()).map((t) => t.meta);
  }

  public getTemplate(id: string): PosterTemplateRecord | undefined {
    this.ensureLoaded();
    return this.templates.get(id);
  }

  public findBestTemplate(prompt: string): PosterTemplateRecord | null {
    this.ensureLoaded();
    if (this.templates.size === 0) return null;

    const lower = prompt.toLowerCase();
    let bestMatch: PosterTemplateRecord | null = null;
    let highestScore = -1;

    for (const record of this.templates.values()) {
      let score = 0;
      const { meta } = record;

      // Archetype matches
      if (meta.archetype === 'architecture-pipeline' && (lower.includes('architecture') || lower.includes('pipeline') || lower.includes('step') || lower.includes('graph') || lower.includes('reactivity') || lower.includes('node'))) {
        score += 50;
      }
      if (meta.archetype === 'ui-telemetry' && (lower.includes('telemetry') || lower.includes('audio') || lower.includes('waveform') || lower.includes('transcript') || lower.includes('scribe') || lower.includes('model') || lower.includes('speech'))) {
        score += 50;
      }

      // Specific keywords
      if (lower.includes('kraft') || lower.includes('paper') || lower.includes('tape') || lower.includes('serif') || lower.includes('hand-drawn')) {
        if (meta.id === 'kraft-architecture') score += 100;
      }
      if (lower.includes('telemetry') || lower.includes('waveform') || lower.includes('inverted') || lower.includes('audio') || lower.includes('speech-to-text')) {
        if (meta.id === 'ui-telemetry-inverted') score += 100;
      }
      if (lower.includes('vue') || lower.includes('bento') || lower.includes('langchain') || lower.includes('dependency') || lower.includes('proxy')) {
        if (meta.id === 'bento-execution-pipeline') score += 100;
      }

      // Description token matching
      const descWords = meta.description.toLowerCase().split(/\W+/);
      for (const w of descWords) {
        if (w.length > 3 && lower.includes(w)) {
          score += 5;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = record;
      }
    }

    // Only return if there was an actual keyword/archetype match
    return highestScore > 0 ? bestMatch : null;
  }

  public formatGroundedContext(prompt: string): string {
    this.ensureLoaded();
    if (this.templates.size === 0) return '';

    const best = this.findBestTemplate(prompt);
    // If no specific template was requested or strongly matched, do NOT inject any template bias
    if (!best) return '';

    const lines: string[] = [
      '## Grounded Poster Template Reference (Optional Structural Reference)',
      `A grounded template archetype (\`${best.meta.id}\` - ${best.meta.name}) matched this request:`,
      ''
    ];

    const isCleanRequested = /no\s+(header|footer)|without\s+(header|footer)|clean\s+(poster|layout)/i.test(prompt);
    lines.push(`### Relevant Grounded Archetype: \`${best.meta.id}\``);
    lines.push(`Reference structure (adapt and refine freely; DO NOT treat as a rigid template):`);
    lines.push('```html');
    
    const cleanSnippet = this.extractStructuralSnippet(best.html, { isCleanRequested });
    lines.push(cleanSnippet);
    lines.push('```');
    lines.push('');
    lines.push('**Key CSS Design Tokens to reference:**');
    lines.push('```css');
    const rootMatch = best.css.match(/:root\s*\{[\s\S]*?\}/i);
    if (rootMatch) {
      lines.push(rootMatch[0]);
    }
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Cleans template HTML for few-shot prompting: strips <nav> bars, creator handles,
   * slide badges, and unwanted top chrome so the LLM starts cleanly with .poster-hero.
   */
  private extractStructuralSnippet(html: string, options: { isCleanRequested: boolean }): string {
    let clean = html;

    // 1. Remove <nav> bars and editorial topbars
    clean = clean.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    clean = clean.replace(/<div\s+class="[^"]*\b(?:editorial-topbar|editorial-nav|topbar)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    // 2. Remove standalone top tape badges or pills outside hero
    clean = clean.replace(/<div\s+class="[^"]*\b(?:tape-badge|badge-container)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    // 3. If clean mode requested, remove footer
    if (options.isCleanRequested) {
      clean = clean.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
      clean = clean.replace(/<div\s+class="[^"]*\b(?:editorial-footer|telemetry-footer)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    }

    // 4. Extract poster-content body
    const bodyMatch = clean.match(/<div\s+class="poster-content"[^>]*>([\s\S]*?)<\/div>\s*<\/main>/i);
    if (bodyMatch) {
      const lines = bodyMatch[1].trim().split('\n').map((l) => l.trimEnd()).filter(Boolean);
      return lines.slice(0, 45).join('\n') + (lines.length > 45 ? '\n      <!-- ... [additional grid cards & details] -->' : '');
    }

    // Fallback: take inner body
    const fallbackMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (fallbackMatch) {
      return fallbackMatch[1].trim().slice(0, 1500);
    }

    return clean.slice(0, 1500);
  }

  /**
   * Directly interpolate editable slot values into a template HTML
   */
  public renderWithSlots(id: string, overrides: Record<string, string>): { html: string; css: string } | null {
    const record = this.getTemplate(id);
    if (!record) return null;

    let renderedHtml = record.html;
    for (const [key, value] of Object.entries(overrides)) {
      // Replace data-slot="key" or data-od-id matching or {{key}}
      const regexMustache = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      renderedHtml = renderedHtml.replace(regexMustache, value);

      // Also replace slot text inside tags with data-od-id="key" or class="key"
      const regexOd = new RegExp(`(<[^>]*data-od-id="${key}"[^>]*>)[^<]*(<\\/)`, 'g');
      renderedHtml = renderedHtml.replace(regexOd, `$1${value}$2`);
    }

    return {
      html: renderedHtml,
      css: record.css
    };
  }
}
