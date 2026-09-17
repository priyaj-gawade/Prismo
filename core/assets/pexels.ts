import fs from 'node:fs';
import path from 'node:path';
import type { Asset, AssetSearchQuery, AssetSearchResult, StockProviderAdapter } from '../contracts/assets.ts';

export class PexelsAdapter implements StockProviderAdapter {
  readonly provider = 'pexels' as const;
  private apiKeys: string[];
  private currentKeyIdx = 0;
  private consecutiveFailures = 0;
  private cooldownUntil = 0;

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys.filter((k) => k && k.trim().length > 0);
  }

  private getActiveKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No Pexels API keys configured in environment (PEXELS_KEY_1..3)');
    }
    const key = this.apiKeys[this.currentKeyIdx % this.apiKeys.length];
    return key;
  }

  private rotateKey(): void {
    if (this.apiKeys.length > 1) {
      this.currentKeyIdx = (this.currentKeyIdx + 1) % this.apiKeys.length;
    }
  }

  getHealth() {
    return {
      healthy: this.cooldownUntil <= Date.now() && this.apiKeys.length > 0,
      accountId: `pexels_account_${(this.currentKeyIdx % this.apiKeys.length) + 1}`,
      consecutiveFailures: this.consecutiveFailures,
      cooldownUntil: this.cooldownUntil
    };
  }

  async search(query: AssetSearchQuery): Promise<AssetSearchResult> {
    const limit = query.limit || 10;
    const orientationParam = query.orientation ? `&orientation=${query.orientation}` : '';
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query.query)}&per_page=${limit}${orientationParam}`;

    const maxAttempts = Math.max(1, this.apiKeys.length);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = this.getActiveKey();
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: apiKey
          }
        });

        if (response.status === 429) {
          this.consecutiveFailures += 1;
          this.rotateKey();
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Pexels API error [${response.status}]: ${errText}`);
        }

        const data = await response.json() as {
          total_results?: number;
          photos?: Array<{
            id: number;
            width: number;
            height: number;
            url: string;
            photographer: string;
            alt?: string;
            src: {
              original: string;
              large: string;
              medium: string;
              tiny: string;
            };
          }>;
        };

        this.consecutiveFailures = 0;
        this.cooldownUntil = 0;

        const assets: Asset[] = (data.photos || []).map((photo) => ({
          id: `pexels_${photo.id}`,
          provider: 'pexels',
          sourceUrl: photo.url,
          thumbnailUrl: photo.src.medium || photo.src.tiny,
          downloadUrl: photo.src.large || photo.src.original,
          width: photo.width,
          height: photo.height,
          author: photo.photographer,
          title: photo.alt || `Pexels Photo ${photo.id}`,
          attribution: `Photo by ${photo.photographer} on Pexels`,
          metadata: { pexelsId: photo.id }
        }));

        return {
          provider: 'pexels',
          query: query.query,
          total: data.total_results || assets.length,
          assets
        };
      } catch (err) {
        lastError = err;
        this.rotateKey();
      }
    }

    throw new Error(`Pexels search failed after attempting configured keys. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  async getAsset(id: string): Promise<Asset | null> {
    const rawId = id.replace('pexels_', '');
    const url = `https://api.pexels.com/v1/photos/${rawId}`;
    const apiKey = this.getActiveKey();

    const response = await fetch(url, {
      headers: { Authorization: apiKey }
    });

    if (!response.ok) return null;
    const photo = await response.json() as {
      id: number;
      width: number;
      height: number;
      url: string;
      photographer: string;
      alt?: string;
      src: { large: string; medium: string; original: string; tiny: string };
    };

    return {
      id: `pexels_${photo.id}`,
      provider: 'pexels',
      sourceUrl: photo.url,
      thumbnailUrl: photo.src.medium,
      downloadUrl: photo.src.large,
      width: photo.width,
      height: photo.height,
      author: photo.photographer,
      title: photo.alt || `Pexels Photo ${photo.id}`,
      attribution: `Photo by ${photo.photographer} on Pexels`,
      metadata: { pexelsId: photo.id }
    };
  }

  async downloadAsset(asset: Asset, destinationPathOrDir: string): Promise<string> {
    let filePath: string;
    if (/\.(jpg|jpeg|png|webp|svg)$/i.test(destinationPathOrDir)) {
      filePath = destinationPathOrDir;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    } else {
      fs.mkdirSync(destinationPathOrDir, { recursive: true });
      const ext = path.extname(new URL(asset.downloadUrl).pathname) || '.jpg';
      filePath = path.join(destinationPathOrDir, `${asset.id}${ext}`);
    }

    const response = await fetch(asset.downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Pexels asset: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    asset.localPath = filePath;
    return filePath;
  }
}
