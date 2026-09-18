import fs from 'node:fs';
import path from 'node:path';
import { ArtifactValidator } from '../../core/validation/validator.ts';
import { HeadlessExporter } from '../../core/export/exporter.ts';
import { WebsiteTemplateRegistry } from '../../core/templates/registry.ts';

export async function runExportValidationTest(): Promise<boolean> {
  console.log('--- Testing 3:4 Poster Ratio, Image Binary Headers, & Template Registry ---');

  const validator = new ArtifactValidator();

  // 1. Integer-safe 3:4 poster ratio tests
  const valid1 = validator.validatePosterDimensions(1080, 1440);
  if (!valid1.valid) throw new Error('1080x1440 should be valid 3:4');

  const valid2 = validator.validatePosterDimensions(750, 1000);
  if (!valid2.valid) throw new Error('750x1000 should be valid 3:4');

  const valid3 = validator.validatePosterDimensions(900, 1200);
  if (!valid3.valid) throw new Error('900x1200 should be valid 3:4');

  const invalid1 = validator.validatePosterDimensions(1080, 1350);
  if (invalid1.valid) throw new Error('1080x1350 (4:5) must be rejected');

  const invalid2 = validator.validatePosterDimensions(1080, 1920);
  if (invalid2.valid) throw new Error('1080x1920 (9:16) must be rejected');

  console.log('  [PASS] Integer-safe 3:4 poster validation verified (width * 4 === height * 3)');

  // 2. HeadlessExporter binary image header validation
  const exporter = new HeadlessExporter();
  const tempDir = path.resolve('d8.7-test-export-headers');
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Synthetic PNG with valid 8-byte signature + IHDR chunk (1080x1440)
    const pngBuf = Buffer.alloc(33);
    // Magic: 89 50 4E 47 0D 0A 1A 0A
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(pngBuf, 0);
    // IHDR length: 13
    pngBuf.writeUInt32BE(13, 8);
    // Chunk type: IHDR
    pngBuf.write('IHDR', 12);
    // Width: 1080
    pngBuf.writeUInt32BE(1080, 16);
    // Height: 1440
    pngBuf.writeUInt32BE(1440, 20);

    const testPngPath = path.join(tempDir, 'test.png');
    fs.writeFileSync(testPngPath, pngBuf);

    const pngVal = exporter.validateImageFile(testPngPath, 'png');
    if (!pngVal.valid || pngVal.width !== 1080 || pngVal.height !== 1440) {
      throw new Error(`PNG header parsing failed: expected 1080x1440, got ${pngVal.width}x${pngVal.height}`);
    }
    console.log('  [PASS] PNG magic bytes and IHDR dimension parsing verified (1080x1440)');

    // Synthetic JPEG with valid SOI (FF D8 FF) + SOF0 marker (1080x1440)
    // SOI: FF D8
    // Marker: FF C0, length: 00 11 (17), precision: 08, height: 1440 (05 A0), width: 1080 (04 38)
    const jpgBuf = Buffer.alloc(24);
    jpgBuf[0] = 0xff;
    jpgBuf[1] = 0xd8;
    jpgBuf[2] = 0xff;
    jpgBuf[3] = 0xc0; // SOF0
    jpgBuf.writeUInt16BE(17, 4); // length
    jpgBuf[6] = 8; // precision
    jpgBuf.writeUInt16BE(1440, 7); // height
    jpgBuf.writeUInt16BE(1080, 9); // width

    const testJpgPath = path.join(tempDir, 'test.jpg');
    fs.writeFileSync(testJpgPath, jpgBuf);

    const jpgVal = exporter.validateImageFile(testJpgPath, 'jpeg');
    if (!jpgVal.valid || jpgVal.width !== 1080 || jpgVal.height !== 1440) {
      throw new Error(`JPEG header parsing failed: expected 1080x1440, got ${jpgVal.width}x${jpgVal.height}`);
    }
    console.log('  [PASS] JPEG magic bytes and SOF0 dimension parsing verified (1080x1440)');

    // 3. WebsiteTemplateRegistry deterministic matching
    const registry = new WebsiteTemplateRegistry();
    const matches = registry.matchTemplates('saas ai platform', 3);
    if (!Array.isArray(matches) || matches.length === 0) {
      throw new Error('WebsiteTemplateRegistry failed to match templates for "saas ai platform"');
    }
    const context = registry.formatGroundedContext('developer tool ai saas');
    if (!context.includes('Grounded Website Template References') || context.length < 100) {
      throw new Error('formatGroundedContext failed to output structural references');
    }
    console.log(`  [PASS] WebsiteTemplateRegistry matched ${matches.length} templates with grounded context`);

    console.log('Export validation tests PASSED!\n');
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith('export_validation.test.ts')) {
  runExportValidationTest().catch(console.error);
}
