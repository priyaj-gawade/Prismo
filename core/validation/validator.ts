export interface SelectorCoverage {
  totalClasses: number;
  coveredClasses: number;
  coverageRatio: number;
  missingKeyClasses: string[];
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  odIdCoverage: {
    totalSections: number;
    taggedSections: number;
    percentage: number;
  };
  selectorCoverage?: SelectorCoverage;
  hasVisualProperties?: boolean;
  antiSlop?: {
    slopDetected: boolean;
    violations: string[];
    warnings?: string[];
    templateFormulaDetected?: boolean;
    metrics?: {
      microTextCount: number;
      pillCount: number;
      statusDotCount: number;
      headerRailDetected: boolean;
      footerRailDetected: boolean;
      fakeMetadataCount: number;
      nodeCardCount: number;
      graphContainerCount: number;
      defaultVueFlowClassUsage: boolean;
      monospaceDominant: boolean;
      displayMonospaceUsage: boolean;
    };
  };
}

export class ArtifactValidator {
  /**
   * Validate HTML and CSS for completeness, selector coverage, and structure.
   */
  validate(html: string, css?: string, target: string = 'website'): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Basic HTML Structure
    if (!html || html.trim().length === 0) {
      errors.push('HTML content is empty');
      return {
        valid: false,
        errors,
        warnings,
        odIdCoverage: { totalSections: 0, taggedSections: 0, percentage: 0 }
      };
    }

    if (!html.toLowerCase().includes('<!doctype html>')) {
      warnings.push("Missing '<!DOCTYPE html>' declaration");
    }

    if (!html.includes('<html') || !html.includes('</html>')) {
      errors.push("Missing <html> open or close tag");
    }

    if (!html.includes('<body') || !html.includes('</body>')) {
      errors.push("Missing <body> open or close tag");
    }

    // 2. CSS Link
    if (!html.includes('styles.css') && !html.includes('<style')) {
      warnings.push("HTML does not reference 'styles.css' or include inline <style>");
    }

    // 3. data-od-id Coverage on Structural Elements
    const sectionTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    let totalSections = 0;
    let taggedSections = 0;

    for (const tag of sectionTags) {
      const tagRegex = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(html)) !== null) {
        totalSections++;
        const attrs = match[1];
        if (attrs && attrs.includes('data-od-id=')) {
          taggedSections++;
        } else {
          warnings.push(`Structural <${tag}> tag is missing 'data-od-id' attribute`);
        }
      }
    }

    const percentage = totalSections > 0 ? Math.round((taggedSections / totalSections) * 100) : 100;
    if (totalSections > 0 && percentage < 50) {
      warnings.push(`Low data-od-id coverage: only ${percentage}% of structural sections are tagged`);
    }

    let antiSlopResult: ReturnType<ArtifactValidator['validateAntiSlop']> | undefined;

    // 4. Target-specific structure checks
    if (target === 'poster') {
      if (!html.includes('poster-artboard') && !html.includes('data-od-id="poster-root"')) {
        warnings.push("Poster HTML is missing '.poster-artboard' container with data-od-id='poster-root'");
      }
      antiSlopResult = this.validateAntiSlop(html, css || '');
      if (antiSlopResult.slopDetected) {
        warnings.push(...antiSlopResult.violations);
      }
    } else if (target === 'carousel') {
      const slideMatches = html.match(/data-slide=["']\d+["']/g) || [];
      if (slideMatches.length < 3) {
        warnings.push(`Carousel HTML contains only ${slideMatches.length} slides; expected at least 3 slides`);
      }
    }

    // 5. CSS Sanity and Selector Coverage
    let selectorCoverage: SelectorCoverage | undefined;
    let hasVisualProperties: boolean | undefined;

    if (css && css.trim().length > 0) {
      const opens = (css.match(/\{/g) || []).length;
      const closes = (css.match(/\}/g) || []).length;
      if (opens !== closes) {
        errors.push(`CSS contains mismatched braces: ${opens} open vs ${closes} close`);
      }

      // Extract class names from HTML
      const classMatches = html.matchAll(/class=["']([^"']+)["']/g);
      const htmlClasses = new Set<string>();
      for (const m of classMatches) {
        m[1].split(/\s+/).forEach((c) => {
          const trimmed = c.trim();
          if (trimmed.length > 1 && !trimmed.startsWith('data-')) {
            htmlClasses.add(trimmed);
          }
        });
      }

      const totalClasses = htmlClasses.size;
      let coveredClasses = 0;
      const missingKeyClasses: string[] = [];

      for (const cls of htmlClasses) {
        const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\.${escaped}\\b`, 'm');
        if (pattern.test(css)) {
          coveredClasses++;
        } else {
          if (/hero|nav|btn|card|mockup|badge|footer|grid|container|header/i.test(cls)) {
            missingKeyClasses.push(cls);
          }
        }
      }

      const coverageRatio = totalClasses > 0 ? coveredClasses / totalClasses : 1.0;
      selectorCoverage = {
        totalClasses,
        coveredClasses,
        coverageRatio,
        missingKeyClasses
      };

      const hasBg = /background(-color)?:/i.test(css);
      const hasColor = /color:/i.test(css);
      const hasLayout = /display:\s*(flex|grid)/i.test(css);
      const hasSpacing = /padding|margin/i.test(css);
      hasVisualProperties = hasBg && hasColor && hasLayout && hasSpacing;

      if (totalClasses > 5 && coverageRatio < 0.25) {
        warnings.push(
          `Low CSS selector coverage (${Math.round(coverageRatio * 100)}%). Key unstyled classes: ${missingKeyClasses.slice(0, 5).join(', ')}`
        );
      }
    } else {
      errors.push("styles.css is missing or empty");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      odIdCoverage: {
        totalSections,
        taggedSections,
        percentage
      },
      selectorCoverage,
      hasVisualProperties,
      antiSlop: antiSlopResult
    };
  }

  /**
   * Evaluates compliance with the D8.7 Anti-AI-Slop Poster Generation Policy, Hallmark rules,
   * prohibited default template formula, and the Micro-UI / Fake-Chrome Elimination policy.
   */
  validateAntiSlop(html: string, css: string = '', options?: { imageIntent?: string; explicitImageRequested?: boolean; prompt?: string }): {
    slopDetected: boolean;
    violations: string[];
    warnings: string[];
    templateFormulaDetected: boolean;
    metrics: {
      microTextCount: number;
      pillCount: number;
      statusDotCount: number;
      headerRailDetected: boolean;
      footerRailDetected: boolean;
      fakeMetadataCount: number;
      nodeCardCount: number;
      graphContainerCount: number;
      defaultVueFlowClassUsage: boolean;
      monospaceDominant: boolean;
      displayMonospaceUsage: boolean;
      missingRequiredImage?: boolean;
    };
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // 0. Image Contract Check (Explicit user request or image_required MUST contain an <img> asset)
    let missingRequiredImage = false;
    if (options?.explicitImageRequested || options?.imageIntent === 'image_required') {
      const hasImgTag = /<img\b[^>]*\bsrc=["'][^"']+["']/i.test(html);
      if (!hasImgTag) {
        missingRequiredImage = true;
        violations.push(
          'Image contract violation: An image was explicitly requested or required for this subject, but the output contains no <img> elements. Style descriptors like "minimal" dictate layout and typography, not omitting the requested image.'
        );
      }
    }

    // 1. Dashboard card repetition check (Policy: avoid repeated rounded boxes)
    const cardMatches = (html.match(/\bclass=["'][^"']*\b(?:bento-card|feature-card|metric-card|ui-card)\b[^"']*["']/gi) || []).length;
    if (cardMatches > 2) {
      violations.push(`Dashboard card grid detected: found ${cardMatches} repeated card components (policy limits to <= 2)`);
    }

    // 2. Step workflow check
    if (/STEP\s*0[1-9]\b/i.test(html)) {
      violations.push('Dashboard workflow pipeline detected: found "STEP 01/02/03" labels which violate poster composition policy');
    }

    // 3. Status pills / badges proliferation (Hard Policy: default 0, max 1)
    const pillMatches = Array.from(html.matchAll(/\bclass=["'][^"']*\b(?:badge|pill|status-chip|tag-chip|pill-badge|status-badge)\b[^"']*["']/gi));
    let pillCount = pillMatches.length;
    // Also check for pills styled in CSS with extreme border-radius
    if (/border-radius:\s*(?:9999px|50px|100px|2rem)\b/i.test(css) && /display:\s*inline-(?:flex|block)\b/i.test(css)) {
      const inlinePillMatches = (html.match(/<span\b[^>]*>[\s\S]*?<\/span>/gi) || []).length;
      if (inlinePillMatches > pillCount) {
        pillCount = Math.max(pillCount, inlinePillMatches);
      }
    }
    // Specific check for decorative status pills
    if (/\b(?:ACTIVE LEADER|ACTIVE|LIVE|SYSTEM STATUS|SAFETY SYSTEM|ENGINE LAB)\b/i.test(html)) {
      pillCount = Math.max(pillCount, 1);
    }
    if (pillCount > 1) {
      violations.push(`Pill/chip violation: found ${pillCount} UI pills/chips (policy limits to <= 1). Posters are not UI dashboards.`);
    }

    // 4. Status indicator / Colored dot check (Hard Policy: 0 colored dots/LEDs)
    let statusDotCount = 0;
    const dotClassMatches = (html.match(/\bclass=["'][^"']*\b(?:status-dot|dot|led-indicator|indicator-dot|pulse-dot)\b[^"']*["']/gi) || []).length;
    statusDotCount += dotClassMatches;
    // Check for inline SVG dots or colored unicode dots
    if (/<circle\b[^>]*r=["'](?:[1-8])["'][^>]*fill=["'](?:#10b981|#ef4444|#f59e0b|#00f0ff|green|red|yellow|cyan|lime)["']/i.test(html)) {
      statusDotCount += 1;
    }
    if (/[•●]\s*(?:DRS|ACTIVE|ONLINE|TERM|LEADER|SYSTEM)/i.test(html)) {
      statusDotCount += 1;
    }
    // Check for CSS colored dot indicators
    if (/\.(?:status-dot|dot|indicator)\s*\{[^}]*border-radius:\s*50%/i.test(css) && /(?:background|color):\s*(?:#10b981|#ef4444|#f59e0b|green|red|yellow|lime)/i.test(css)) {
      if (statusDotCount === 0) statusDotCount += 1;
    }
    if (statusDotCount > 0) {
      violations.push(`Status indicator violation: found ${statusDotCount} fake colored status dots or LED indicators.`);
    }

    // 5. Micro-Text Policy: Default minimum designed text size is 22px
    let microTextCount = 0;
    const fontSizeMatches = Array.from(css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)(px|rem|em)\b/gi));
    for (const match of fontSizeMatches) {
      let sizePx = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'rem' || unit === 'em') {
        sizePx = sizePx * 16;
      }
      if (sizePx < 22) {
        // Exclude credit or legal selectors if specifically named
        const precedingCss = css.slice(Math.max(0, (match.index || 0) - 80), match.index || 0);
        if (!/(?:copyright|credit|legal|disclaimer)/i.test(precedingCss)) {
          microTextCount += 1;
        }
      }
    }
    // Inline styles font-size check
    const inlineFontMatches = Array.from(html.matchAll(/style=["'][^"']*font-size:\s*(\d+)px/gi));
    for (const match of inlineFontMatches) {
      if (parseFloat(match[1]) < 22) {
        microTextCount += 1;
      }
    }
    if (microTextCount > 2) {
      violations.push(`Micro-text violation: found ${microTextCount} elements styled below 22px minimum. Posters must communicate from a distance.`);
    }

    // 6. Header / Footer Template Rail Detection
    let headerRailDetected = false;
    let footerRailDetected = false;
    // Detect 3-part top rail (top-left, top-center, top-right metadata pattern)
    if (/<(?:header|div)\b[^>]*class=["'][^"']*\b(?:top-rail|header-rail|archival-header)\b[^"']*["']/i.test(html) ||
        (/ARCHIV\s*\d{4}/i.test(html) && /DESSAU/i.test(html) && /GROPIUS/i.test(html)) ||
        (!options?.prompt?.match(/porsche|gt3|motorsport/i) && /PORSCHE MOTORSPORT/i.test(html) && /9,000 RPM FLAT-SIX/i.test(html) && /911 GT3 RS/i.test(html))) {
      headerRailDetected = true;
      violations.push('Template rail violation: detected generic 3-part header metadata rail.');
    }
    // Detect 3-part bottom rail (bottom-left, bottom-center, bottom-right slogan/coords pattern)
    if (/<(?:footer|div)\b[^>]*class=["'][^"']*\b(?:bottom-rail|footer-rail)\b[^"']*["']/i.test(html) ||
        (/LAT\.\s*\d+°/i.test(html) && /LONG\.\s*\d+°/i.test(html) && /GESAMTKUNSTWERK/i.test(html))) {
      footerRailDetected = true;
      violations.push('Template rail violation: detected generic 3-part footer metadata rail.');
    }

    // 7. Fake Metadata & Technical UI Slop Detection
    let fakeMetadataCount = 0;
    const fakeMetadataRegex = /\b(?:TERM\s*0?[1-9]\b|ACTIVE\s+LEADER\b|NODE_0[1-9]\b|SYSTEM\s+STATUS\b|ARCHIV\s*\d{4}\b|VOL\.\s*\d+\b|SERIES\s*\d+\b|LAT\.\s*\d+°|STATE\s+MACHINE\s+LINEARIZABILITY\b|RFC-[A-Z]+-\d+\b)/gi;
    const fakeMatches = Array.from(html.matchAll(fakeMetadataRegex));
    if (fakeMatches.length > 0) {
      fakeMetadataCount = fakeMatches.length;
      const samples = Array.from(new Set(fakeMatches.map((m) => m[0]))).join(', ');
      violations.push(`Fake metadata / technical UI slop detected: found [${samples}]. Do not invent artificial system states, archival rails, or fake telemetry.`);
    }

    // 8. Hallmark Roman Display Rule: Display headings must have strong roman presence (no fully italicized headings)
    const fullItalicHeaderMatch = html.match(/<h[1-3][^>]*>\s*<em\b[^>]*>([\s\S]*?)<\/em>\s*<\/h[1-3]>/i);
    if (fullItalicHeaderMatch) {
      violations.push('Hallmark Typography violation: heading is entirely wrapped in <em> italic emphasis. Display headings must be anchored with strong roman typography.');
    }

    // 9. Prohibited Default Template Formula Check
    const hasFullBleedImg = /class=["'][^"']*\b(?:poster-bleed-image|img-ambient)\b[^"']*["']/i.test(html) ||
      (css.includes('position: absolute') && css.includes('object-fit: cover') && /inset:\s*0/i.test(css));
    const hasSpecStrip = /class=["'][^"']*\b(?:specs-strip|specs-grid|telemetry-specs|spec-bar|poster-specs)\b[^"']*["']/i.test(html) ||
      (css.includes('repeat(4, 1fr)') && /class=["'][^"']*\b(?:spec|stat)\b/i.test(html));
    
    // Composite check for explanatory marketing prose
    const pTagMatches = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi));
    let hasExplanatoryProse = false;
    for (const match of pTagMatches) {
      const pText = match[1].replace(/<[^>]+>/g, '').trim();
      const words = pText.split(/\s+/).filter(Boolean);
      const sentences = pText.split(/[.!?]+/).filter(Boolean);
      const hasCliche = /\b(?:at the intersection of|where performance meets|the defining|engineered for those|redefining|unlock the)\b/i.test(pText);
      if (words.length > 35 && sentences.length >= 2) {
        hasExplanatoryProse = true;
        if (hasCliche) {
          warnings.push(`Generic marketing prose detected (${words.length} words): "${pText.slice(0, 60)}..."`);
        }
      }
    }

    const hasDualTitle = /<h1\b[^>]*>[\s\S]*?<span\b[^>]*>[\s\S]*?<\/span>[\s\S]*?<\/h1>/i.test(html) ||
      (/<h1\b/i.test(html) && /<h2\b/i.test(html));

    let templateFormulaDetected = false;
    if (hasFullBleedImg && hasSpecStrip && hasExplanatoryProse && hasDualTitle) {
      templateFormulaDetected = true;
      violations.push('Prohibited default template formula detected: combines Big Title + Accent Title + Marketing Paragraph + Darkened Full-Bleed Image + 4-Column Spec Strip. Each poster must independently determine its composition.');
    }

    // 10. Anti-Mindmap Gate: Repeated Node Cards & Structural Repetition
    const explicitNodeCards = Array.from(html.matchAll(/\bclass=["'][^"']*\b(?:state-node|consensus-node|node-card|flow-node|diagram-node|node-box)\b[^"']*["']/gi)).length;
    let nodeCardCount = explicitNodeCards;

    const hasSvgConnectors = /<svg\b[^>]*>[\s\S]*?(?:<path|<line|<polyline)[\s\S]*?<\/svg>/i.test(html);
    if (hasSvgConnectors) {
      const childDivMatches = Array.from(html.matchAll(/<div\b[^>]*class=["']([^"']+)["'][^>]*>/gi));
      const classFreq: Record<string, number> = {};
      for (const m of childDivMatches) {
        const cls = m[1].trim();
        if (
          /\b(?:mindmap-node|graph-node|flow-node|state-node|diagram-node|card-node|node-card|node-box)\b/i.test(cls) ||
          (/\b(?:node|box)\b/i.test(cls) && !/\b(?:keyframe|timeline|audio|media|video|frame|track)\b/i.test(cls))
        ) {
          classFreq[cls] = (classFreq[cls] || 0) + 1;
        }
      }
      for (const count of Object.values(classFreq)) {
        if (count >= 3 && nodeCardCount === 0) {
          nodeCardCount = count;
        }
      }
    }

    if (nodeCardCount > 2) {
      violations.push(`Mind-map slop detected: found ${nodeCardCount} repeated node cards. Technical posters must not use generic box-and-arrow mind maps.`);
    }

    // 11. Generic Diagram Panel Wrapper Gate
    const graphContainerMatches = (html.match(/\bclass=["'][^"']*\b(?:diagram-container|hero-diagram-container|diagram-canvas|graph-panel)\b[^"']*["']/gi) || []).length;
    const graphContainerCount = graphContainerMatches;
    if (graphContainerCount > 0) {
      violations.push('Diagram panel violation: diagrams must integrate directly into the 3:4 canvas, not sit inside an enclosed dark rounded panel.');
    }

    // 12. Default Vue Flow Styling Gate
    const defaultVueFlowClassUsage = /\b(?:vue-flow__node-default|vue-flow__handle|vue-flow__controls|vue-flow__minimap|vue-flow__edge-path)\b/i.test(html) ||
      /\b(?:vue-flow__node-default|vue-flow__handle|vue-flow__controls|vue-flow__minimap)\b/i.test(css);
    if (defaultVueFlowClassUsage) {
      violations.push('Default Vue Flow styling detected: Vue Flow must use custom node and edge rendering, not default flowchart widgets.');
    }

    // 13. Monospace Dominance Gate: Technical Subject != Monospace Display!
    let displayMonospaceUsage = false;
    let monospaceDominant = false;

    const headingFontMatches = Array.from(css.matchAll(/(?:h[1-2]|\.poster-headline|\.poster-title)[^{]*\{[^}]*font-family:\s*([^;]+);/gi));
    for (const hMatch of headingFontMatches) {
      if (/\b(?:JetBrains Mono|Fira Code|Courier|monospace|Space Mono)\b/i.test(hMatch[1])) {
        displayMonospaceUsage = true;
      }
    }

    const allFontDeclarations = Array.from(css.matchAll(/font-family:\s*([^;]+);/gi));
    if (allFontDeclarations.length > 0) {
      const monoCount = allFontDeclarations.filter((f) => /\b(?:JetBrains Mono|Fira Code|Courier|monospace|Space Mono)\b/i.test(f[1])).length;
      const monoRatio = monoCount / allFontDeclarations.length;
      if (monoRatio > 0.35 && !/<(?:pre|code)\b/i.test(html)) {
        monospaceDominant = true;
      }
    }

    if (displayMonospaceUsage) {
      violations.push('Monospace display violation: technical subjects must not default to monospace headings. Use high-impact display sans, grotesque, or editorial typography.');
    } else if (monospaceDominant) {
      violations.push('Monospace dominance violation: poster typography is dominated by monospace without explicit code syntax.');
    }

    // 14. Directional Dark Scrim Contrast Verification
    let missingDirectionalScrim = false;
    const hasBleedPhoto = /class=["'][^"']*(?:poster-bleed-image|hero-bleed|bg-image)[^"']*["']/i.test(html) ||
      (/hero-image-container/i.test(html) && /<img\b/i.test(html));
    const hasTextOverlay = /<h[1-3]\b/i.test(html) || /class=["'][^"']*(?:poster-headline|headline|content-stack|hero-content)\b[^"']*["']/i.test(html);
    if (hasBleedPhoto && hasTextOverlay) {
      const hasScrimElement = /class=["'][^"']*(?:poster-scrim|image-scrim|scrim-overlay|vignette-scrim)\b[^"']*["']/i.test(html);
      const hasScrimCss = /(?:scrim|vignette|linear-gradient\([^)]*rgba\(\s*0\s*,\s*0\s*,\s*0)/i.test(css);
      if (!hasScrimElement && !hasScrimCss) {
        missingDirectionalScrim = true;
        violations.push('Directional scrim violation: Full-bleed image contains text overlay without a dark gradient scrim/vignette. Text contrast is compromised.');
      }
    }

    return {
      slopDetected: violations.length > 0,
      violations,
      warnings,
      templateFormulaDetected,
      metrics: {
        microTextCount,
        pillCount,
        statusDotCount,
        headerRailDetected,
        footerRailDetected,
        fakeMetadataCount,
        nodeCardCount,
        graphContainerCount,
        defaultVueFlowClassUsage,
        monospaceDominant,
        displayMonospaceUsage,
        missingRequiredImage,
        missingDirectionalScrim
      }
    };
  }

  /**
   * Integer-safe validation for strict 3:4 poster ratio: width * 4 === height * 3
   */
  validatePosterDimensions(width: number, height: number): { valid: boolean; error?: string } {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return { valid: false, error: `Dimensions must be positive integers: received ${width}x${height}` };
    }

    // Integer-safe ratio check: width / height === 3 / 4 <=> width * 4 === height * 3
    if (width * 4 !== height * 3) {
      return {
        valid: false,
        error: `Poster format must be strictly 3:4. Canonical target is 1080x1440. Received ${width}x${height} (ratio ${(width / height).toFixed(3)}).`
      };
    }

    return { valid: true };
  }
}
