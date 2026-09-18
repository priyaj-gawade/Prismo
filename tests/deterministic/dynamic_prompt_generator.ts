export interface DynamicTestCase {
  id: string;
  domain: string;
  topic: string;
  colorTheme: string;
  slideCount: number;
  prompt: string;
}

export const DOMAIN_TOPICS = [
  {
    domain: 'Astrophysics & Space Exploration',
    topic: 'James Webb Space Telescope Mid-Infrared Optical Array and Gravitational Lensing Spectroscopy',
    focalPoints: 'Cryogenic beryllium mirror segments, micro-shutter arrays, red-shifted primordial galaxy detection, and infrared diffraction spikes'
  },
  {
    domain: 'Deep Ocean Marine Biology',
    topic: 'Abyssal Bioluminescent Cephalopods and Hydrostatic Pressure Adaptation Mechanisms',
    focalPoints: 'Photophore photoprotein enzymatic cascades, piezolyte cellular membrane stabilization, hydrostatic jet vortexes, and Mariana Trench telemetry'
  },
  {
    domain: 'Quantum Physics & Computing',
    topic: 'Topological Quantum Computing with Superconducting Transmon Qubits and Majorana Anyons',
    focalPoints: 'Braided non-Abelian statistics, dilution refrigerator sub-millikelvin cryogenics, quantum error correction surface codes, and coherence decoherence flux'
  },
  {
    domain: 'Neuroscience & Neuromorphic AI',
    topic: 'Spiking Neural Networks and Biologically Inspired Synaptic Plasticity Architectures',
    focalPoints: 'Event-driven leaky integrate-and-fire neurons, spike-timing-dependent plasticity (STDP), asynchronous neuromorphic tensor chips, and sub-milliwatt power budgets'
  },
  {
    domain: 'Synthetic Biology & Genomics',
    topic: 'CRISPR-Cas13 RNA Direct Targeting and Programmable Epitranscriptomic Modulation',
    focalPoints: 'Guide RNA ribonucleoprotein quaternary complexes, non-genomic viral RNA cleavage, real-time fluorescent lateral flow diagnostics, and molecular therapeutics'
  },
  {
    domain: 'Advanced Materials Science',
    topic: 'Graphene Aerogel Nanostructures and High-Entropy Superconducting Metamaterials',
    focalPoints: 'Zero-density 3D cellular graphene lattices, electromagnetic cloaking resonance, room-temperature ambient flux pinning, and thermal insulation conductivity'
  },
  {
    domain: 'Bio-Robotics & Biomimetic Systems',
    topic: 'Dielectric Elastomer Artificial Muscles and Distributed Soft-Robotics Swarm Locomotion',
    focalPoints: 'High-voltage electroactive polymer actuation, autonomous decentralized SLAM navigation, insect-wing aerodynamic lift dynamics, and morphing tactile skins'
  },
  {
    domain: 'Archaeoastronomy & Ancient Mechanical Computation',
    topic: 'The Antikythera Mechanism Astronomical Computer and Epicyclic Differential Gearing',
    focalPoints: '37-bronze-gear differential train calculations, Saros eclipse prediction dials, Metonic lunar-solar synchronizers, and Hellenistic bronze metallurgy'
  }
];

export const COLOR_PALETTES = [
  {
    name: 'Amber & Charcoal Prestige',
    directive: 'amber + dark navy + pearl',
    description: 'deep obsidian and midnight charcoal foundation with radiant amber-gold accents and warm pearl typography'
  },
  {
    name: 'Cyan & Midnight Titanium',
    directive: 'cyan + midnight + titanium',
    description: 'abyssal midnight slate canvas with electric cyan highlights and brushed titanium surface tiers'
  },
  {
    name: 'Emerald & Gold Luxury',
    directive: 'emerald + gold + obsidian',
    description: 'dark forest green and obsidian backdrop with lustrous emerald glow and warm gold metallic borders'
  },
  {
    name: 'Crimson & Charcoal Bold',
    directive: 'crimson + charcoal + gold',
    description: 'intense charcoal noir backdrop with vivid crimson energy lines and warm gold telemetry callouts'
  },
  {
    name: 'Deep Teal & Bronze Heritage',
    directive: 'teal + bronze + ivory',
    description: 'deep oceanic dark teal foundation with burnished bronze highlights and crisp ivory typography'
  },
  {
    name: 'Cobalt & Neon Lime Precision',
    directive: 'cobalt + neon lime + carbon',
    description: 'carbon slate background with high-octane cobalt blue and razor-sharp electric lime accents'
  },
  {
    name: 'Terracotta & Warm Cream Editorial',
    directive: 'terracotta + warm cream + slate',
    description: 'rich slate charcoal surfaces with warm terracotta copper indicators and soft cream editorial typography'
  },
  {
    name: 'Luminous Canary Yellow Void',
    directive: 'yellow + black + white',
    description: 'pure deep black void with luminous canary yellow high-contrast badges and crisp white text'
  }
];

export function generateDynamicPrompt(options?: {
  topicIndex?: number;
  paletteIndex?: number;
  slideCount?: number;
}): DynamicTestCase {
  const tIdx = options?.topicIndex ?? Math.floor(Math.random() * DOMAIN_TOPICS.length);
  const pIdx = options?.paletteIndex ?? Math.floor(Math.random() * COLOR_PALETTES.length);
  const slideCount = options?.slideCount ?? 5;

  const topicObj = DOMAIN_TOPICS[tIdx % DOMAIN_TOPICS.length];
  const paletteObj = COLOR_PALETTES[pIdx % COLOR_PALETTES.length];

  // Construct an explicit 4-5 line rich prompt
  const lines = [
    `Create a comprehensive ${slideCount}-slide social poster deck on "${topicObj.topic}" (${topicObj.domain}).`,
    `Delve into key scientific mechanisms and breakthroughs: ${topicObj.focalPoints}.`,
    `Layout Architecture: high-density Bento grids, tall telemetry cards, bespoke geometric SVG diagrams, and zero empty canvas space.`,
    `Color Theme & Atmosphere: ${paletteObj.directive} (${paletteObj.description}).`,
    `Formatting Mandates: strict 3:4 canvas (1080x1440), Lucide vector icons exclusively (never use emojis), and distinct multi-card hierarchy per slide.`
  ];

  const fullPrompt = lines.join('\n');
  const id = `test_${topicObj.domain.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 16)}_${paletteObj.directive.split(' ')[0]}`;

  return {
    id,
    domain: topicObj.domain,
    topic: topicObj.topic,
    colorTheme: paletteObj.directive,
    slideCount,
    prompt: fullPrompt
  };
}
