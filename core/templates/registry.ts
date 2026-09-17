import fs from 'node:fs';
import path from 'node:path';

export interface WebsiteTemplate {
  id: string;
  slug: string;
  title: string;
  category: string;
  template_type?: string;
  description: string;
  tags: string[];
  paths: {
    folder: string;
    index_html?: string;
    thumbnail?: string;
  };
}

export interface TemplateReference {
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  sampleHtmlSnippet?: string;
  designPatterns?: string[];
}

export class WebsiteTemplateRegistry {
  private templatesRoot: string;
  private templates: WebsiteTemplate[] = [];
  private isLoaded = false;

  constructor(customTemplatesRoot?: string) {
    this.templatesRoot = customTemplatesRoot || path.resolve('..', 'website-templates');
    if (!fs.existsSync(this.templatesRoot)) {
      this.templatesRoot = 'C:\\Users\\Admin\\Downloads\\image creation\\website-templates';
    }
  }

  private ensureLoaded(): void {
    if (this.isLoaded) return;
    const jsonPath = path.join(this.templatesRoot, 'data', 'templates.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        this.templates = JSON.parse(raw);
        this.isLoaded = true;
      } catch (err) {
        console.warn('[WebsiteTemplateRegistry] Could not parse templates.json:', err);
      }
    }
  }

  private static readonly CATEGORY_INTENTS: Record<string, string[]> = {
    portfolio: ['portfolio', 'resume', 'cv', 'personal', 'creator', 'designer', 'showcase', 'artist', 'photographer', 'architect', 'freelancer'],
    saas: ['saas', 'software', 'platform', 'app', 'tool', 'cloud', 'developer', 'api', 'devops', 'analytics', 'dashboard', 'automation', 'cyber', 'tech', 'engineer'],
    ecommerce: ['ecommerce', 'shop', 'store', 'cart', 'product', 'merch', 'checkout', 'fashion', 'retail', 'clothing', 'buy'],
    services: ['agency', 'service', 'services', 'consulting', 'firm', 'studio', 'b2b', 'strategy', 'marketing', 'creative'],
    health: ['health', 'fitness', 'medical', 'wellness', 'clinic', 'doctor', 'therapy', 'yoga', 'gym', 'pharma', 'care'],
    hospitality: ['hotel', 'resort', 'travel', 'vacation', 'stay', 'lodge', 'hospitality', 'booking'],
    food: ['food', 'restaurant', 'cafe', 'dining', 'bistro', 'bar', 'bakery', 'coffee', 'culinary', 'menu'],
    education: ['education', 'course', 'learning', 'academy', 'school', 'bootcamp', 'university', 'student', 'tutorial', 'edtech'],
    entertainment: ['entertainment', 'game', 'gaming', 'music', 'podcast', 'movie', 'film', 'event', 'media', 'stream']
  };

  private static readonly MOOD_KEYWORDS = ['dark', 'bright', 'minimal', 'clean', 'futuristic', 'modern', 'gradient', 'animated', 'luxury', 'bold', 'editorial', 'white', 'light', '3d', 'maximalism', 'maximalist', 'cyberpunk', 'webgl', 'threejs', 'interactive', 'immersive', 'glow'];
  private static readonly LIGHT_KEYWORDS = ['bright', 'white', 'light', 'clean', 'day'];
  private static readonly DARK_KEYWORDS = ['dark', 'black', 'night', 'midnight', 'cyberpunk', 'deep', 'maximalism', 'maximalist'];

  matchTemplates(query: string, limit: number = 3): WebsiteTemplate[] {
    this.ensureLoaded();
    if (this.templates.length === 0) return [];

    const queryLower = query.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length === 0) {
      return this.templates.slice(0, limit);
    }

    // 1. Detect target categories from query
    const targetCategories: Set<string> = new Set();
    for (const [cat, keywords] of Object.entries(WebsiteTemplateRegistry.CATEGORY_INTENTS)) {
      if (keywords.some((kw) => queryLower.includes(kw))) {
        targetCategories.add(cat);
      }
    }

    // 2. Detect mood and polarity keywords
    const detectedMoods = WebsiteTemplateRegistry.MOOD_KEYWORDS.filter((m) => queryLower.includes(m));
    const isLightRequested = WebsiteTemplateRegistry.LIGHT_KEYWORDS.some((k) => queryLower.includes(k));
    const isDarkRequested = WebsiteTemplateRegistry.DARK_KEYWORDS.some((k) => queryLower.includes(k));
    const is3DMaximalist = ['3d', 'maximalism', 'maximalist', 'webgl', 'futuristic', 'interactive', 'cyberpunk'].some((k) => queryLower.includes(k));

    // 3. Multi-factor weighted scoring
    const scored = this.templates.map((tpl) => {
      let score = 0;
      const catLower = (tpl.category || '').toLowerCase();
      const titleLower = (tpl.title || '').toLowerCase();
      const descLower = (tpl.description || '').toLowerCase();
      const tagLower = (tpl.tags || []).join(' ').toLowerCase();

      // Category match
      if (targetCategories.has(catLower)) {
        score += 150;
      }

      // 3D / Maximalism / High-Impact Visual Studio Boost
      if (is3DMaximalist) {
        if (tagLower.includes('3d') || titleLower.includes('3d') || descLower.includes('3d')) {
          score += 120;
        }
        if (tagLower.includes('futuristic') || descLower.includes('futuristic') || descLower.includes('immersive')) {
          score += 90;
        }
        if (tagLower.includes('animated') || tagLower.includes('gradient') || tagLower.includes('large type')) {
          score += 60;
        }
        // If template is a flagship high-view 3D experience (e.g. void-digital-67, nexus-ai-platform, vectorline-saas)
        if (tpl.slug === 'void-digital-67' || tpl.slug === 'nexus-ai-platform' || tpl.slug === 'vectorline-saas' || tpl.slug === 'creative-portfolio-87') {
          score += 180;
        }
      }

      // Polarity Enforcement (Strict polarity matching to avoid dark templates when bright/white requested)
      const isTemplateDark = tagLower.includes('dark') || descLower.includes('dark') || titleLower.includes('dark');
      const isTemplateLight = tagLower.includes('white') || tagLower.includes('light') || tagLower.includes('clean') || descLower.includes('light') || descLower.includes('white');

      if (isLightRequested) {
        if (isTemplateDark) {
          score -= 200; // Strong penalty for dark templates when user requested bright/white
        }
        if (isTemplateLight) {
          score += 100; // Strong boost for light/white/clean templates
        }
      } else if (isDarkRequested) {
        if (isTemplateLight && !isTemplateDark) {
          score -= 150;
        }
        if (isTemplateDark) {
          score += 100;
        }
      }

      // Mood / aesthetic match
      for (const mood of detectedMoods) {
        if (tagLower.includes(mood) || descLower.includes(mood) || titleLower.includes(mood)) {
          score += 35;
        }
      }

      // Token matches
      for (const t of tokens) {
        if (titleLower.includes(t)) score += 20;
        if (catLower === t) score += 40;
        if (tagLower.includes(t)) score += 20;
        if (descLower.includes(t)) score += 10;
      }

      // Quality & popularity signal from view count (up to 25 pts)
      const popularity = Math.min(25, Math.floor(((tpl as any).view_count || 0) / 400));
      score += popularity;

      return { tpl, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.tpl);
  }

  getTemplateReference(tpl: WebsiteTemplate): TemplateReference {
    let sampleHtmlSnippet: string | undefined;

    if (tpl.paths?.index_html) {
      const fullPath = path.join(this.templatesRoot, tpl.paths.index_html);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Extract main section or first 1500 chars of body
          const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            sampleHtmlSnippet = bodyMatch[1].slice(0, 1500).trim();
          }
        } catch {}
      }
    }

    const designPatterns: string[] = [
      'High-contrast typography with clear hierarchy (H1, H2, subheadline)',
      'Multi-section layout: Navbar, Hero with badge, Feature cards grid, Metrics bar, Pricing table, CTA banner, Footer',
      'Glassmorphism or elevated card backgrounds with subtle 1px borders',
      'Accent action buttons with hover transitions and micro-interactions'
    ];

    return {
      slug: tpl.slug,
      title: tpl.title,
      category: tpl.category,
      description: tpl.description,
      tags: tpl.tags || [],
      sampleHtmlSnippet,
      designPatterns
    };
  }

  findBestTemplate(query: string): WebsiteTemplate | null {
    const matches = this.matchTemplates(query, 1);
    return matches.length > 0 ? matches[0] : null;
  }

  getTemplateFullFiles(tpl: WebsiteTemplate): { html: string; css?: string; slug: string } | null {
    if (!tpl.paths?.index_html) return null;
    const fullPath = path.join(this.templatesRoot, tpl.paths.index_html);
    if (!fs.existsSync(fullPath)) return null;

    try {
      const html = fs.readFileSync(fullPath, 'utf8');
      let css: string | undefined;

      // Extract inline <style>...</style> if present
      const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      const extracted: string[] = [];
      for (const sm of styleMatches) {
        if (sm[1] && sm[1].trim()) extracted.push(sm[1].trim());
      }
      if (extracted.length > 0) {
        css = extracted.join('\n\n');
      }

      // Check for sibling styles.css
      const cssPath = path.join(path.dirname(fullPath), 'styles.css');
      if (fs.existsSync(cssPath)) {
        const fileCss = fs.readFileSync(cssPath, 'utf8');
        css = css ? `${css}\n\n${fileCss}` : fileCss;
      }

      return {
        html,
        css,
        slug: tpl.slug
      };
    } catch {
      return null;
    }
  }

  formatGroundedContext(query: string): string {
    const matches = this.matchTemplates(query, 2);
    if (matches.length === 0) return '';

    const lines: string[] = [
      '## Grounded Website Template References (from local website-templates)',
      'Use the architectural patterns, section layouts, and visual hierarchy from these production references:'
    ];

    for (const tpl of matches) {
      const ref = this.getTemplateReference(tpl);
      lines.push(`\n### Reference: ${ref.title} [${ref.category}]`);
      lines.push(`Description: ${ref.description}`);
      lines.push(`Tags: ${ref.tags.join(', ')}`);
      if (ref.designPatterns) {
        lines.push(`Recommended Patterns:\n${ref.designPatterns.map((p) => `- ${p}`).join('\n')}`);
      }
      if (ref.sampleHtmlSnippet) {
        lines.push(`Structural Layout Sample:\n\`\`\`html\n${ref.sampleHtmlSnippet.slice(0, 800)}\n\`\`\``);
      }
    }

    return lines.join('\n');
  }
}
