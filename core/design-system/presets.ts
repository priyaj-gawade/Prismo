import type { DesignSystemSpec } from './parser.ts';

export const DESIGN_PRESETS: Record<string, DesignSystemSpec> = {
  'modern-bright-white': {
    name: 'Modern Bright White',
    description: 'Crisp, high-contrast white and light slate aesthetic with electric blue accents and 3D depth.',
    colors: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      surface_raised: '#FFFFFF',
      primary: '#2563EB',
      primary_hover: '#1D4ED8',
      accent: '#06B6D4',
      text: '#0F172A',
      text_muted: '#64748B',
      border: '#E2E8F0'
    },
    typography: {
      fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontFamilyMono: "'Fira Code', 'JetBrains Mono', monospace",
      headings: 'font-weight: 700; letter-spacing: -0.025em; color: #0F172A;',
      body: 'font-weight: 400; line-height: 1.6; color: #334155;'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '64px'
    },
    rules: [
      'Maintain crisp, high-contrast white and light slate surfaces (#FFFFFF, #F8FAFC)',
      'Never use dark or muddy backgrounds; rely on generous whitespace and subtle borders',
      'Primary buttons use Electric Royal Blue (#2563EB) with clean white text',
      'For 3D elements, use CSS 3D perspective, elevated card shadows, and subtle gradients (Blue/Cyan)',
      'Use Lucide vector icons exclusively; never use emojis'
    ],
    rawMarkdown: ''
  },

  'modern-dark': {
    name: 'Modern Dark Tech',
    description: 'Sleek, high-contrast dark slate theme designed for modern SaaS and developer tools.',
    colors: {
      background: '#0B0F17',
      surface: '#131B2E',
      surface_raised: '#1E293B',
      primary: '#3B82F6',
      primary_hover: '#2563EB',
      accent: '#10B981',
      text: '#F8FAFC',
      text_muted: '#94A3B8',
      border: '#1E293B'
    },
    typography: {
      fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      headings: 'font-weight: 700; letter-spacing: -0.025em; color: #F8FAFC;',
      body: 'font-weight: 400; line-height: 1.6; color: #94A3B8;'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '64px'
    },
    rules: [
      'Maintain deep dark contrast; never use light backgrounds',
      'Use subtle 1px border glows (--border: #1E293B)',
      'Primary buttons use vibrant Electric Blue with high contrast white text',
      'All cards have subtle glass or surface elevation with border-radius: 12px',
      'Use Lucide vector icons exclusively; never use emojis'
    ],
    rawMarkdown: ''
  },

  'minimalist-saas': {
    name: 'Minimalist Clean SaaS',
    description: 'Crisp, accessible modern light theme with razor-sharp layout hierarchy.',
    colors: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      surface_raised: '#FFFFFF',
      primary: '#2563EB',
      primary_hover: '#1D4ED8',
      accent: '#06B6D4',
      text: '#0F172A',
      text_muted: '#64748B',
      border: '#E2E8F0'
    },
    typography: {
      fontFamilySans: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      headings: 'font-weight: 600; letter-spacing: -0.02em; color: #0F172A;',
      body: 'font-weight: 400; line-height: 1.6; color: #334155;'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '64px'
    },
    rules: [
      'Keep backgrounds crisp and clean with generous white space',
      'Use subtle gray borders (#E2E8F0) and soft box shadows',
      'Primary action buttons use Royal Blue (#2563EB)',
      'Clean readable typography with Outfit font family',
      'Use Lucide vector icons exclusively; never use emojis'
    ],
    rawMarkdown: ''
  },

  'maximalist-cyber-3d': {
    name: 'Maximalist Cybernetic 3D',
    description: 'High-density, visual-first futuristic dark aesthetic with Three.js WebGL particle mesh, tactile skeuomorphic glass, HUD telemetry, neon cyber accents, and massive typography.',
    colors: {
      background: '#060608',
      surface: '#0D0E12',
      surface_raised: '#15171E',
      primary: '#00F0FF',
      primary_hover: '#00C4D6',
      accent: '#C8FF00',
      text: '#F0F4F8',
      text_muted: '#7E8B9B',
      border: 'rgba(255, 255, 255, 0.08)'
    },
    typography: {
      fontFamilySans: "'Space Grotesk', 'Syne', 'Inter', system-ui, sans-serif",
      fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",
      headings: "font-family: 'Syne', 'Space Grotesk', sans-serif; font-weight: 800; letter-spacing: -0.03em; color: #F0F4F8;",
      body: "font-family: 'Space Grotesk', sans-serif; font-weight: 400; line-height: 1.6; color: #94A3B8;"
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '36px',
      xxl: '72px'
    },
    rules: [
      'Maximalist visual density: integrate full 3D WebGL particle canvas background (Three.js), tactile command center panels, and dense technical HUD telemetry.',
      'Use high-impact glowing borders (box-shadow: 0 0 20px rgba(0, 240, 255, 0.25)) and tactile glass elevation.',
      'Incorporate live interactive code sandboxes with syntax highlighting, JVM/system gauges, and interactive 3D perspective cards.',
      'Use Lucide vector icons exclusively; never use emojis.'
    ],
    rawMarkdown: ''
  },

  'editorial-luxury': {
    name: 'Editorial Luxury',
    description: 'Refined, sophisticated aesthetic combining editorial typography and warm tones.',
    colors: {
      background: '#FAF8F5',
      surface: '#F3EFEA',
      surface_raised: '#FFFFFF',
      primary: '#18181B',
      primary_hover: '#27272A',
      accent: '#D97706',
      text: '#18181B',
      text_muted: '#71717A',
      border: '#E4DFD7'
    },
    typography: {
      fontFamilySans: "'Inter', sans-serif",
      fontFamilySerif: "'Playfair Display', Georgia, serif",
      headings: "font-family: var(--font-serif); font-weight: 600; letter-spacing: -0.01em; color: #18181B;",
      body: "font-family: var(--font-sans); font-weight: 400; line-height: 1.7; color: #3F3F46;"
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '40px',
      xxl: '80px'
    },
    rules: [
      'Warm off-white background (#FAF8F5)',
      'Elegant serif typography for major headlines (Playfair Display)',
      'Accent details in muted amber/gold (#D97706)',
      'Ample vertical whitespace and editorial margin rhythm',
      'Use Lucide vector icons exclusively; never use emojis'
    ],
    rawMarkdown: ''
  }
};

export function getPreset(name: string): DesignSystemSpec | null {
  return DESIGN_PRESETS[name] || null;
}

export function detectDynamicPreset(prompt: string): DesignSystemSpec | null {
  const p = prompt.toLowerCase();

  // 1. Amber / Gold + Dark Navy / Charcoal / Pearl
  if (p.includes('amber') || (p.includes('gold') && (p.includes('navy') || p.includes('charcoal') || p.includes('pearl') || p.includes('ivory')))) {
    return {
      name: 'Amber & Charcoal Prestige',
      description: 'Lustrous amber and warm champagne highlights on deep charcoal and midnight slate background.',
      colors: {
        background: '#090B10',
        surface: '#121620',
        surface_raised: '#1B2130',
        primary: '#F59E0B',
        primary_hover: '#D97706',
        accent: '#FDE68A',
        text: '#F8FAFC',
        text_muted: '#94A3B8',
        border: 'rgba(245, 158, 11, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontFamilyMono: "'JetBrains Mono', monospace",
        headings: 'font-weight: 800; letter-spacing: -0.025em; color: #F8FAFC;',
        body: 'font-weight: 400; line-height: 1.6; color: #94A3B8;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Use deep midnight charcoal background (#090B10) with luminous amber gold accents (#F59E0B)',
        'Cards use dark glass elevation with subtle amber border glow',
        'Main headlines use bold display typography with warm amber gradient',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 2. Cyan / Electric Blue + Midnight + Titanium
  if ((p.includes('cyan') || p.includes('electric blue')) && (p.includes('midnight') || p.includes('titanium') || p.includes('dark') || p.includes('black') || p.includes('slate'))) {
    return {
      name: 'Cyan & Midnight Titanium',
      description: 'Futuristic electric cyan and icy aqua accents over deep abyss slate and titanium surface tiers.',
      colors: {
        background: '#040810',
        surface: '#0B1322',
        surface_raised: '#132038',
        primary: '#06B6D4',
        primary_hover: '#0891B2',
        accent: '#38BDF8',
        text: '#F8FAFC',
        text_muted: '#94A3B8',
        border: 'rgba(6, 182, 212, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontFamilyMono: "'JetBrains Mono', monospace",
        headings: 'font-weight: 800; letter-spacing: -0.025em; color: #F8FAFC;',
        body: 'font-weight: 400; line-height: 1.6; color: #94A3B8;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Deep abyss midnight background (#040810) with brilliant cyan highlights (#06B6D4)',
        'Cards use high-contrast dark titanium surfaces with subtle cyan edge glows',
        'Main headlines feature ice-cyan gradients and clean titanium white type',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 3. Yellow + Black / White (e.g. Jellyfish, Cyberpunk Amber, Warning, Science)
  if (p.includes('yellow') && (p.includes('black') || p.includes('white') || p.includes('dark'))) {
    return {
      name: 'Luminous Yellow Void',
      description: 'High-contrast black/charcoal background with radiant canary yellow highlights and clean white typography.',
      colors: {
        background: '#07080A',
        surface: '#121318',
        surface_raised: '#1C1D24',
        primary: '#FACC15',
        primary_hover: '#EAB308',
        accent: '#FFFFFF',
        text: '#F8FAFC',
        text_muted: '#9CA3AF',
        border: 'rgba(250, 204, 21, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontFamilyMono: "'JetBrains Mono', monospace",
        headings: 'font-weight: 800; letter-spacing: -0.025em; color: #F8FAFC;',
        body: 'font-weight: 400; line-height: 1.6; color: #9CA3AF;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Use deep black background (#07080A) with luminous canary yellow accents (#FACC15)',
        'Cards use dark glassmorphism with subtle yellow border highlights',
        'Main headlines use bold display typography with yellow gradients or solid white',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 4. Emerald + Gold / Obsidian / Green
  if ((p.includes('emerald') || p.includes('green') || p.includes('forest')) && (p.includes('gold') || p.includes('obsidian') || p.includes('dark') || p.includes('black') || p.includes('copper'))) {
    return {
      name: 'Emerald & Gold Luxury',
      description: 'Sophisticated deep forest green and onyx palette with radiant emerald and warm gold accents.',
      colors: {
        background: '#05100B',
        surface: '#0B1F16',
        surface_raised: '#133023',
        primary: '#10B981',
        primary_hover: '#059669',
        accent: '#F59E0B',
        text: '#F8FAFC',
        text_muted: '#A7F3D0',
        border: 'rgba(16, 185, 129, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', sans-serif",
        headings: 'font-weight: 700; color: #F8FAFC;',
        body: 'font-weight: 400; color: #A7F3D0;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Deep forest dark background with glowing emerald accents',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 5. Deep Teal + Bronze / Ivory
  if (p.includes('teal') && (p.includes('bronze') || p.includes('ivory') || p.includes('dark') || p.includes('black') || p.includes('sand'))) {
    return {
      name: 'Deep Teal & Bronze',
      description: 'Oceanic dark teal foundation with warm burnished bronze and clean ivory typography.',
      colors: {
        background: '#041014',
        surface: '#0A1D24',
        surface_raised: '#102B36',
        primary: '#14B8A6',
        primary_hover: '#0D9488',
        accent: '#D97706',
        text: '#F8FAFC',
        text_muted: '#99F6E4',
        border: 'rgba(20, 184, 166, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', sans-serif",
        headings: 'font-weight: 700; color: #F8FAFC;',
        body: 'font-weight: 400; color: #99F6E4;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Deep oceanic dark teal background with radiant teal accents and bronze highlights',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 6. Crimson / Scarlet + Charcoal + Gold
  if ((p.includes('crimson') || p.includes('red') || p.includes('scarlet')) && (p.includes('black') || p.includes('dark') || p.includes('charcoal') || p.includes('gold'))) {
    return {
      name: 'Crimson Void',
      description: 'High-intensity dark palette with vivid crimson and fiery orange/gold accents.',
      colors: {
        background: '#0A0607',
        surface: '#180D10',
        surface_raised: '#261419',
        primary: '#EF4444',
        primary_hover: '#DC2626',
        accent: '#F59E0B',
        text: '#F8FAFC',
        text_muted: '#9CA3AF',
        border: 'rgba(239, 68, 68, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', sans-serif",
        headings: 'font-weight: 800; color: #F8FAFC;',
        body: 'font-weight: 400; color: #9CA3AF;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Dark noir background with sharp crimson accents',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 7. Cobalt Blue + Neon Lime + Carbon Black
  if (p.includes('cobalt') || (p.includes('blue') && (p.includes('lime') || p.includes('carbon') || p.includes('neon')))) {
    return {
      name: 'Cobalt & Neon Lime Precision',
      description: 'High-octane cobalt blue and electric lime highlights against deep carbon black.',
      colors: {
        background: '#05070D',
        surface: '#0B1120',
        surface_raised: '#131D36',
        primary: '#3B82F6',
        primary_hover: '#2563EB',
        accent: '#84CC16',
        text: '#F8FAFC',
        text_muted: '#94A3B8',
        border: 'rgba(59, 130, 246, 0.25)'
      },
      typography: {
        fontFamilySans: "'Inter', sans-serif",
        fontFamilyMono: "'JetBrains Mono', monospace",
        headings: 'font-weight: 800; color: #F8FAFC;',
        body: 'font-weight: 400; color: #94A3B8;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Carbon dark background with sharp cobalt blue and electric lime accents',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 8. Terracotta / Copper + Warm Cream + Slate
  if (p.includes('terracotta') || (p.includes('copper') && (p.includes('cream') || p.includes('slate') || p.includes('warm')))) {
    return {
      name: 'Terracotta & Warm Cream',
      description: 'Warm, earthy terracotta and copper tones against rich charcoal slate surfaces.',
      colors: {
        background: '#0F0E0D',
        surface: '#1C1A17',
        surface_raised: '#2B2723',
        primary: '#E07A5F',
        primary_hover: '#D06043',
        accent: '#F4F1DE',
        text: '#F8FAFC',
        text_muted: '#D5BDAF',
        border: 'rgba(224, 122, 95, 0.25)'
      },
      typography: {
        fontFamilySans: "'Outfit', 'Inter', sans-serif",
        headings: 'font-weight: 700; color: #F8FAFC;',
        body: 'font-weight: 400; color: #D5BDAF;'
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      rules: [
        'Earthy slate background with warm copper/terracotta accents and cream typography',
        'Use Lucide vector icons exclusively; never use emojis'
      ],
      rawMarkdown: ''
    };
  }

  // 9. Bright White / Light Theme
  if (['bright', 'white', 'light', 'clean', 'day'].some((k) => p.includes(k)) && !p.includes('dark') && !p.includes('black')) {
    return DESIGN_PRESETS['modern-bright-white'];
  }

  // 10. 3D Maximalist Cyber
  if (['3d', 'maximalism', 'maximalist', 'cyber', 'futuristic'].some((k) => p.includes(k))) {
    return DESIGN_PRESETS['maximalist-cyber-3d'];
  }

  // Default to null (preserves project's default preset)
  return null;
}
