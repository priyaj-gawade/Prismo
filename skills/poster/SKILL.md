---
name: poster
targetType: poster
description: Strictly 3:4 aspect ratio visual artboard poster (1080x1440px).
---

# Strictly 3:4 Social Poster Skill

Design a standalone, high-impact graphic poster rendered as a fixed 3:4 visual artboard, strictly sized at 1080px by 1440px.

## Mandatory Format & Canvas Physics
- **Aspect Ratio**: Strictly **3:4** (width:height = 3:4). Canonical dimensions: **1080px × 1440px**.
- **Edge-to-Edge Rule**: The document MUST NOT have any outer canvas margins, padding, or centering letterbox backgrounds on `body`. The artboard fills the entire 1080x1440 canvas edge-to-edge.
- **Safe-Zone Boundary Rule**: `.poster-artboard` MUST have `padding: 64px 60px; box-sizing: border-box; overflow: hidden;`. All text, headings, and cards must remain safely inside without touching outer borders.

## Strict Structural Rules (ZERO AI SLOP METADATA)
1. **NO TOP HEADER PILLS OR METADATA**: Do NOT create top badge pills (e.g. "ARCHIVAL EDITION N° 042", "SYS.DOC // 02", "PROGRAMMING EXCELLENCE", "EST. 1974", "FELINE ARCHIVES", date tags, or edition badges). The poster begins immediately with the prominent headline/hero.
2. **NO FOOTER SPEC BARS OR FAKE URLS**: Do NOT generate bottom telemetry bars, edition stamps, verification seals ("VERIFIED TRUTHS"), fake domain names ("RETROCATS.ORG"), or brand spec footers (e.g. "ENGINE LAB", "1080 × 1440 EXACT ARTBOARD", "#AI_ENGINEERING").
3. **NO TOP/BOTTOM DIVIDER LINES**: Do NOT place horizontal `<hr>` or top/bottom border separator lines above the headline or below the content grid.
4. **FULL VERTICAL DENSITY**: The entire 1440px height must be purposefully distributed between the hero headline (~25-30%) and dynamic content bento grid (~70-75%). Never leave large empty black voids.

## Mandatory Typography & Readability Scale
To ensure crystal-clear readability on mobile devices and high-res displays:
- **Headline (`h1`, `.poster-headline`)**: `64px – 76px` (`font-weight: 800/900; line-height: 1.1; letter-spacing: -0.03em; max-width: 950px; word-break: break-word;`).
- **Subheading (`p`, `.poster-subtext`)**: `24px – 28px` (`line-height: 1.45; max-width: 920px; font-weight: 400/500;`).
- **Card Headings (`h3`, `.card-title`)**: `22px – 26px` (`font-weight: 700; line-height: 1.3;`).
- **Card Body Text**: `17px – 19px` (`line-height: 1.55;`).
- **Diagrams, Architecture Flows, & Pipelines (e.g., VueJS / LangChain / System Diagrams)**:
  - Node titles / step labels: `18px – 22px` (`font-weight: 700;`).
  - Step tags / badges: `15px – 17px` (`font-weight: 600;`).
  - Connector arrows / flow indicators: `20px – 24px` with high contrast.
  - Sub-captions in diagrams: `16px – 18px`.
  - **ABSOLUTE MINIMUM FONT SIZE**: NEVER use font sizes below `16px` anywhere on the poster.

## Container Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1440, initial-scale=1.0">
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="styles.css">
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
  <main class="poster-artboard" data-od-id="poster-root">
    <div class="poster-backdrop" data-od-id="poster-bg"></div>
    <div class="poster-content" data-od-id="poster-body">
      <!-- 1. HERO (Direct, prominent headline & subtitle) -->
      <header class="poster-hero" data-od-id="poster-hero">
        <h1 class="poster-headline" data-od-id="poster-headline">Headline Title</h1>
        <p class="poster-subtext" data-od-id="poster-subtext">Clear, engaging narrative subtitle explaining the core concept.</p>
      </header>

      <!-- 2. DYNAMIC BENTO GRID & DIAGRAMS (Fills remaining vertical space) -->
      <section class="poster-grid" data-od-id="poster-grid">
        <!-- Feature cards, architecture flow diagrams, key metrics, and infographics -->
      </section>
    </div>
  </main>
  <script>
    if (window.lucide) { lucide.createIcons(); }
  </script>
</body>
</html>
```

## Dynamic Bento Grid & Card Scaling Rules (Strict Tight Gaps & High Density)
1. **TIGHT UNIFORM GAPS**: Gaps between cards must ALWAYS be tight and consistent (`gap: 20px;` to `24px;`). NEVER use `justify-content: space-between` on `.poster-grid` to spread tiny cards across massive empty voids.
2. **CARD STRETCHING & ROW ALLOCATION**:
   - In a vertical card stack: Every card child MUST have `flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 28px 32px;` so that **the cards themselves expand to fill the vertical canvas**, creating a dense, tactile editorial layout.
   - In a Bento Grid: Use `display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: 1fr; gap: 20px;` with cards spanning 6 or 12 columns.
3. **RICH CARD CONTENT**:
   - Each card must contain: (a) Header with vector Lucide icon + category tag, (b) Bold card title (`22px – 26px`), (c) 3-4 lines of informative, rich explanation text (`17px – 19px`), and (d) Stat pill or key takeaway badge (`15px – 16px`).

## Mandatory CSS Styling Rules
1. `html, body` MUST have `margin: 0 !important; padding: 0 !important; width: 1080px !important; height: 1440px !important; overflow: hidden !important; background: transparent;`.
2. `.poster-artboard` MUST have `width: 1080px; height: 1440px; margin: 0; padding: 64px 60px; position: relative; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;`.
3. `.poster-content` MUST have `display: flex; flex-direction: column; height: 100%; gap: 28px; position: relative; z-index: 10;`.
4. `.poster-grid` MUST have `flex: 1; display: flex; flex-direction: column; gap: 20px;` (or `display: grid; gap: 20px; flex: 1;`).
5. `.poster-grid > *` MUST have `flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 28px 32px; border-radius: 18px;` so cards stretch to fill the height with rich internal padding and zero awkward dead space.
6. Every visible container MUST have a persistent `data-od-id="..."` attribute.
