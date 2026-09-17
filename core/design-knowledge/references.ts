export interface DesignReferenceProfile {
  id: string;
  name: string;
  sourceSkill: string;
  principles: string[];
  spatialRhythm: string;
  typographyDiscipline: string;
  paletteApproach: string;
  imageRelationship: string;
  geometricScaffold: string;
  avoidClichés: string[];
}

export const CURATED_DESIGN_REFERENCES: DesignReferenceProfile[] = [
  {
    id: 'swiss-international',
    name: 'Swiss International Typographic Style',
    sourceSkill: 'LIBERA skill-web-design & poster-generator-skill',
    principles: [
      'Mathematical grid with asymmetric tension',
      'Flush-left rag-right typography',
      'Oversized display scale contrast with untouched whitespace',
      'Clarity over decoration'
    ],
    spatialRhythm: '35%-45% intentional negative space, asymmetric off-center axis',
    typographyDiscipline: 'Unadorned neo-grotesque (Plus Jakarta Sans / Inter), tight tracking on display',
    paletteApproach: 'Monochrome base (deep graphite / slate) with single vibrant optical accent',
    imageRelationship: 'Bleed photography or crisp cropped rectangular window',
    geometricScaffold: 'Precision alignment guides, single hairline divider, mathematical proportions',
    avoidClichés: ['Generic rounded cards', 'SaaS pill tags', 'Decorative shadow layers']
  },
  {
    id: 'constructivist-architectural',
    name: 'Constructivist & Bauhaus Architectural Editorial',
    sourceSkill: 'poster-style-transfer & ArnavPuri designskills',
    principles: [
      'Form follows function: typography as structural element',
      'Integration of real architectural photography with graphic planes',
      'Dynamic diagonal tension or bold orthogonal balance',
      'Truth to materials: honest paper grounds, pure ink contrasts'
    ],
    spatialRhythm: 'Open architectural intervals, asymmetrical framing around physical subjects',
    typographyDiscipline: 'High-contrast architectural sans (Outfit / Plus Jakarta Sans), all-caps structural headers',
    paletteApproach: 'Warm linen or raw canvas ground (#F4F1EA, #0C0E14) with architectural ochre, vermilion, or slate',
    imageRelationship: 'Archival building photography, monochrome structural details integrated beneath graphic geometry',
    geometricScaffold: 'Proportional rectangles, structural axis lines, framing brackets that adapt around imagery',
    avoidClichés: [
      'Bauhaus checklist cliché: do NOT blindly stack red circle + blue rect + yellow rect',
      'Generic museum archive fake coordinate rails'
    ]
  },
  {
    id: 'technical-schematic',
    name: 'High-Craft Editorial Systems & Schematics',
    sourceSkill: 'Claude Design Skill & Editorial Systems Design',
    principles: [
      'Oversized display typography with selective accent hierarchy (e.g. bold grotesque paired with italic serif or optical color accent)',
      'Editorial composition over dashboard composition: asymmetric layouts, tactile materiality, generous intentional negative space',
      'Authentic integrated semantic primitives: optional code excerpt, diagram, screenshot, transcript, waveform, or vector annotation—only when justified',
      'Restrained supporting copy: 1 major idea + 0-1 support statements',
      'Canvas-direct flow without boxed card containers or generic panels'
    ],
    spatialRhythm: 'Expansive 3:4 canvas occupancy; diagram breathes directly on the background without panel walls',
    typographyDiscipline: 'Bold display grotesque (Plus Jakarta Sans / Syne) with selective editorial serif or optical accent; monospace strictly restricted to code syntax',
    paletteApproach: 'Deep midnight obsidian, warm tactile paper, or rich slate ground with single vibrant optical accent',
    imageRelationship: 'Optional infrastructure/hardware or contextual photography subtly layered beneath vectors',
    geometricScaffold: 'Continuous flow lines, particle trajectories, oversized numerical beacons (01, 02), clean SVG paths',
    avoidClichés: [
      'Mind-map node card repetition: NO boxes with arrows connecting boxes',
      'Dashboard panels: NO <div class="diagram-container"> enclosing the artboard',
      'Fake telemetry: NO TERM 04, ACTIVE LEADER, NODE_01, SYSTEM STATUS'
    ]
  },
  {
    id: 'cinematic-editorial',
    name: 'Cinematic High-Performance Editorial',
    sourceSkill: 'Hallmark Design & poster-generator-skill',
    principles: [
      'Singular dominant focal subject (person, vehicle, object, architectural form)',
      'Extreme scale contrast: hero subject commands 60%+ visual mass',
      'Restrained micro-copy: headline + one crisp supporting statement',
      'Localized scrims and natural atmospheric lighting over heavy dark overlays'
    ],
    spatialRhythm: 'Open sky / tarmac / terrain negative space balanced against anchored title block',
    typographyDiscipline: 'High-impact Roman display (bold condensed or modern serif), never italic headings',
    paletteApproach: 'Derived organically from image lighting with crisp white or warm metallic type',
    imageRelationship: 'Full-bleed or massive focal frame; subject lighting dictates composition anchor',
    geometricScaffold: 'Minimal; subtle edge lines or minimal typographic bounds only',
    avoidClichés: ['4-column spec strips', 'Explanatory marketing paragraphs', 'Decorative colored status dots']
  }
];
