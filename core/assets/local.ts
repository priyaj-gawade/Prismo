import fs from 'node:fs';
import path from 'node:path';
import type { Asset, AssetSearchQuery, AssetSearchResult, StockProviderAdapter } from '../contracts/assets.ts';

export class LocalAssetAdapter implements StockProviderAdapter {
  readonly provider = 'local' as const;
  private assetsDir: string;

  constructor(assetsDir: string) {
    this.assetsDir = assetsDir;
    fs.mkdirSync(this.assetsDir, { recursive: true });
  }

  setAssetsDir(dir: string): void {
    this.assetsDir = dir;
    fs.mkdirSync(this.assetsDir, { recursive: true });
  }

  getHealth() {
    return {
      healthy: true,
      accountId: 'local_storage',
      consecutiveFailures: 0,
      cooldownUntil: 0
    };
  }

  async search(query: AssetSearchQuery): Promise<AssetSearchResult> {
    if (!fs.existsSync(this.assetsDir)) {
      return { provider: 'local', query: query.query, total: 0, assets: [] };
    }

    const files = fs.readdirSync(this.assetsDir, { withFileTypes: true });
    const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);
    const q = query.query.toLowerCase();

    const matched = files.filter((f) => {
      if (!f.isFile()) return false;
      const ext = path.extname(f.name).toLowerCase();
      if (!imageExts.has(ext)) return false;
      if (!q || q === '*' || f.name.toLowerCase().includes(q)) return true;
      return true; // Return all available local assets if specific match not found
    });

    const assets: Asset[] = matched.map((f) => {
      const fullPath = path.join(this.assetsDir, f.name);
      const stat = fs.statSync(fullPath);
      return {
        id: `local_${f.name}`,
        provider: 'local',
        sourceUrl: `assets/${f.name}`,
        thumbnailUrl: `assets/${f.name}`,
        downloadUrl: `assets/${f.name}`,
        localPath: fullPath,
        width: 1200, // standard default for local unmeasured assets
        height: 800,
        author: 'Local Workspace',
        title: f.name,
        attribution: 'Local asset',
        metadata: { fileSize: stat.size, fileName: f.name }
      };
    });

    return {
      provider: 'local',
      query: query.query,
      total: assets.length,
      assets: assets.slice(0, query.limit || 20)
    };
  }

  async getAsset(id: string): Promise<Asset | null> {
    const fileName = id.replace('local_', '');
    const fullPath = path.join(this.assetsDir, fileName);
    if (!fs.existsSync(fullPath)) return null;

    const stat = fs.statSync(fullPath);
    return {
      id,
      provider: 'local',
      sourceUrl: `assets/${fileName}`,
      thumbnailUrl: `assets/${fileName}`,
      downloadUrl: `assets/${fileName}`,
      localPath: fullPath,
      width: 1200,
      height: 800,
      author: 'Local Workspace',
      title: fileName,
      attribution: 'Local asset',
      metadata: { fileSize: stat.size, fileName }
    };
  }

  async downloadAsset(asset: Asset, destinationDir: string): Promise<string> {
    const fileName = path.basename(asset.localPath || asset.title);
    const targetPath = path.join(destinationDir, fileName);
    if (asset.localPath && asset.localPath !== targetPath) {
      fs.copyFileSync(asset.localPath, targetPath);
    }
    return targetPath;
  }
}
