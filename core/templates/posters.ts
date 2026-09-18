import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
      const moduleTemplates = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../templates');
      const candidates = [
        path.resolve(process.cwd(), 'templates'),
        path.resolve(process.cwd(), 'Prismo', 'templates'),
        path.resolve(process.cwd(), 'd8.7', 'templates'),
        moduleTemplates,
        path.resolve('c:/Users/Admin/Downloads/image creation/Prismo/templates'),
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

      // Direct template id or name match (HIGHEST PRIORITY for cross-domain template execution)
      if (lower.includes(meta.id.toLowerCase()) || lower.includes(meta.name.toLowerCase())) {
        score += 1000;
      }

      // Archetype matches
      if (meta.archetype === 'architecture-pipeline' && (lower.includes('architecture') || lower.includes('pipeline') || lower.includes('step') || lower.includes('graph') || lower.includes('reactivity') || lower.includes('node'))) {
        score += 50;
      }
      if (meta.archetype === 'ui-telemetry' && (lower.includes('telemetry') || lower.includes('audio') || lower.includes('waveform') || lower.includes('transcript') || lower.includes('scribe') || lower.includes('model') || lower.includes('speech'))) {
        score += 50;
      }
      if (meta.archetype === 'cinematic-hero-editorial' && (
        lower.includes('supercar') ||
        lower.includes('motorsport') ||
        lower.includes('car') ||
        lower.includes('automotive') ||
        lower.includes('racing') ||
        lower.includes('track') ||
        lower.includes('porsche') ||
        lower.includes('bmw') ||
        lower.includes('ferrari') ||
        lower.includes('mercedes') ||
        lower.includes('audi') ||
        lower.includes('downforce') ||
        lower.includes('cinematic') ||
        lower.includes('vignette') ||
        lower.includes('scrim') ||
        lower.includes('hero photography')
      )) {
        score += 60;
      }

      // Natural domain cues and specific keywords
      if (meta.id === 'motorsport-supercars') {
        const motorsportKeywords = [
          'motorsport', 'supercar', 'supercars', 'downforce', 'gt3', 'track weapon',
          'racing', 'race', 'track', 'circuit', 'le mans', 'drift', 'touge', 'rally',
          'rotary', 'twin-turbo', 'turbo', 'rpm', 'horsepower', 'engine', 'chassis',
          'porsche', 'ferrari', 'mazda', 'toyota', 'ae86', '787b', 'lamborghini',
          'mclaren', 'bmw', 'audi', 'mercedes', 'amg', 'automotive', 'car', 'hypercar',
          'scrim', 'vignette', 'cornering', 'downhill'
        ];
        for (const kw of motorsportKeywords) {
          if (lower.includes(kw)) score += 30;
        }
      }

      if (meta.id === 'kraft-architecture') {
        const kraftKeywords = [
          'kraft', 'paper', 'tape', 'serif', 'hand-drawn', 'cheat sheet', 'field guide',
          'guide', 'setup', 'tutorial', 'checklist', 'reference card', 'handbook',
          'walkthrough', 'notes', 'scratchpad', 'blueprint', 'postgres', 'docker',
          'concurrency', 'isolation', 'explaining', 'practical', 'rules of thumb', 'primer'
        ];
        for (const kw of kraftKeywords) {
          if (lower.includes(kw)) score += 30;
        }
      }

      if (meta.id === 'bento-execution-pipeline') {
        const bentoKeywords = [
          'bento', 'pipeline', 'execution', 'runtime', 'internals', 'under the hood',
          'dissecting', 'compiler', 'engine', 'scheduler', 'dispatch', 'paxos', 'consensus',
          'git', 'dag', 'object storage', 'state machine', 'protocol', 'distributed',
          'dependency', 'proxy', 'reactive', 'vue', 'event loop', 'algorithm', 'stages', 'kafka'
        ];
        for (const kw of bentoKeywords) {
          if (lower.includes(kw)) score += 30;
        }
      }

      if (meta.id === 'ui-telemetry-inverted') {
        const telemetryKeywords = [
          'telemetry', 'waveform', 'inverted', 'audio', 'speech', 'speech-to-text',
          'model release', 'benchmark', 'meters', 'mastering', 'compressor', 'workstation',
          'console', 'whisper', 'scribe', 'alignment', 'diarization', 'transcript',
          'lufs', 'acoustic', 'phoneme', 'dsp', 'gain reduction', 'equalizer', 'saturation'
        ];
        for (const kw of telemetryKeywords) {
          if (lower.includes(kw)) score += 30;
        }
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
      const kebab = key.replace(/_/g, '-');

      // 1. Mustache placeholders {{key}} or {{kebab}}
      const regexMustache = new RegExp(`\\{\\{\\s*(?:${key}|${kebab})\\s*\\}\\}`, 'g');
      renderedHtml = renderedHtml.replace(regexMustache, value);

      // 2. data-slot attribute: data-slot="key" or data-slot="kebab"
      const regexSlot = new RegExp(`(<([a-z0-9]+)[^>]*data-slot="(?:${key}|${kebab})"[^>]*>)[\\s\\S]*?(<\\/\\2>)`, 'gi');
      renderedHtml = renderedHtml.replace(regexSlot, `$1${value}$2`);

      // 3. Spec number helpers: spec_1_value / spec-1-value or spec_1_label / spec-1-label
      const specMatch = key.match(/^spec_?(\d+)_(value|label)$/i);
      if (specMatch) {
        const num = specMatch[1];
        const type = specMatch[2].toLowerCase();
        const targetClass = type === 'value' ? 'spec-value' : 'spec-label';
        const specRegex = new RegExp(
          `(<div[^>]*data-od-id="spec-${num}"[^>]*>[\\s\\S]*?<span[^>]*class="[^"]*\\b${targetClass}\\b[^"]*"[^>]*>)[\\s\\S]*?(<\\/span>)`,
          'gi'
        );
        renderedHtml = renderedHtml.replace(specRegex, `$1${value}$2`);
      }

      // 4. Common semantic aliases across templates
      const aliasMap: Record<string, string[]> = {
        model_tag: ['model-code', 'model-tag'],
        handle: ['topbar-handle', 'user-handle'],
        slide_index: ['topbar-slide', 'slide-index'],
        terminal_filename: ['title-filename', 'terminal-filename', 'code-filename', 'filename'],
        code_file: ['code-filename', 'file-name', 'filename'],
        subtitle: ['poster-subtext', 'hero-description', 'subtext'],
        subtext: ['poster-subtext', 'hero-description', 'subtitle'],
        headline_intro: ['headline-lead', 'intro-lead'],
        headline_sans: ['headline-sans', 'headline-primary'],
        headline_serif: ['headline-serif', 'headline-accent'],
        headline_main: ['headline-primary', 'headline-sans', 'headline-main'],
        headline_highlight: ['headline-accent', 'headline-serif', 'text-gradient'],
        headline_body: ['headline-main', 'headline-body'],
        tape_badge: ['tape-badge', 'topic-badge', 'category-badge'],
        topic_badge: ['nav-badge', 'category-badge', 'tape-badge'],
        status_chip: ['status-text', 'status-chip', 'chip-status'],
        footer_action: ['footer-action-link', 'swipe-badge', 'footer-action', 'footer-swipe', 'footer-cta']
      };

      const searchTerms = Array.from(new Set([
        key,
        kebab,
        ...(aliasMap[key] || []),
        ...(aliasMap[kebab] || [])
      ]));

      for (const term of searchTerms) {
        const elemRegex = new RegExp(
          `(<(p|span|h[1-6]|div|a|small|header)[^>]*(?:data-od-id|class)="[^"]*\\b${term}\\b[^"]*"[^>]*>)([\\s\\S]*?)(<\\/\\2>)`,
          'gi'
        );
        renderedHtml = renderedHtml.replace(elemRegex, (match, openTag, tagName, innerContent, closeTag) => {
          // If innerContent contains a non-empty text span (e.g. badge with dot + text label)
          if (/<span\b[^>]*>[^<]+<\/span>/i.test(innerContent)) {
            const updatedInner = innerContent.replace(/(<span\b[^>]*>)[^<]+(<\/span>)/i, `$1${value}$2`);
            return `${openTag}${updatedInner}${closeTag}`;
          }
          return `${openTag}${value}${closeTag}`;
        });
      }
    }

    return {
      html: renderedHtml,
      css: record.css
    };
  }
}
