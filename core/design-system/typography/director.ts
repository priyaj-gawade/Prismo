import { FontRegistry, type FontDefinition } from './registry.ts';

export interface TypographicSystem {
  display: {
    font: FontDefinition;
    cssFamily: string;
    scaleGuideline: string;
    letterSpacing: string;
    lineHeight: string;
    textTransform: 'none' | 'uppercase';
  };
  accent?: {
    font: FontDefinition;
    cssFamily: string;
  };
  body: {
    font: FontDefinition;
    cssFamily: string;
    scaleGuideline: string;
    lineHeight: string;
  };
  utility: {
    font: FontDefinition;
    cssFamily: string;
    scaleGuideline: string;
    letterSpacing: string;
    textTransform: 'uppercase' | 'none';
  };
  code?: {
    font: FontDefinition;
    cssFamily: string;
  };
  googleFontUrl: string;
}

export interface TypographyDirectives {
  subject: string;
  era?: string;
  mood?: string;
  hasCode?: boolean;
  referenceDna?: {
    typographyCharacter?: string;
  };
}

export class TypographyDirector {
  private registry: FontRegistry;

  constructor(registry?: FontRegistry) {
    this.registry = registry || new FontRegistry();
  }

  public directTypography(directives: TypographyDirectives): TypographicSystem {
    const subLower = directives.subject.toLowerCase();
    const moodLower = (directives.mood || '').toLowerCase();
    const refChar = (directives.referenceDna?.typographyCharacter || '').toLowerCase();

    let displayFamily = 'Plus Jakarta Sans';
    let bodyFamily = 'Inter';
    let utilityFamily = 'Inter';
    let displayTransform: 'none' | 'uppercase' = 'none';
    let letterSpacing = '-0.03em';
    let scaleGuideline = 'clamp(64px, 8vw, 120px)';

    // HARD RULE: Technical Subject != Monospace Display!
    // Technical subjects choose from Neo-Grotesque, Editorial Serif, or High-Impact Grotesque.

    if (subLower.includes('distributed') || subLower.includes('consensus') || subLower.includes('protocol') || subLower.includes('systems') || subLower.includes('langgraph') || subLower.includes('agent') || subLower.includes('pipeline')) {
      // High-craft systems engineering: Modern high-impact Grotesque or Neo-Grotesque with selective editorial accent
      displayFamily = 'Plus Jakarta Sans';
      bodyFamily = 'Inter';
      utilityFamily = 'Inter';
      displayTransform = 'none';
      letterSpacing = '-0.02em';
      scaleGuideline = 'clamp(80px, 9.5vw, 140px)';
    } else if (subLower.includes('bauhaus') || subLower.includes('architecture') || subLower.includes('dessau') || subLower.includes('gropius')) {
      // Architectural Constructivism: Humanist / Architectural Sans with generous spacing
      displayFamily = 'Outfit';
      bodyFamily = 'Inter';
      utilityFamily = 'Outfit';
      displayTransform = 'uppercase';
      letterSpacing = '-0.01em';
      scaleGuideline = 'clamp(72px, 8.5vw, 130px)';
    } else if (subLower.includes('porsche') || subLower.includes('motorsport') || subLower.includes('gt3') || subLower.includes('automotive')) {
      // Precision Automotive / Cinematic: High-contrast Grotesque or Bold Sans
      displayFamily = 'Syne';
      bodyFamily = 'Inter';
      utilityFamily = 'Plus Jakarta Sans';
      displayTransform = 'none';
      letterSpacing = '-0.03em';
      scaleGuideline = 'clamp(72px, 8vw, 110px)';
    } else if (moodLower.includes('editorial') || moodLower.includes('literary') || refChar.includes('serif')) {
      // Refined Editorial: Playfair Display / Instrument Serif
      displayFamily = 'Playfair Display';
      bodyFamily = 'Inter';
      utilityFamily = 'Inter';
      displayTransform = 'none';
      letterSpacing = '-0.01em';
      scaleGuideline = 'clamp(68px, 7.5vw, 115px)';
    } else if (subLower.includes('minimal') || subLower.includes('swiss')) {
      // Swiss International: Inter / Plus Jakarta Sans
      displayFamily = 'Inter';
      bodyFamily = 'Inter';
      utilityFamily = 'Inter';
      displayTransform = 'none';
      letterSpacing = '-0.04em';
      scaleGuideline = 'clamp(72px, 8vw, 120px)';
    }

    const displayFont = this.registry.getFont(displayFamily) || this.registry.getFont('Plus Jakarta Sans')!;
    const bodyFont = this.registry.getFont(bodyFamily) || this.registry.getFont('Inter')!;
    const utilityFont = this.registry.getFont(utilityFamily) || this.registry.getFont('Inter')!;

    const selectedFamilies = [displayFont.family, bodyFont.family];
    if (utilityFont.family !== displayFont.family && utilityFont.family !== bodyFont.family) {
      selectedFamilies.push(utilityFont.family);
    }

    // Include Instrument Serif for selective accent typography
    const accentFont = this.registry.getFont('Instrument Serif');
    if (accentFont && !selectedFamilies.includes(accentFont.family)) {
      selectedFamilies.push(accentFont.family);
    }

    let codeFont: FontDefinition | undefined;
    if (directives.hasCode) {
      codeFont = this.registry.getFont('JetBrains Mono');
      if (codeFont && !selectedFamilies.includes(codeFont.family)) {
        selectedFamilies.push(codeFont.family);
      }
    }

    const googleFontUrl = this.registry.generateGoogleFontUrl(selectedFamilies);

    return {
      display: {
        font: displayFont,
        cssFamily: `'${displayFont.family}', ${displayFont.fallbackChain}`,
        scaleGuideline,
        letterSpacing,
        lineHeight: '0.95',
        textTransform: displayTransform
      },
      accent: accentFont
        ? {
            font: accentFont,
            cssFamily: `'${accentFont.family}', ${accentFont.fallbackChain}`
          }
        : undefined,
      body: {
        font: bodyFont,
        cssFamily: `'${bodyFont.family}', ${bodyFont.fallbackChain}`,
        scaleGuideline: 'clamp(24px, 2.5vw, 30px)',
        lineHeight: '1.45'
      },
      utility: {
        font: utilityFont,
        cssFamily: `'${utilityFont.family}', ${utilityFont.fallbackChain}`,
        scaleGuideline: 'clamp(22px, 2vw, 26px)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
      },
      code: codeFont
        ? {
            font: codeFont,
            cssFamily: `'${codeFont.family}', ${codeFont.fallbackChain}`
          }
        : undefined,
      googleFontUrl
    };
  }

  public getRegistry(): FontRegistry {
    return this.registry;
  }

  public recommendSystem(options: {
    subject: string;
    designDNA?: any;
    era?: string;
    mood?: string;
  }): {
    display: FontDefinition;
    accent?: FontDefinition;
    body: FontDefinition;
    utility: FontDefinition;
    code: FontDefinition;
    googleFontLink: string;
    fontFamilies: string[];
  } {
    const sys = this.directTypography({
      subject: options.subject,
      era: options.era,
      mood: options.mood || options.designDNA?.colorMood,
      hasCode: true,
      referenceDna: options.designDNA ? { typographyCharacter: options.designDNA.typographyCharacter } : undefined
    });
    const codeDef = this.registry.getFont('JetBrains Mono') || {
      family: 'JetBrains Mono',
      source: 'google-fonts',
      license: 'OFL',
      roles: ['code'],
      styles: ['400'],
      availability: 'available',
      loadMethod: 'link',
      fallbackChain: 'monospace',
      category: 'monospace'
    };
    const fontFamilies = [sys.display.font.family, sys.body.font.family, sys.utility.font.family];
    if (sys.accent && !fontFamilies.includes(sys.accent.font.family)) {
      fontFamilies.push(sys.accent.font.family);
    }
    return {
      display: sys.display.font,
      accent: sys.accent?.font,
      body: sys.body.font,
      utility: sys.utility.font,
      code: sys.code?.font || codeDef,
      googleFontLink: sys.googleFontUrl,
      fontFamilies
    };
  }
}

