import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EngineConfig {
  geminiKeys: string[];
  pexelsKeys: string[];
  pixabayKeys: string[];
  unsplashKeys: string[];
  allowedModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  defaultModel: 'gemini-3.5-flash-lite';
  fallbackModel: 'gemini-3.1-flash-lite';
  port: number;
  chromeBin?: string;
  dataDir: string;
}

/**
 * Parses raw .env file text supporting both standard KEY=VALUE and block structures.
 */
export function parseEnvContent(rawContent: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = rawContent.split(/\r?\n/);
  
  let currentBlockKey: string | null = null;
  const blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check block end
    if (currentBlockKey) {
      if (line === '}' || line.startsWith('}')) {
        // Parse block lines
        // For Unsplash blocks: find "Access Key" followed by the actual key string
        let accessKey = '';
        for (let j = 0; j < blockLines.length; j++) {
          const l = blockLines[j].trim();
          if (l.toLowerCase() === 'access key' && j + 1 < blockLines.length) {
            accessKey = blockLines[j + 1].trim();
            break;
          }
          if (l.toLowerCase().startsWith('access key:')) {
            accessKey = l.split(':')[1]?.trim() || '';
            break;
          }
        }
        if (accessKey) {
          env[currentBlockKey] = accessKey;
        }
        currentBlockKey = null;
        blockLines.length = 0;
        continue;
      }
      blockLines.push(line);
      continue;
    }

    if (!line || line.startsWith('#')) continue;

    // Check block start (e.g. UNSPLASH_KEY_1 = {)
    if (line.includes('={') || line.includes('= {')) {
      const parts = line.split('=');
      currentBlockKey = parts[0].trim();
      blockLines.length = 0;
      continue;
    }

    // Standard KEY=VALUE
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }

  return env;
}

/**
 * Locates and loads the parent .env file reliably.
 */
export function loadParentEnv(explicitPath?: string): Record<string, string> {
  const candidatePaths = [
    explicitPath,
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../../../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env')
  ].filter((p): p is string => Boolean(p));

  let parsed: Record<string, string> = {};

  for (const envPath of candidatePaths) {
    try {
      if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
        const content = fs.readFileSync(envPath, 'utf8');
        parsed = parseEnvContent(content);
        break;
      }
    } catch {
      // Continue search
    }
  }

  // Overlay process.env overrides
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && v !== '') {
      parsed[k] = v;
    }
  }

  return parsed;
}

/**
 * Builds the strongly-typed EngineConfig from loaded environment.
 */
export function getEngineConfig(explicitEnvPath?: string): EngineConfig {
  const env = loadParentEnv(explicitEnvPath);

  const geminiKeys = [
    env.GEMINI_KEY_1,
    env.GEMINI_KEY_2,
    env.GEMINI_KEY_3,
    process.env.GEMINI_API_KEY
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));

  const pexelsKeys = [
    env.PEXELS_KEY_1,
    env.PEXELS_KEY_2,
    env.PEXELS_KEY_3,
    process.env.PEXELS_API_KEY
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));

  const pixabayKeys = [
    env.PIXABAY_KEY_1,
    env.PIXABAY_KEY_2,
    env.PIXABAY_KEY_3,
    process.env.PIXABAY_API_KEY
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));

  const unsplashKeys = [
    env.UNSPLASH_KEY_1,
    env.UNSPLASH_KEY_2,
    process.env.UNSPLASH_ACCESS_KEY
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));

  const port = parseInt(process.env.D8_PORT || env.D8_PORT || '5180', 10);
  const dataDir = process.env.D8_DATA_DIR || path.resolve(__dirname, '../../d8.7-data');

  return {
    geminiKeys,
    pexelsKeys,
    pixabayKeys,
    unsplashKeys,
    allowedModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
    defaultModel: 'gemini-3.5-flash-lite',
    fallbackModel: 'gemini-3.1-flash-lite',
    port: isNaN(port) ? 5180 : port,
    chromeBin: process.env.CHROME_BIN || env.CHROME_BIN,
    dataDir
  };
}

/**
 * Redacts secret keys from strings, URLs, or objects for safe logging.
 */
export function redactSecrets(text: string, knownKeys: string[] = []): string {
  let sanitized = text;
  for (const key of knownKeys) {
    if (key && key.length > 5) {
      sanitized = sanitized.replaceAll(key, '[REDACTED]');
    }
  }
  // Generic pattern redaction for bearer tokens / api keys
  sanitized = sanitized.replace(/(key=)[A-Za-z0-9_\-\.]{10,}/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{10,}/gi, '$1[REDACTED]');
  return sanitized;
}
