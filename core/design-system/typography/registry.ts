export interface FontDefinition {
  family: string;
  source: 'google-fonts' | 'bundled' | 'system' | 'remote-approved';
  license: string;
  roles: ('display' | 'body' | 'utility' | 'code')[];
  styles: string[]; // e.g. ['400', '600', '700', '800']
  availability: 'available' | 'fallback-only';
  loadMethod: 'link' | 'import' | 'system';
  fallbackChain: string;
  googleFontQuery?: string;
  category: 'neo-grotesk' | 'grotesque' | 'editorial-serif' | 'geometric-display' | 'humanist-sans' | 'monospace';
}

export class FontRegistry {
  private fonts: Map<string, FontDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    const defaultFonts: FontDefinition[] = [
      // 1. Neo-Grotesque / Grotesque (Workhorse display & body for high-craft editorial/modern posters)
      {
        family: 'Plus Jakarta Sans',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'body', 'utility'],
        styles: ['500', '600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        googleFontQuery: 'family=Plus+Jakarta+Sans:wght@500;600;700;800',
        category: 'neo-grotesk'
      },
      {
        family: 'Inter',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['body', 'utility', 'display'],
        styles: ['400', '500', '600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        googleFontQuery: 'family=Inter:wght@400;500;600;700;800',
        category: 'neo-grotesk'
      },
      {
        family: 'Syne',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'Impact, sans-serif',
        googleFontQuery: 'family=Syne:wght@700;800',
        category: 'grotesque'
      },
      {
        family: 'Oswald',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['600', '700'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: '"Arial Narrow", sans-serif',
        googleFontQuery: 'family=Oswald:wght@600;700',
        category: 'grotesque'
      },
      {
        family: 'Archivo Black',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['400'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'Impact, sans-serif',
        googleFontQuery: 'family=Archivo+Black',
        category: 'grotesque'
      },
      {
        family: 'Bebas Neue',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['400'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: '"Arial Narrow", Impact, sans-serif',
        googleFontQuery: 'family=Bebas+Neue',
        category: 'grotesque'
      },

      // 2. High-Craft Editorial Serif (Historic, literary, luxury, or academic depth)
      {
        family: 'Playfair Display',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['600', '700', '900'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'Georgia, "Times New Roman", serif',
        googleFontQuery: 'family=Playfair+Display:wght@600;700;900',
        category: 'editorial-serif'
      },
      {
        family: 'Instrument Serif',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['400', '400i'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'Georgia, serif',
        googleFontQuery: 'family=Instrument+Serif:ital@0;1',
        category: 'editorial-serif'
      },
      {
        family: 'Cinzel',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'Trajan, Georgia, serif',
        googleFontQuery: 'family=Cinzel:wght@700;800',
        category: 'editorial-serif'
      },
      {
        family: 'DM Serif Display',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['400'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'Georgia, serif',
        googleFontQuery: 'family=DM+Serif+Display',
        category: 'editorial-serif'
      },

      // 3. Geometric Display (Refined constructivist/modernist—ORBITRON EXCLUDED)
      {
        family: 'Poppins',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'body', 'utility'],
        styles: ['400', '500', '600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        googleFontQuery: 'family=Poppins:wght@400;500;600;700;800',
        category: 'geometric-display'
      },
      {
        family: 'Space Grotesk',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'utility'],
        styles: ['600', '700'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'sans-serif',
        googleFontQuery: 'family=Space+Grotesk:wght@600;700',
        category: 'geometric-display'
      },
      {
        family: 'Sora',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'body'],
        styles: ['600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'sans-serif',
        googleFontQuery: 'family=Sora:wght@600;700;800',
        category: 'geometric-display'
      },
      {
        family: 'Chakra Petch',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display'],
        styles: ['600', '700'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'sans-serif',
        googleFontQuery: 'family=Chakra+Petch:wght@600;700',
        category: 'geometric-display'
      },

      // 4. Humanist & Architectural Sans (Bauhaus, structural, warm clarity)
      {
        family: 'Outfit',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'body', 'utility'],
        styles: ['500', '600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'system-ui, sans-serif',
        googleFontQuery: 'family=Outfit:wght@500;600;700;800',
        category: 'humanist-sans'
      },
      {
        family: 'Epilogue',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'body'],
        styles: ['600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'sans-serif',
        googleFontQuery: 'family=Epilogue:wght@600;700;800',
        category: 'humanist-sans'
      },
      {
        family: 'Manrope',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['display', 'body', 'utility'],
        styles: ['500', '600', '700', '800'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'system-ui, sans-serif',
        googleFontQuery: 'family=Manrope:wght@500;600;700;800',
        category: 'humanist-sans'
      },

      // 5. Code Monospace (RESTRICTED TO CODE SYNTAX ONLY)
      {
        family: 'JetBrains Mono',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['code'],
        styles: ['400', '600'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        googleFontQuery: 'family=JetBrains+Mono:wght@400;600',
        category: 'monospace'
      },
      {
        family: 'Fira Code',
        source: 'google-fonts',
        license: 'OFL',
        roles: ['code'],
        styles: ['400', '600'],
        availability: 'available',
        loadMethod: 'link',
        fallbackChain: 'ui-monospace, "SF Mono", Menlo, monospace',
        googleFontQuery: 'family=Fira+Code:wght@400;600',
        category: 'monospace'
      }
    ];

    for (const font of defaultFonts) {
      this.fonts.set(font.family.toLowerCase(), font);
    }
  }

  public getFont(family: string): FontDefinition | undefined {
    return this.fonts.get(family.toLowerCase());
  }

  public listApprovedFonts(role?: 'display' | 'body' | 'utility' | 'code'): FontDefinition[] {
    const all = Array.from(this.fonts.values());
    if (!role) return all;
    return all.filter((f) => f.roles.includes(role));
  }

  public isApproved(family: string): boolean {
    return this.fonts.has(family.toLowerCase());
  }

  public generateGoogleFontUrl(families: string[]): string {
    const queries: string[] = [];
    for (const fam of families) {
      const def = this.getFont(fam);
      if (def && def.source === 'google-fonts' && def.googleFontQuery) {
        queries.push(def.googleFontQuery);
      }
    }
    if (queries.length === 0) {
      return 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap';
    }
    return `https://fonts.googleapis.com/css2?${queries.join('&')}&display=swap`;
  }

  public static getFont(family: string): FontDefinition | undefined {
    return new FontRegistry().getFont(family);
  }

  public static getAllFonts(): FontDefinition[] {
    return new FontRegistry().listApprovedFonts();
  }

  public static isApproved(family: string): boolean {
    return new FontRegistry().isApproved(family);
  }
}

