import type { DesignSystemSpec } from './parser.ts';

export class TokenGenerator {
  generateCss(spec: DesignSystemSpec): string {
    const lines: string[] = [
      '/* Auto-generated Design Tokens */',
      ':root {'
    ];

    // Colors
    lines.push('  /* Color Palette */');
    for (const [name, value] of Object.entries(spec.colors)) {
      const varName = name.startsWith('color-') ? name : `color-${name}`;
      lines.push(`  --${varName}: ${value};`);
    }

    // Typography
    lines.push('  /* Typography */');
    lines.push(`  --font-sans: ${spec.typography.fontFamilySans};`);
    if (spec.typography.fontFamilySerif) {
      lines.push(`  --font-serif: ${spec.typography.fontFamilySerif};`);
    }

    // Spacing
    lines.push('  /* Spacing */');
    for (const [name, value] of Object.entries(spec.spacing)) {
      const varName = name.startsWith('space-') ? name : `space-${name}`;
      lines.push(`  --${varName}: ${value};`);
    }

    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  validateTokens(css: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!css.includes(':root')) {
      errors.push("Missing ':root' declaration");
    }
    if (!css.includes('--color-')) {
      errors.push("No '--color-*' tokens found");
    }
    if (!css.includes('--font-')) {
      errors.push("No '--font-*' tokens found");
    }

    // Simple unclosed brace check
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    if (opens !== closes) {
      errors.push(`Mismatched braces in CSS tokens: ${opens} open vs ${closes} close`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
