---
name: poster
targetType: poster
description: Strictly 3:4 aspect ratio visual artboard poster (1080x1440px).
---

# Strictly 3:4 Social Poster Skill

Design a standalone, high-impact graphic poster rendered as a fixed 3:4 visual artboard, strictly sized at 1080px by 1440px.

## Mandatory Format
- **Aspect Ratio**: Strictly **3:4** (width:height = 3:4). Canonical dimensions: **1080px × 1440px**.
- **Edge-to-Edge Rule**: The document MUST NOT have any outer canvas margins, padding, or centering letterbox backgrounds on `body`. The artboard fills the entire 1080x1440 canvas edge-to-edge.
- **Container Structure**:
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080, height=1440, initial-scale=1.0">
    <link rel="stylesheet" href="tokens.css">
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <main class="poster-artboard" data-od-id="poster-root">
      <div class="poster-backdrop" data-od-id="poster-bg"></div>
      <div class="poster-content" data-od-id="poster-body">
        <div class="poster-header" data-od-id="poster-header">
          <span class="poster-badge" data-od-id="poster-badge">ISSUE 01 / ARCHITECTURE</span>
          <span class="poster-meta" data-od-id="poster-date">2026 EDITION</span>
        </div>
        <div class="poster-main" data-od-id="poster-main">
          <h1 class="poster-headline" data-od-id="poster-headline">LangGraph.</h1>
          <p class="poster-subtext" data-od-id="poster-subtext">Stateful Multi-Agent Orchestration at Scale</p>
        </div>
        <div class="poster-visual" data-od-id="poster-visual">
          <!-- Central visual, geometric composition, or graph artwork -->
        </div>
        <div class="poster-footer" data-od-id="poster-footer">
          <span class="poster-brand" data-od-id="poster-brand">ENGINE LAB</span>
          <span class="poster-specs" data-od-id="poster-specs">1080 × 1440 ARTBOARD</span>
        </div>
      </div>
    </main>
  </body>
  </html>
  ```

## Mandatory CSS Styling Rules
1. `html, body` MUST have `margin: 0 !important; padding: 0 !important; width: 1080px !important; height: 1440px !important; overflow: hidden !important; background: transparent;`.
2. `.poster-artboard` MUST have `width: 1080px; height: 1440px; margin: 0; padding: 60px 48px; position: relative; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;` with bold, rich visual composition.
3. Typography must be bold, expressive, and tailored to the aesthetic requested (maximalism, minimalism, brutalism, editorial).
4. Every visible container MUST have a persistent `data-od-id="..."` attribute.
