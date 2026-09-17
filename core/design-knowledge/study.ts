import { CURATED_DESIGN_REFERENCES, type DesignReferenceProfile } from './references.ts';

export type ImageIntent = 'image_required' | 'image_helpful' | 'image_optional' | 'image_not_wanted';

export interface DesignDNA {
  referenceId: string;
  referenceName: string;
  imageIntent: ImageIntent;
  explicitImageRequested: boolean;
  imageSearchQuery?: string;
  concreteSearchQueries: string[];
  typographyCharacter: string;
  spatialRhythm: string;
  paletteDynamics: string;
  imageTreatment: string;
  geometricScaffold: string;
  densityRatio: string;
  focalHierarchy: string;
  avoidClichés: string[];
}

export class ReferenceStudyEngine {
  /**
   * Detects natural visual language phrasing indicating the user explicitly wants an image.
   */
  public detectExplicitImageIntent(prompt: string): boolean {
    const pattern = /\b(?:with\s+(?:a\s+|an\s+)?(?:suitable\s+|relevant\s+|matching\s+|good\s+|clean\s+|dominant\s+|hero\s+|background\s+)?(?:images?|photos?|photographs?|photography|pictures?|visuals?|artwork|illustrations?)|include\s+(?:a\s+|an\s+)?(?:images?|photos?|photographs?|photography|pictures?)|featuring\s+(?:a\s+|an\s+)?(?:images?|photos?|photographs?|photography|pictures?)|photos?\s+of|pictures?\s+of|images?\s+of|has\s+(?:an\s+|a\s+)?(?:images?|photos?)|with\s+imagery)\b/i;
    return pattern.test(prompt);
  }

  /**
   * Detects negative intent indicating the user wants a text-only poster.
   */
  public detectExplicitNoImageIntent(prompt: string): boolean {
    const pattern = /\b(?:purely\s+typographic|text\s+only|typography\s+only|no\s+images?|no\s+photos?|pure\s+type|manifesto)\b/i;
    return pattern.test(prompt);
  }

  /**
   * Synthesizes concrete stock search queries by stripping meta-prompt noise
   * and generating concrete visual subjects (e.g. "book talk Genesis" -> "open vintage book library dramatic lighting").
   */
  public synthesizeVisualQuery(prompt: string): { primary: string; fallback: string } {
    // Strip meta-prompt noise phrases
    const noisePatterns = [
      /\bposter\s+design\b/gi,
      /\bclean\s+layout\b/gi,
      /\bminimal(?:ist)?\s+style\b/gi,
      /\bprofessional\s+tone\b/gi,
      /\bfor\s+organizing\s+(?:a|an)\b/gi,
      /\borganizing\s+(?:a|an)\b/gi,
      /\bevent\s+name\b/gi,
      /\bwith\s+(?:a\s+|an\s+)?(?:suitable\s+|relevant\s+|matching\s+|good\s+|clean\s+|dominant\s+|hero\s+)?(?:image|photo|photograph|picture|visual|artwork|illustration)\b/gi,
      /\bfeaturing\s+(?:a\s+|an\s+)?(?:image|photo|photograph|picture)\b/gi,
      /\bhigh\s+quality\b/gi
    ];

    let cleaned = prompt;
    for (const pat of noisePatterns) {
      cleaned = cleaned.replace(pat, ' ');
    }
    cleaned = cleaned.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const lower = cleaned.toLowerCase();

    // Semantic domain synthesis
    if (/\b(?:book|author|reading|literature|novel|genesis)\b/i.test(lower)) {
      return {
        primary: 'open vintage book dramatic library lighting',
        fallback: 'classic hardcover book moody lighting'
      };
    }

    if (/\b(?:porsche|mustang|supercar|motorsport|race\s*car|automotive)\b/i.test(lower)) {
      const brand = /\bporsche\b/i.test(lower) ? 'Porsche 911 GT3 RS' : (/\bmustang\b/i.test(lower) ? 'Ford Mustang' : 'supercar');
      return {
        primary: `${brand} race track dramatic lighting`,
        fallback: `${brand} automotive editorial photography`
      };
    }

    if (/\b(?:bauhaus|dessau|gropius)\b/i.test(lower)) {
      return {
        primary: 'Bauhaus Dessau architecture building modernism Walter Gropius',
        fallback: 'modernist geometric architecture facade'
      };
    }

    if (/\b(?:architecture|building|interior|facade)\b/i.test(lower)) {
      return {
        primary: 'modern minimalist architecture geometric light shadow',
        fallback: 'architectural concrete geometric facade'
      };
    }

    if (/\b(?:clapperboard|video\s+edit|cinema|film|movie)\b/i.test(lower)) {
      return {
        primary: 'video editing timeline clapperboard film studio',
        fallback: 'cinematic film production camera clapperboard'
      };
    }

    if (/\b(?:concert|festival|music|audio|sound)\b/i.test(lower)) {
      return {
        primary: 'live concert stage atmospheric lighting',
        fallback: 'musical performance stage lights'
      };
    }

    // Default cleaned entity query
    const keywords = cleaned.split(/\s+/).slice(0, 5).join(' ');
    return {
      primary: `${keywords} dramatic lighting`,
      fallback: keywords || 'artistic editorial photography'
    };
  }

  public studySubject(prompt: string): DesignDNA {
    const pLower = prompt.toLowerCase();
    const explicitImage = this.detectExplicitImageIntent(prompt);
    const explicitNoImage = this.detectExplicitNoImageIntent(prompt);

    // Synthesize concrete search query
    const synthQueries = this.synthesizeVisualQuery(prompt);

    let ref: DesignReferenceProfile;
    let imageIntent: ImageIntent = 'image_optional';

    // 1. Explicit no-image mandate
    if (explicitNoImage) {
      ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'swiss-international')!;
      imageIntent = 'image_not_wanted';
    }
    // 2. Explicit image mandate (Tier 1 Constraint Hierarchy: user overrides style defaults)
    else if (explicitImage) {
      imageIntent = 'image_required';
      // If book/author, automotive, cinema, or general event -> cinematic editorial
      if (/\b(?:bauhaus|dessau|gropius)\b/i.test(pLower)) {
        ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'constructivist-architectural')!;
      } else {
        ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'cinematic-editorial')!;
      }
    }
    // 3. Domain Heuristics (when user didn't explicitly mandate)
    else if (
      pLower.includes('porsche') ||
      pLower.includes('mustang') ||
      pLower.includes('motorsport') ||
      pLower.includes('supercar') ||
      pLower.includes('automotive') ||
      pLower.includes('clapperboard') ||
      pLower.includes('cinematic') ||
      pLower.includes('photograph')
    ) {
      ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'cinematic-editorial')!;
      imageIntent = 'image_required';
    } else if (
      pLower.includes('distributed') ||
      pLower.includes('consensus') ||
      pLower.includes('database') ||
      pLower.includes('protocol') ||
      pLower.includes('kernel') ||
      pLower.includes('langgraph') ||
      pLower.includes('agent') ||
      pLower.includes('pipeline') ||
      pLower.includes('systems') ||
      (pLower.includes('architecture') && (pLower.includes('software') || pLower.includes('engine') || pLower.includes('multi-agent')))
    ) {
      ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'technical-schematic')!;
      imageIntent = 'image_optional';
    } else if (pLower.includes('bauhaus') || pLower.includes('dessau') || pLower.includes('gropius') || (pLower.includes('architecture') && !pLower.includes('software'))) {
      ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'constructivist-architectural')!;
      imageIntent = 'image_helpful';
    } else if (pLower.includes('typographic') || pLower.includes('manifesto') || pLower.includes('swiss') || pLower.includes('pure type')) {
      ref = CURATED_DESIGN_REFERENCES.find((r) => r.id === 'swiss-international')!;
      imageIntent = 'image_not_wanted';
    } else {
      // Default to Swiss International with high craft
      ref = CURATED_DESIGN_REFERENCES[0];
      imageIntent = 'image_optional';
    }

    return {
      referenceId: ref.id,
      referenceName: ref.name,
      imageIntent,
      explicitImageRequested: explicitImage,
      imageSearchQuery: imageIntent !== 'image_not_wanted' ? synthQueries.primary : undefined,
      concreteSearchQueries: [synthQueries.primary, synthQueries.fallback],
      typographyCharacter: ref.typographyDiscipline,
      spatialRhythm: ref.spatialRhythm,
      paletteDynamics: ref.paletteApproach,
      imageTreatment: ref.imageRelationship,
      geometricScaffold: ref.geometricScaffold,
      densityRatio: '35% to 45% untouched negative space',
      focalHierarchy: 'One dominant visual/typographic hero (60%+ hierarchy weight) + 2-3 supporting editorial points',
      avoidClichés: ref.avoidClichés
    };
  }

  public analyzeRequest(prompt: string, projectId?: string): {
    dna: DesignDNA;
    imageIntent: ImageIntent;
    searchKeywords: string[];
    suggestedArchetype: string;
    guidanceNotes: string[];
  } {
    const dna = this.studySubject(prompt);
    const searchKeywords = dna.imageSearchQuery ? [dna.imageSearchQuery, ...dna.concreteSearchQueries.slice(1)] : [];
    return {
      dna,
      imageIntent: dna.imageIntent,
      searchKeywords,
      suggestedArchetype: dna.referenceId,
      guidanceNotes: [
        `Reference Profile: ${dna.referenceName}`,
        `Spatial Rhythm: ${dna.spatialRhythm}`,
        `Typography Character: ${dna.typographyCharacter}`,
        `Explicit Image Mandate: ${dna.explicitImageRequested ? 'YES (User Mandated)' : 'NO'}`,
        `Avoid: ${dna.avoidClichés.join(', ')}`
      ]
    };
  }
}

