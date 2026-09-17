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

    // 4. Target-specific structure checks
    if (target === 'poster') {
      if (!html.includes('poster-artboard') && !html.includes('data-od-id="poster-root"')) {
        warnings.push("Poster HTML is missing '.poster-artboard' container with data-od-id='poster-root'");
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
      hasVisualProperties
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
