import type { SkillDefinition } from '../skills/types.ts';

export interface PromptComposerInput {
  baseInstructions?: string;
  persistentMemory?: string;
  userInstructions?: string;
  projectInstructions?: string;
  designMd?: string;
  tokensCss?: string;
  componentManifest?: string;
  templateGroundedContext?: string;
  universalRules?: string[];
  skill?: SkillDefinition | null;
  workspaceFiles?: Array<{ path: string; size: number }>;
  retrievedContext?: string;
  userPrompt: string;
  refinementSectionId?: string;
}

export interface ComposedPromptResult {
  systemInstruction: string;
  userMessage: string;
  layerDiagnostic: Array<{ layer: number; name: string; included: boolean; sizeBytes: number }>;
}

export class PromptComposer {
  compose(input: PromptComposerInput): ComposedPromptResult {
    const systemSections: string[] = [];
    const layerDiagnostic: Array<{ layer: number; name: string; included: boolean; sizeBytes: number }> = [];

    // Helper to track layers
    const addLayer = (layerNum: number, name: string, content: string | undefined, headerTitle?: string) => {
      const trimmed = (content || '').trim();
      if (trimmed.length > 0) {
        const fullBlock = headerTitle ? `## Layer ${layerNum}: ${headerTitle}\n${trimmed}` : trimmed;
        systemSections.push(fullBlock);
        layerDiagnostic.push({ layer: layerNum, name, included: true, sizeBytes: Buffer.byteLength(fullBlock) });
      } else {
        layerDiagnostic.push({ layer: layerNum, name, included: false, sizeBytes: 0 });
      }
    };

    // Layer 1: Core Base Instructions
    const defaultBase = `You are Prismo, the Standalone 3:4 Social Poster & Visual Design Engine.
Your mission is to produce stunning, state-of-the-art, high-density 3:4 aspect ratio posters (1080px x 1440px) with rich Bento grids, bespoke geometric SVGs, Lucide vector icons, and dynamic visual layouts.

CRITICAL FORMAT RULES:
You MUST output ALL of the following distinct markdown code blocks:
1. \`\`\`html:index.html
(Complete HTML5 document with doctype, head, meta viewport, stylesheet links to tokens.css and styles.css, semantic body sections, Lucide icons, and data-od-id attributes on every visible component)
\`\`\`

2. \`\`\`css:styles.css
(Complete, robust CSS stylesheet containing full visual rules for EVERY class used in index.html, defining layout, flex/grid, colors, typography, spacing, glassmorphism, shadows, responsive media queries, and interactions)
\`\`\`

3. \`\`\`javascript:script.js
(Interactive JavaScript including Three.js 3D background WebGL animation if requested, card tilt effects, tab switching, and lucide.createIcons() initialization)
\`\`\`

NEVER omit styles.css. NEVER output unstyled HTML. Every class declared in HTML MUST be fully styled in styles.css.

DYNAMIC VISUAL ARCHETYPES (CHOOSE BASED ON PROMPT INTENT):
Adapt the layout structure dynamically according to the topic:
- 🏗️ ARCHITECTURE & EXECUTION PIPELINES (Frameworks, APIs, Code, Workflows):
  Create horizontal flow containers with step nodes (e.g. STEP 01 -> STEP 02 -> STEP 03), connector arrows, runtime badges, and code syntax cards.
- 🍱 ASYMMETRIC BENTO GRIDS (Complex features, multi-concept topics):
  Use a 12-column CSS grid combining 1 large focal card (span-12 or span-8) with 2-3 compact feature/metric cards (span-6 or span-4).
- 📊 METRIC & STAT INFOGRAPHICS (Numbers, benchmarks, research):
  Feature large bold KPI numbers (48px–64px), progress gauges, and stat callouts.
- ⚖️ COMPARISON MATRICES (Left vs Right, Before vs After, Pro vs Con):
  Split dual-column structured cards with highlight tags.
- 📜 EDITORIAL FEATURE DECKS (Narratives, guides, facts):
  High-impact feature cards with custom accent borders, glassmorphism, and Lucide icons.

3D WEBGL & MAXIMALIST VISUAL RULES:
- When 3D, WebGL, or maximalism is requested: include <canvas id="bg-canvas" class="fixed inset-0 pointer-events-none -z-10 w-full h-full"></canvas> in index.html and include Three.js CDN (<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>).
- In styles.css, use rich tactile glassmorphism (backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.8);), neon glow accents, and HUD telemetry styling.

ANTI-AI-SLOP & PALETTE DISCIPLINE:
- NEVER default to generic purple/violet backgrounds or AI-cliché purple-blue gradients.
- NO FAKE METADATA: Do NOT generate fake edition pills (e.g. "ARCHIVAL EDITION N°"), fake founding dates ("EST. 1974"), or footer specs ("1080x1440 ARTBOARD").
- Use curated, brand-appropriate palettes: crisp white with electric royal blue (#2563EB), slate with cyan/emerald, high-contrast dark slate (#050811) with neon cyan (#00F0FF) & acid lime (#C8FF00), or bespoke brand accents.

PROFESSIONAL ICONS (NO EMOJIS):
- NEVER use raw Unicode emojis (e.g. 🚀, 💡, 🔥, ✨, 📱, ⚙️, 💻) for UI icons, badges, bullet points, or buttons.
- ALWAYS use professional vector icons: Lucide icons via \`<i data-lucide="..."></i>\` (include \`<script src="https://unpkg.com/lucide@latest"></script>\` in <head>) or inline SVGs.`;
    addLayer(1, 'Core Base Instructions', input.baseInstructions || defaultBase, 'Core Base Instructions');

    // Layer 2: Persistent Memory
    addLayer(2, 'Persistent Memory', input.persistentMemory, 'User & Aesthetic Memory');

    // Layer 3: User Instructions
    addLayer(3, 'User Instructions', input.userInstructions, 'Global User Directives');

    // Layer 4: Project Instructions
    //addLayer(4, 'Project Instructions', input.projectInstructions, 'Project Specification');

    // Layer 5: Active DESIGN.md
    addLayer(5, 'Active DESIGN.md', input.designMd, 'Design System Specification');

    // Layer 6: Design Tokens
    addLayer(6, 'Design Tokens', input.tokensCss, 'CSS Variables (tokens.css)');

    // Layer 7: Component Manifest
    const defaultManifest = `Standard UI Utilities & Layout:
- Grid: .container (max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;)
- Flex helpers: .flex-center, .flex-between, .flex-col
- Buttons: .btn, .btn-primary, .btn-secondary, .btn-outline
- Cards: .card, .glass-card, .metric-card`;
    addLayer(7, 'Component Manifest', input.componentManifest || defaultManifest, 'Component Manifest & Patterns');

    // Layer 8: Universal Craft Rules
    const defaultCraftRules = [
      'Every major block, section, container, and actionable element MUST have a unique `data-od-id="..."` attribute (e.g. data-od-id="hero-cta-btn").',
      'Never omit data-od-id attributes; they provide stable element identity for surgical section updates.',
      'ANTI-PURPLE RULE: Never use generic purple or violet backgrounds/gradients unless explicitly requested by the user.',
      'NO RAW EMOJIS: Never use emojis for UI icons, features, or buttons. Use Lucide icons (<i data-lucide="..."></i>) or SVG vector icons exclusively.',
      'NO HEADER/FOOTER AI SLOP: Never generate top status pills (e.g. "ARCHIVAL EDITION", "SYS.DOC") or bottom spec telemetry bars (e.g. "1080x1440 ARTBOARD", fake URLs). Start directly with the headline hero.',
      'TYPOGRAPHY READABILITY RULE: In 3:4 posters and diagrams, NEVER use font sizes below 16px. Ensure all diagram node labels, steps, cards, and text are crisp and immediately readable on small devices (diagram titles >= 18px, headline >= 64px, subheading >= 24px).',
      'Mobile-first responsive styling: default layout for mobile, min-width media queries for tablet (768px) and desktop (1024px).',
      'No heavy frameworks or build tools; pure browser-native standard HTML5, CSS3, and ES6 JavaScript.',
      'Always link styles.css and tokens.css in index.html head.'
    ];
    const rulesBlock = (input.universalRules && input.universalRules.length > 0)
      ? input.universalRules.map((r) => `- ${r}`).join('\n')
      : defaultCraftRules.map((r) => `- ${r}`).join('\n');
    addLayer(8, 'Universal Craft Rules', rulesBlock, 'Universal Craft & Identity Rules');

    // Layer 9: Active Skill Instructions
    const skillContent = input.skill ? input.skill.markdownContent : undefined;
    addLayer(9, 'Active Skill Instructions', skillContent, input.skill ? `Active Skill: ${input.skill.name}` : undefined);

    // Build User Message (Layer 10: Workspace Filesystem Tree + Retrieved Context + Prompt)
    const userSections: string[] = [];

    // Layer 10: Workspace Filesystem Tree
    if (input.workspaceFiles && input.workspaceFiles.length > 0) {
      const treeLines = input.workspaceFiles.map((f) => `- ${f.path} (${f.size} bytes)`).join('\n');
      userSections.push(`## Layer 10: Workspace Filesystem Tree\n${treeLines}`);
      layerDiagnostic.push({ layer: 10, name: 'Workspace Filesystem Tree', included: true, sizeBytes: Buffer.byteLength(treeLines) });
    } else {
      layerDiagnostic.push({ layer: 10, name: 'Workspace Filesystem Tree', included: false, sizeBytes: 0 });
    }

    // Grounded Template Patterns (from local website-templates registry)
    if (input.templateGroundedContext && input.templateGroundedContext.trim()) {
      userSections.push(input.templateGroundedContext.trim());
    }

    // Retrieved Context (if any)
    if (input.retrievedContext && input.retrievedContext.trim()) {
      userSections.push(input.retrievedContext.trim());
    }

    // Surgical Refinement Context
    if (input.refinementSectionId) {
      userSections.push(`## Surgical Refinement Request
Target Section: [data-od-id="${input.refinementSectionId}"]
Update ONLY this section or elements related to it, preserving surrounding document structure and all other data-od-id attributes.`);
    }

    // Primary User Prompt
    userSections.push(`## User Request\n${input.userPrompt}`);

    return {
      systemInstruction: systemSections.join('\n\n'),
      userMessage: userSections.join('\n\n'),
      layerDiagnostic
    };
  }
}
