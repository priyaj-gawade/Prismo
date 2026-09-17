# Prismo 🎨

> **High-Density 3:4 Social Poster & Visual Design Engine**

Prismo is a standalone, AI-powered design engine engineered to generate production-ready **3:4 infographic posters (1080px &times; 1440px)** with rich Bento grids, bespoke geometric SVGs, Lucide vector icons, and dynamic color theme presets.

---

## ✨ Features

- **Strict 3:4 Full-Bleed Canvas**: Canonical 1080 &times; 1440 resolution designed specifically for high-impact social sharing and visual storytelling.
- **Dynamic Thematic Presets**: Automatically detects color palettes from prompt context (e.g. *Amber + Charcoal*, *Cyan + Midnight Titanium*, *Emerald + Gold Luxury*, *Terracotta + Cream*, *Yellow Void*).
- **Anti-AI-Slop Visual Discipline**: Strictly avoids generic purple gradients and raw emojis; leverages structured typography, glassmorphism, and Lucide vector icons.
- **Headless Chrome Rendering & Export**: Fast, headless browser screenshot rendering to high-res PNG and JPEG with binary dimension validation.
- **Multi-Account Rotation Pool**: Built-in account pooling with exponential backoff and circuit breaker failover.
- **Interactive Studio Panel**: Live preview panel with real-time SSE reloading and surgical section refinement.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+ with `--experimental-strip-types` support or Node.js v22+)
- Google Chrome or Chromium installed (for headless image export)

### Installation

```bash
# Clone the repository
git clone https://github.com/priyaj-gawade/Prismo.git
cd Prismo

# Install dependencies
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and provide your Gemini API key:

```bash
cp .env.example .env
```

```env
# Gemini API Key (Required)
GEMINI_KEY_1=your_gemini_api_key_here

# Server Port (Default: 5180)
D8_PORT=5180
```

### Running the Studio

```bash
# Start the Prismo Design Studio Server
npm run serve
```

Visit **`http://localhost:5180`** to access the interactive web studio.

---

## 📂 Architecture

```
d8.7/
├── app/
│   ├── cli/            # Standalone CLI interface
│   └── server/         # HTTP server & static Studio UI panel
├── core/
│   ├── config/         # Environment discovery & credential security
│   ├── contracts/      # Engine interfaces & TypeScript schemas
│   ├── design-system/  # Token generator & dynamic preset detector
│   ├── export/         # Headless browser exporter (1080x1440 PNG/JPEG)
│   ├── generation/     # Pure 3:4 Poster generation engine
│   ├── memory/         # Session & active memory management
│   ├── prompt/         # 10-layer structured prompt composer
│   ├── providers/      # Gemini multi-account pool & circuit breaker
│   ├── validation/     # Ratio validation & data-od-id coverage checks
│   └── workspace/      # Project filesystem manager & diff versioning
├── skills/
│   └── poster/         # 3:4 Social Poster skill specification
├── package.json
└── tsconfig.json
```

---

## 📄 License

MIT License &copy; 2026 Priyaj Gawade
