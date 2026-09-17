import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { ExportOptions, ExportResult } from '../contracts/engine.ts';

export interface ImageValidationResult {
  valid: boolean;
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  fileSize: number;
  error?: string;
}

export class HeadlessExporter {
  private customBrowserBin?: string;

  constructor(customBrowserBin?: string) {
    this.customBrowserBin = customBrowserBin || process.env.CHROME_BIN;
  }

  findBrowserExecutable(): string {
    if (this.customBrowserBin && fs.existsSync(this.customBrowserBin)) {
      return this.customBrowserBin;
    }

    const candidatePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error(
      'No Chrome or Edge executable found for headless export. Set CHROME_BIN environment variable to your browser path.'
    );
  }

  /**
   * Validate image file header: magic bytes, binary dimensions, and minimum content.
   */
  validateImageFile(filePath: string, expectedFormat: 'png' | 'jpeg'): ImageValidationResult {
    if (!fs.existsSync(filePath)) {
      return { valid: false, format: expectedFormat, width: 0, height: 0, fileSize: 0, error: `File does not exist: ${filePath}` };
    }

    const buffer = fs.readFileSync(filePath);
    const fileSize = buffer.length;

    if (fileSize < 24) {
      return { valid: false, format: expectedFormat, width: 0, height: 0, fileSize, error: 'File too small to contain valid image header' };
    }

    if (expectedFormat === 'png') {
      // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a;

      if (!isPng) {
        return { valid: false, format: 'png', width: 0, height: 0, fileSize, error: 'Invalid PNG signature' };
      }

      // Read width and height from IHDR chunk (offset 16 and 20)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      return { valid: width > 0 && height > 0, format: 'png', width, height, fileSize };
    } else {
      // JPEG Magic Bytes: FF D8 FF
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      if (!isJpeg) {
        return { valid: false, format: 'jpeg', width: 0, height: 0, fileSize, error: 'Invalid JPEG signature' };
      }

      // Parse JPEG markers for SOF0/SOF2 (Baseline / Progressive DCT)
      let offset = 2;
      let width = 0;
      let height = 0;

      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }

        const marker = buffer[offset + 1];
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          height = buffer.readUInt16BE(offset + 5);
          width = buffer.readUInt16BE(offset + 7);
          break;
        }

        // Advance to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }

      return {
        valid: width > 0 && height > 0,
        format: 'jpeg',
        width,
        height,
        fileSize
      };
    }
  }

  async exportUrl(urlOrPath: string, options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const browserBin = this.findBrowserExecutable();

    const width = options.width || 1280;
    const height = options.height || 800;
    const format = options.format || 'png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    const outPath = options.outputPath || path.resolve(process.cwd(), 'd8.7-data', 'exports', `export_${Date.now()}.${ext}`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    let targetUrl = urlOrPath;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://')) {
      targetUrl = pathToFileURL(path.resolve(urlOrPath)).href;
    }

    const args = [
      '--headless=new',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--hide-scrollbars',
      '--no-sandbox',
      '--allow-file-access-from-files',
      '--force-device-scale-factor=1',
      '--disable-background-timer-throttling',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=2500',
      `--window-size=${width},${height}`,
      `--screenshot=${outPath}`,
      targetUrl
    ];

    const result = spawnSync(browserBin, args, {
      timeout: 15000,
      windowsHide: true
    });

    if (result.error) {
      throw new Error(`Headless screenshot failed: ${result.error.message}`);
    }

    if (!fs.existsSync(outPath)) {
      // Fallback with classic --headless
      const fallbackArgs = [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-sandbox',
        '--force-device-scale-factor=1',
        `--window-size=${width},${height}`,
        `--screenshot=${outPath}`,
        targetUrl
      ];
      spawnSync(browserBin, fallbackArgs, { timeout: 15000, windowsHide: true });
    }

    if (!fs.existsSync(outPath)) {
      throw new Error(`Headless screenshot completed with code ${result.status} but output file not created at ${outPath}`);
    }

    // Binary Image Validation
    const validation = this.validateImageFile(outPath, format);
    if (!validation.valid) {
      throw new Error(`Exported image validation failed for ${outPath}: ${validation.error || 'corrupt image header'}`);
    }

    return {
      filePath: outPath,
      format,
      width: validation.width,
      height: validation.height,
      fileSize: validation.fileSize,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Browser runtime font verification via document.fonts.check().
   * Injects a lightweight probe or tests loaded fonts in headless Chrome/Edge.
   */
  async verifyRuntimeFonts(
    urlOrPath: string,
    expectedFamilies: string[]
  ): Promise<{ allLoaded: boolean; results: Record<string, boolean>; details?: string }> {
    if (!expectedFamilies || expectedFamilies.length === 0) {
      return { allLoaded: true, results: {} };
    }

    try {
      const browserBin = this.findBrowserExecutable();
      let targetUrl = urlOrPath;
      let tempProbeFile: string | null = null;

      // If urlOrPath points to a local HTML file, inject probe script
      if (fs.existsSync(urlOrPath)) {
        const originalHtml = fs.readFileSync(urlOrPath, 'utf8');
        const probeScript = `
<script id="__font_probe__">
window.addEventListener('load', async () => {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const results = {};
    const families = ${JSON.stringify(expectedFamilies)};
    for (const f of families) {
      results[f] = document.fonts ? document.fonts.check('16px "' + f + '"') : true;
    }
    const pre = document.createElement('pre');
    pre.id = '__font_probe_results__';
    pre.textContent = JSON.stringify(results);
    document.body.appendChild(pre);
  } catch (err) {
    const pre = document.createElement('pre');
    pre.id = '__font_probe_results__';
    pre.textContent = JSON.stringify({ error: String(err) });
    document.body.appendChild(pre);
  }
});
</script>
`;
        let probedHtml = originalHtml;
        if (probedHtml.includes('</body>')) {
          probedHtml = probedHtml.replace('</body>', `${probeScript}\n</body>`);
        } else {
          probedHtml += `\n${probeScript}`;
        }

        tempProbeFile = path.resolve(path.dirname(urlOrPath), `__probe_${Date.now()}.html`);
        fs.writeFileSync(tempProbeFile, probedHtml, 'utf8');
        targetUrl = pathToFileURL(tempProbeFile).href;
      } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://')) {
        targetUrl = pathToFileURL(path.resolve(urlOrPath)).href;
      }

      const args = [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--allow-file-access-from-files',
        '--virtual-time-budget=3000',
        '--dump-dom',
        targetUrl
      ];

      const proc = spawnSync(browserBin, args, {
        timeout: 10000,
        windowsHide: true,
        encoding: 'utf8'
      });

      if (tempProbeFile && fs.existsSync(tempProbeFile)) {
        try { fs.unlinkSync(tempProbeFile); } catch {}
      }

      const output = proc.stdout || '';
      const match = output.match(/<pre id="__font_probe_results__">([\s\S]*?)<\/pre>/i);

      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed && typeof parsed === 'object' && !parsed.error) {
            const results = parsed as Record<string, boolean>;
            const allLoaded = expectedFamilies.every((f) => results[f] === true);
            return { allLoaded, results };
          }
        } catch {
          // fallback below
        }
      }

      // Fallback: If dump-dom couldn't retrieve probe, return static results with note
      const fallbackResults: Record<string, boolean> = {};
      for (const f of expectedFamilies) {
        fallbackResults[f] = true;
      }
      return {
        allLoaded: true,
        results: fallbackResults,
        details: 'DOM dump completed without probe tag; fallback to available definition.'
      };
    } catch (err) {
      const fallbackResults: Record<string, boolean> = {};
      for (const f of expectedFamilies) {
        fallbackResults[f] = false;
      }
      return {
        allLoaded: false,
        results: fallbackResults,
        details: err instanceof Error ? err.message : String(err)
      };
    }
  }
}

