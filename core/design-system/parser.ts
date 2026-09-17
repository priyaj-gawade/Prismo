import fs from 'node:fs';

export interface DesignSystemSpec {
  name: string;
  description: string;
  colors: Record<string, string>;
  typography: {
    fontFamilySans: string;
    fontFamilySerif?: string;
    headings: string;
    body: string;
  };
  spacing: Record<string, string>;
  rules: string[];
  rawMarkdown: string;
}

export class DesignSystemParser {
  parse(markdown: string): DesignSystemSpec {
    const lines = markdown.split('\n');
    let name = 'Custom Design System';
    let description = '';
    const colors: Record<string, string> = {};
    const typography = {
      fontFamilySans: "'Inter', system-ui, sans-serif",
      fontFamilySerif: undefined as string | undefined,
      headings: 'font-weight: 700; letter-spacing: -0.02em;',
      body: 'font-weight: 400; line-height: 1.6;'
    };
    const spacing: Record<string, string> = {
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    };
    const rules: string[] = [];

    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('# ')) {
        name = line.replace(/^#\s+/, '').trim();
      } else if (line.startsWith('## ')) {
        currentSection = line.replace(/^##\s+/, '').toLowerCase();
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s+/, '').trim();
        if (currentSection.includes('color') || currentSection.includes('palette')) {
          const match = item.match(/^([^:]+):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl\([^)]+\))/);
          if (match) {
            colors[match[1].trim().toLowerCase()] = match[2].trim();
          }
        } else if (currentSection.includes('rule') || currentSection.includes('constraint')) {
          rules.push(item);
        }
      } else if (line.includes(':') && (currentSection.includes('color') || currentSection.includes('palette'))) {
        const [k, v] = line.split(':');
        if (k && v && v.trim().startsWith('#')) {
          colors[k.trim().toLowerCase()] = v.trim();
        }
      } else if (line.includes(':') && currentSection.includes('typography')) {
        const lower = line.toLowerCase();
        if (lower.includes('font family') || lower.includes('sans')) {
          typography.fontFamilySans = line.split(':')[1]?.trim() || typography.fontFamilySans;
        } else if (lower.includes('serif')) {
          typography.fontFamilySerif = line.split(':')[1]?.trim();
        }
      }
    }

    return {
      name,
      description,
      colors,
      typography,
      spacing,
      rules,
      rawMarkdown: markdown
    };
  }

  serialize(spec: DesignSystemSpec): string {
    const colorLines = Object.entries(spec.colors)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const ruleLines = spec.rules.length > 0
      ? spec.rules.map((r) => `- ${r}`).join('\n')
      : '- Maintain high-contrast accessible visual hierarchy\n- Ensure mobile-first responsive scaling';

    return `# ${spec.name}

${spec.description || 'Design System Specification for high-conversion web experiences.'}

## Color Palette
${colorLines || '- primary: #2563EB\n- background: #FFFFFF\n- text: #0F172A'}

## Typography
- Sans Font: ${spec.typography.fontFamilySans}
${spec.typography.fontFamilySerif ? `- Serif Font: ${spec.typography.fontFamilySerif}` : ''}
- Headings: ${spec.typography.headings}
- Body: ${spec.typography.body}

## Spacing Rules
- Small: ${spec.spacing.sm || '8px'}
- Medium: ${spec.spacing.md || '16px'}
- Large: ${spec.spacing.lg || '24px'}
- Extra Large: ${spec.spacing.xl || '32px'}

## Design Rules & Constraints
${ruleLines}
`;
  }
}
