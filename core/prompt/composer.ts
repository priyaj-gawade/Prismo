import type { SkillDefinition } from '../skills/types.ts';
import type { SupportedRatio } from '../geometry/ratio.ts';

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
  geometryContext?: {
    ratio: SupportedRatio;
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape' | 'square';
  };
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

    const ratio = input.geometryContext?.ratio || '3:4';
    const width = input.geometryContext?.width || 1080;
    const height = input.geometryContext?.height || 1440;
    const orientation = input.geometryContext?.orientation || 'portrait';

    // Layer 1: Core Base Instructions
    const defaultBase = `You are Prismo, the High-Density Multi-Ratio Visual Design Engine.
Your mission is to author stunning, state-of-the-art visual compositions specifically tailored for the active ${ratio} canvas (${width}px x ${height}px, ${orientation} orientation) that function as GENUINE VISUAL COMPOSITIONS, not software dashboards.

==================================================
D8.7 — FINAL POSTER VISUAL QUALITY POLICY
MICRO-UI / AI-SLOP / FAKE-CHROME ELIMINATION
==================================================
A poster is ONE deliberate visual composition with ONE dominant focal point, controlled typography, meaningful negative space (30-40% breathing room), and recognizable art direction.
A poster is NOT a dashboard, a website section stack, a documentation page, a card grid, or an analytics screen.
VISUAL QUALITY HAS ABSOLUTE PRIORITY OVER INFORMATION DENSITY.
GENERATE A DESIGNER'S COMPOSITION, NOT A COLLECTION OF COMPONENTS.

PROHIBITED DEFAULT FORMULA:
DO NOT automatically generate:
[BIG TITLE] + [BIG ACCENT TITLE] + [MARKETING PARAGRAPH] + [FULL-WIDTH DARKENED IMAGE] + [4-COLUMN SPEC STRIP].
Each poster must independently determine title placement, title treatment, image treatment, supporting copy, and composition based on the actual subject and visual intent.

GEOMETRY & SPATIAL CONSIDERATIONS:
Geometry-specific guidance provides optional spatial considerations and must not prescribe a fixed composition, layout skeleton, alignment, or ingredient set.
Compose freely to leverage the ${orientation} proportions (${width}px x ${height}px) without forcing rigid column or row templates.

HARD MICRO-UI CHROME BANS:
- ADAPTIVE READABILITY: Primary content must be distance-readable; secondary text must remain readable; microtext is allowed only for justified credits/legal/source information. Never use small text as decorative filler.
- ZERO decorative pills/chips. A pill or chip should only exist when it is genuinely semantic content (e.g. status category), not as visual filler.
- ZERO colored status dots/LEDs (never red/green/yellow status lights).
- NO 3-part header or footer template rails.
- NO fake technical metadata or system state labels (TERM 04, ACTIVE LEADER, NODE_01, ARCHIV 1925, LAT. 51°).
- Real diagram compositions: never turn diagram nodes into mini UI cards with status pills!

POSITIVE ART DIRECTION REQUIREMENTS:
Every poster must intentionally establish:
- Clear focal point (person, vehicle, product, architecture, object, typography, diagram, number, graphic form)
- Dominant scale relationship (strong intentional contrast between hero element and supporting details)
- Compositional balance with 30%-40% intentional negative space
- Typographic relationship: Roman display headings (font-style: normal; never <em> tags inside headings)
- Adaptive image relationship: Never blind heavy dark overlays; use subtle gradients, localized scrims, vignettes, duotone, or no overlay
- Restrained secondary information: Subtitles, paragraphs, and spec bars are strictly optional

CRITICAL FORMAT RULES:
You MUST output ALL of the following distinct markdown code blocks:
1. \`\`\`html:index.html
(Complete HTML5 document with doctype, head, meta viewport, stylesheet links to tokens.css and styles.css, semantic body, and data-od-id attributes on structural elements)
\`\`\`

2. \`\`\`css:styles.css
(Complete, robust CSS stylesheet containing full visual rules for EVERY class used in index.html, defining layout, colors, typography, spacing, and image framing)
\`\`\`

3. \`\`\`javascript:script.js
(Optional interactive JavaScript if requested; can be empty or lucide.createIcons() initialization)
\`\`\`

CREATE LESS UI. CREATE MORE COMPOSITION.
USE FEWER COMPONENTS. USE STRONGER HIERARCHY.
USE LESS TEXT. USE STRONGER VISUAL COMMUNICATION.
USE FEWER CARDS. USE MORE ART DIRECTION.`;
    addLayer(1, 'Core Base Instructions', input.baseInstructions || defaultBase, 'Core Base Instructions');

    // Layer 2: Persistent Memory
    addLayer(2, 'Persistent Memory', input.persistentMemory, 'User & Aesthetic Memory');

    // Layer 3: User Instructions
    addLayer(3, 'User Instructions', input.userInstructions, 'Global User Directives');

    // Layer 4: Project Instructions
    addLayer(4, 'Project Instructions', input.projectInstructions, 'Project Specification');

    // Layer 5: Active DESIGN.md
    addLayer(5, 'Active DESIGN.md', input.designMd, 'Design System Specification');

    // Layer 6: Design Tokens
    addLayer(6, 'Design Tokens', input.tokensCss, 'CSS Variables (tokens.css)');

    // Layer 7: Component Manifest
    const defaultManifest = `Standard Poster Primitives:
- Canvas: .poster-artboard (${width}px x ${height}px, position: relative, overflow: hidden)
- Bleed Media: .poster-bleed-image (position: absolute, inset: 0, object-fit: cover)
- Focal Media: .poster-focal-frame (position: relative, overflow: hidden)
- Typography: .poster-headline, .poster-subtext, .poster-editorial-tag`;
    addLayer(7, 'Component Manifest', input.componentManifest || defaultManifest, 'Component Manifest & Patterns');

    // Layer 8: Universal Craft Rules
    const defaultCraftRules = [
      'D8.7 ART DIRECTION POLICY: Every poster must read as ONE deliberate visual composition. Never generate repeated rounded card grids, 3-column metric cards, or STEP 01/02/03 pipelines.',
      'NEGATIVE PROMPT & BANNED THEME (STRICT BAN ON DARK-NAVY TECH DASHBOARD MONOCULTURE):',
      '  - BANNED COLOR SCHEME: Strictly DO NOT default to the dark navy / midnight blue tech dashboard theme (background #0B0F17, #080C14, #131B2E, #111827 with neon cyan #00F0FF/#38BDF8 and electric blue #2563EB/#3B82F6 accents) across different templates. Never turn tactile, architectural, educational, automotive, or cultural posters into generic dark SaaS dashboards.',
      '  - MANDATORY TEMPLATE PALETTE FIDELITY: If a template defines a unique palette (e.g. kraft-architecture with warm tactile cardboard #d8bc98, dark tape badges #181818, terracotta accents #c8522c, and dark ink typography #1a1614), you MUST execute in that authentic palette. NEVER substitute kraft paper or light editorial subjects with dark navy mode.',
      '  - BANNED AI SLOP LAYOUT FORMULAS: Avoid repetitive layout convergence across different prompts:',
      '    * NO REPETITIVE VERTICAL CARD GRIDS: Do NOT divide every poster into 2 to 5 rounded translucent dark boxes with micro-numbers (01, 02, 03...) and code pills.',
      '    * NO DEFAULT 3-COLUMN METRICS RAILS: Do NOT add a bottom horizontal container with 3 columns of metrics (e.g. LATENCY | THROUGHPUT | EXECUTION or 01 | 02 | 03) unless the user explicitly requested a live telemetry dashboard.',
      'STRICT BAN ON MONOSPACE FONTS (USE POPPINS INSTEAD):',
      '  - Monospace fonts (e.g. "JetBrains Mono", "Fira Code", "Courier", "Consolas", ui-monospace, monospace) are strictly banned across the entire poster! Never use monospace for numbers, metrics, telemetry, specs, labels, body text, or sentences.',
      '  - Always use "Poppins" (Google Font Poppins, e.g. font-family: "Poppins", sans-serif; font-weight: 600 or 700) for numeric metrics, measurements, telemetry values, technical specs, and badges. When displaying any numerical data or stats, format them with Poppins.',
      'ANTI-TEMPLATE RULE: Do not automatically generate the default formula (Big Title + Accent Title + Paragraph + Darkened Image + 4-Column Spec Bar). Choose composition independently based on subject.',
      'GEOMETRY ADAPTATION POLICY: Geometry-specific guidance provides optional spatial considerations and must not prescribe a fixed composition, layout skeleton, alignment, or ingredient set.',
      'ADAPTIVE READABILITY POLICY: Primary content must be distance-readable; secondary text must remain readable; microtext is allowed only for justified credits/legal/source information. Posters must communicate from a distance.',
      'NO DECORATIVE PILLS: Zero decorative pills/chips. A pill should only exist when it is genuinely semantic content, never as visual filler. ZERO colored status indicator dots or LEDs (no green/red/yellow status lights).',
      'TECHNICAL POSTER != MIND MAP: Never create box-and-arrow whiteboard diagrams ([BOX] ─── [BOX]) or repeated node cards (.node-card, .state-node, .server-box). Never put diagrams inside enclosed dark panels.',
      'VUE FLOW IS OPTIONAL: Vue Flow is strictly optional. If used, never use default widgets/classes (.vue-flow__node-default, .vue-flow__handle, .vue-flow__controls, .vue-flow__minimap). Use custom SVG/nodes only.',
      'TYPOGRAPHY HIERARCHY: Monospace is completely banned across the entire poster! Use display neo-grotesque, editorial serif, or architectural sans for headings. For metrics, stats, telemetry, and numbers, ALWAYS use Poppins. Orbitron is prohibited.',
      'NO TEMPLATE RAILS: Never generate generic 3-part header rails (top-left/top-center/top-right) or 3-part footer rails (bottom-left/bottom-center/bottom-right).',
      'NO FAKE METADATA OR SYSTEM CHROME: Never invent labels like TERM 04, ACTIVE LEADER, NODE_01, SYSTEM STATUS, ARCHIV 1925, or LAT. 51°.',
      'EDITORIAL TYPOGRAPHY DISCIPLINE: Display headings must have strong roman weight as the primary anchor, but selective accent typography is encouraged (e.g. bold sans/grotesque paired with an expressive italic serif accent word or optical color highlight). Never make an entire headline italic.',
      'STABLE EDITABILITY CONTRACT: Every major semantic element MUST include a stable data-od-id attribute (e.g. data-od-id="poster-root", data-od-id="headline", data-od-id="supporting-copy", data-od-id="hero-image", data-od-id="diagram", data-od-id="annotation", data-od-id="source-credit").',
      'COMPOSITION PRIMITIVES ARE OPTIONAL: Headline, supporting copy, imagery, code excerpts, diagrams, waveforms, transcripts, and annotations are semantic capabilities, NEVER mandatory ingredients. Use only what communicates the subject. Empty space must remain empty.',
      'CONCISE & HONEST COPY RULE: Avoid generic marketing cliches ("The defining...", "At the intersection of...", "Where performance meets..."). Never write explanatory paragraphs. Never fabricate telemetry or fake specs.',
      'CONTROLLED NEGATIVE SPACE: Maintain 30% to 40% clean, intentional negative space. Do not fill every pixel with boxes or text.',
      'ADAPTIVE IMAGE TREATMENT: Never apply a heavy dark overlay blindly. Adapt treatment to subject lighting and text placement (subtle gradient, localized scrim, vignette, duotone, or no overlay).',
      'ANTI-PURPLE RULE: Never use generic purple or violet backgrounds/gradients unless explicitly requested by the user.',
      'NO RAW EMOJIS: Never use emojis for UI icons or decorative points.',
      'NO TOPBAR CHROME: Never generate <nav> bars, faux creator handles (@handle), or top status pills (e.g. "ARCHIVAL EDITION", "SYS.DOC").',
      'PRE-EMIT CRITIQUE STAMP: The CSS file MUST begin with the comment: /* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V5 | grammar: img=... text=... type=... dominant=... overlay=... */',
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
