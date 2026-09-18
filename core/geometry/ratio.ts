/**
 * Single Source of Truth for Supported Aspect Ratios, Canonical Dimensions,
 * and Project-Scoped Ratio Capability in D8.7.
 */

export type SupportedRatio = '3:4' | '9:16' | '16:9' | '1:1' | '4:3';

export interface CanonicalDimension {
  readonly width: number;
  readonly height: number;
}

export interface RatioMetadata {
  readonly dimensions: CanonicalDimension;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  /**
   * Informative, human-readable documentation ONLY.
   * Non-authoritative: Code must NEVER use this for automated routing or heuristic decisions.
   */
  readonly commonUseCases: readonly string[];
}

export const CANONICAL_RATIO_REGISTRY: Record<SupportedRatio, RatioMetadata> = {
  '3:4': {
    dimensions: { width: 1080, height: 1440 },
    orientation: 'portrait',
    commonUseCases: ['Graphic poster', 'Editorial hero', 'Standard artboard print']
  },
  '9:16': {
    dimensions: { width: 1080, height: 1920 },
    orientation: 'portrait',
    commonUseCases: ['Mobile stories', 'Reels', 'Vertical lockscreen']
  },
  '16:9': {
    dimensions: { width: 1920, height: 1080 },
    orientation: 'landscape',
    commonUseCases: ['Keynote presentation', 'Desktop display', 'Widescreen visual']
  },
  '1:1': {
    dimensions: { width: 1080, height: 1080 },
    orientation: 'square',
    commonUseCases: ['Social feed square', 'Album artwork', 'Focal badge']
  },
  '4:3': {
    dimensions: { width: 1440, height: 1080 },
    orientation: 'landscape',
    commonUseCases: ['Classic screen display', 'Landscape editorial publication']
  }
} as const;

export const SUPPORTED_RATIOS: readonly SupportedRatio[] = ['3:4', '9:16', '16:9', '1:1', '4:3'] as const;

export type RatioOrigin = 'explicit_user' | 'agent_decision' | 'default';

export interface RatioState {
  readonly ratio: SupportedRatio;
  readonly dimensions: CanonicalDimension;
  readonly origin: RatioOrigin;
  readonly locked: boolean;
}

export function isSupportedRatio(ratio: string): ratio is SupportedRatio {
  return SUPPORTED_RATIOS.includes(ratio as SupportedRatio);
}

export function getCanonicalDimensions(ratio: SupportedRatio): CanonicalDimension {
  const meta = CANONICAL_RATIO_REGISTRY[ratio];
  if (!meta) {
    throw new Error(`Unsupported ratio: "${ratio}". Supported ratios: ${SUPPORTED_RATIOS.join(', ')}`);
  }
  return { ...meta.dimensions };
}

export function getOrientationForRatio(ratio: SupportedRatio): 'portrait' | 'landscape' | 'square' {
  return CANONICAL_RATIO_REGISTRY[ratio].orientation;
}

export interface ExplicitRatioParseResult {
  readonly found: boolean;
  readonly rawRatio?: string;
  readonly isSupported: boolean;
  readonly canonicalRatio?: SupportedRatio;
  readonly error?: string;
}

/**
 * Parses user prompt text to detect explicit ratio instructions.
 * If the user explicitly asks for an unsupported ratio (e.g. "2:3", "21:9"),
 * it immediately marks it as unsupported with an explicit error.
 * ZERO silent coercion.
 */
export function parseExplicitRatio(prompt: string): ExplicitRatioParseResult {
  if (!prompt || typeof prompt !== 'string') {
    return { found: false, isSupported: false };
  }

  const lower = prompt.toLowerCase();

  // 1. Check for explicit verbal phrases first
  if (/\b(?:widescreen|horizontal 16:9|landscape 16:9)\b/.test(lower)) {
    return { found: true, rawRatio: '16:9', isSupported: true, canonicalRatio: '16:9' };
  }
  if (/\b(?:vertical story|mobile story|reels ratio|stories format|tall 9:16)\b/.test(lower)) {
    return { found: true, rawRatio: '9:16', isSupported: true, canonicalRatio: '9:16' };
  }
  if (/\b(?:square format|square post|1:1 square)\b/.test(lower)) {
    return { found: true, rawRatio: '1:1', isSupported: true, canonicalRatio: '1:1' };
  }

  // 2. Check for numeric ratio pattern (e.g. 3:4, 9:16, 16:9, 1:1, 4:3, 2:3, 21:9)
  // Match patterns like "3:4", "9/16", "16 by 9", "16x9", "in 9:16 format", etc.
  const ratioRegex = /\b(\d{1,2})\s*[:/x×]\s*(\d{1,2})\b/gi;
  let match: RegExpExecArray | null;

  while ((match = ratioRegex.exec(prompt)) !== null) {
    const num1 = parseInt(match[1], 10);
    const num2 = parseInt(match[2], 10);
    const matchIndex = match.index;
    const following = prompt.slice(matchIndex + match[0].length, matchIndex + match[0].length + 10).toLowerCase();
    const preceding = prompt.slice(Math.max(0, matchIndex - 20), matchIndex).toLowerCase();

    // Guard: ignore timestamps (e.g. "9:30 am", "10:15 pm", or minutes >= 20 except 16:9)
    if (/\s*(?:am|pm|a\.m\.|p\.m\.|o'clock)\b/.test(following)) {
      continue;
    }
    if (num2 >= 20 && num1 < 20) {
      // e.g. 9:30, 10:45 -> timestamp
      continue;
    }

    // Guard: ignore scripture chapter:verse citations if preceded by common book names
    if (/\b(?:genesis|exodus|leviticus|numbers|deuteronomy|matthew|mark|luke|john|acts|romans|corinthians|revelation|chapter|verse|ch\.)\s*$/i.test(preceding)) {
      continue;
    }

    const rawRatio = `${num1}:${num2}`;
    if (isSupportedRatio(rawRatio)) {
      return {
        found: true,
        rawRatio,
        isSupported: true,
        canonicalRatio: rawRatio
      };
    }

    // If it's a recognized common aspect ratio that is unsupported (e.g. 2:3, 3:2, 21:9, 16:10, 4:5, 5:4)
    // or has explicit ratio context words ("ratio", "format", "canvas", "size", "dimensions", "make it", "aspect")
    const hasRatioContext =
      /\b(?:ratio|format|canvas|size|dimensions?|make\s+it|layout|banner|poster|artboard)\b/i.test(preceding) ||
      /\b(?:ratio|format|canvas|size|dimensions?|layout|banner|poster|artboard|vertical|horizontal|ultrawide)\b/i.test(following) ||
      ['2:3', '3:2', '21:9', '16:10', '4:5', '5:4', '5:7', '7:5'].includes(rawRatio);

    if (hasRatioContext) {
      return {
        found: true,
        rawRatio,
        isSupported: false,
        error: `Unsupported aspect ratio: "${rawRatio}". D8.7 supports exactly five canonical ratios: ${SUPPORTED_RATIOS.join(', ')}.`
      };
    }
  }

  return { found: false, isSupported: false };
}

/**
 * Integer-safe validation for dimensions against canonical supported ratios.
 * Validates that (width, height) matches any canonical ratio target.
 */
export function validateDimensionPair(width: number, height: number): {
  valid: boolean;
  ratio?: SupportedRatio;
  canonicalDimensions?: CanonicalDimension;
  error?: string;
} {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return { valid: false, error: `Dimensions must be positive integers: received ${width}x${height}` };
  }

  // Exact canonical match check
  for (const r of SUPPORTED_RATIOS) {
    const dim = CANONICAL_RATIO_REGISTRY[r].dimensions;
    if (dim.width === width && dim.height === height) {
      return { valid: true, ratio: r, canonicalDimensions: dim };
    }
  }

  // Integer-safe ratio check:
  // 3:4  <=> width * 4 === height * 3
  for (const r of SUPPORTED_RATIOS) {
    const canonical = CANONICAL_RATIO_REGISTRY[r].dimensions;
    if (width * canonical.height === height * canonical.width) {
      return { valid: true, ratio: r, canonicalDimensions: canonical };
    }
  }

  return {
    valid: false,
    error: `Unsupported dimensions: received ${width}x${height} (ratio ${(width / height).toFixed(3)}). Supported ratios are: ${SUPPORTED_RATIOS.join(', ')}.`
  };
}

/**
 * Project-Scoped Ratio Capability.
 * Encapsulates ratio state per project to guarantee zero cross-project state leakage.
 */
export class ProjectRatioCapability {
  private projectStates: Map<string, RatioState> = new Map();

  getSupportedRatios(): readonly SupportedRatio[] {
    return SUPPORTED_RATIOS;
  }

  getDimensions(ratio: SupportedRatio): CanonicalDimension {
    return getCanonicalDimensions(ratio);
  }

  validateRatio(ratio: string): ratio is SupportedRatio {
    return isSupportedRatio(ratio);
  }

  validateDimensions(width: number, height: number): { valid: boolean; ratio?: SupportedRatio; error?: string } {
    return validateDimensionPair(width, height);
  }

  /**
   * Retrieves the current ratio state for a specific project.
   * Defaults to 3:4 if no state has been set for this projectId.
   */
  getProjectRatio(projectId: string): RatioState {
    const existing = this.projectStates.get(projectId);
    if (existing) {
      return existing;
    }

    const defaultState: RatioState = {
      ratio: '3:4',
      dimensions: CANONICAL_RATIO_REGISTRY['3:4'].dimensions,
      origin: 'default',
      locked: false
    };
    return defaultState;
  }

  /**
   * Sets the ratio state for a specific project.
   * If the project's ratio is locked (explicit user instruction),
   * any subsequent call with a different origin will be rejected.
   */
  setProjectRatio(projectId: string, ratio: SupportedRatio, origin: RatioOrigin): RatioState {
    if (!isSupportedRatio(ratio)) {
      throw new Error(`Cannot set unsupported ratio "${ratio}". Supported ratios: ${SUPPORTED_RATIOS.join(', ')}`);
    }

    const current = this.projectStates.get(projectId);
    if (current?.locked && origin !== 'explicit_user') {
      throw new Error(
        `Cannot override explicit user ratio for project "${projectId}". Explicit ratio "${current.ratio}" is locked.`
      );
    }

    const newState: RatioState = {
      ratio,
      dimensions: CANONICAL_RATIO_REGISTRY[ratio].dimensions,
      origin,
      locked: origin === 'explicit_user'
    };

    this.projectStates.set(projectId, newState);
    return newState;
  }

  /**
   * Hydrates in-memory ratio state from persistent project metadata.
   */
  hydrateProjectRatio(projectId: string, state: RatioState): void {
    if (state && isSupportedRatio(state.ratio)) {
      this.projectStates.set(projectId, {
        ratio: state.ratio,
        dimensions: CANONICAL_RATIO_REGISTRY[state.ratio].dimensions,
        origin: state.origin,
        locked: state.locked ?? (state.origin === 'explicit_user')
      });
    }
  }

  /**
   * Clears state for a project (e.g. on project deletion).
   */
  clearProject(projectId: string): void {
    this.projectStates.delete(projectId);
  }
}
