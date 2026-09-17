import fs from 'node:fs';
import path from 'node:path';
import type { Asset, AssetSearchQuery, AssetSearchResult, StockProviderAdapter } from '../contracts/assets.ts';

export class UnsplashAdapter implements StockProviderAdapter {
  readonly provider = 'unsplash' as const;
  private apiKeys: string[];
  private currentKeyIdx = 0;
  private consecutiveFailures = 0;
  private cooldownUntil = 0;

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys.filter((k) => k && k.trim().length > 0);
  }

  private getActiveKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No Unsplash API keys configured in environment (UNSPLASH_KEY_1..2)');
    }
    return this.apiKeys[this.currentKeyIdx % this.apiKeys.length];
  }

  private rotateKey(): void {
    if (this.apiKeys.length > 1) {
      this.currentKeyIdx = (this.currentKeyIdx + 1) % this.apiKeys.length;
    }
  }

  getHealth() {
    return {
      healthy: this.cooldownUntil <= Date.now() && this.apiKeys.length > 0,
      accountId: `unsplash_account_${(this.currentKeyIdx % this.apiKeys.length) + 1}`,
      consecutiveFailures: this.consecutiveFailures,
      cooldownUntil: this.cooldownUntil
    };
  }

  async search(query: AssetSearchQuery): Promise<AssetSearchResult> {
    if (this.apiKeys.length === 0) {
      throw new Error('Unsplash provider unavailable: No Unsplash API keys configured in environment (UNSPLASH_KEY_1..2)');
    }

    const limit = query.limit || 10;
    const orientationParam = query.orientation ? `&orientation=${query.orientation === 'square' ? 'squarish' : query.orientation}` : '';
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query.query)}&per_page=${limit}${orientationParam}`;

    const maxAttempts = Math.max(1, this.apiKeys.length);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = this.getActiveKey();
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Client-ID ${apiKey}`
          }
        });

        if (response.status === 429) {
          this.consecutiveFailures += 1;
          this.rotateKey();
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Unsplash API error [${response.status}]: ${errText}`);
        }

        const data = await response.json() as {
          total?: number;
          results?: Array<{
            id: string;
            width: number;
            height: number;
            description?: string;
            alt_description?: string;
            urls: {
              raw: string;
              full: string;
              regular: string;
              small: string;
              thumb: string;
            };
            links: {
              html: string;
            };
            user: {
              name: string;
              username: string;
            };
          }>;
        };

        this.consecutiveFailures = 0;
        this.cooldownUntil = 0;

        const assets: Asset[] = (data.results || []).map((item) => ({
          id: `unsplash_${item.id}`,
          provider: 'unsplash',
          sourceUrl: item.links.html,
          thumbnailUrl: item.urls.small || item.urls.thumb,
          downloadUrl: item.urls.regular || item.urls.full,
          width: item.width,
          height: item.height,
          author: item.user.name || item.user.username,
          title: item.alt_description || item.description || `Unsplash Photo ${item.id}`,
          attribution: `Photo by ${item.user.name} on Unsplash`,
          metadata: { unsplashId: item.id }
        }));

        return {
          provider: 'unsplash',
          query: query.query,
          total: data.total || assets.length,
          assets
        };
      } catch (err) {
        lastError = err;
        this.rotateKey();
      }
    }

    throw new Error(`Unsplash search failed after attempting configured keys. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  async getAsset(id: string): Promise<Asset | null> {
    const rawId = id.replace('unsplash_', '');
    const apiKey = this.getActiveKey();
    const url = `https://api.unsplash.com/photos/${rawId}`;

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${apiKey}` }
    });

    if (!response.ok) return null;
    const item = await response.json() as {
      id: string;
      width: number;
      height: number;
      description?: string;
      alt_description?: string;
      urls: { regular: string; small: string };
      links: { html: string };
      user: { name: string; username: string };
    };

    return {
      id: `unsplash_${item.id}`,
      provider: 'unsplash',
      sourceUrl: item.links.html,
      thumbnailUrl: item.urls.small,
      downloadUrl: item.urls.regular,
      width: item.width,
      height: item.height,
      author: item.user.name || item.user.username,
      title: item.alt_description || item.description || `Unsplash Photo ${item.id}`,
      attribution: `Photo by ${item.user.name} on Unsplash`,
      metadata: { unsplashId: item.id }
    };
  }

  async downloadAsset(asset: Asset, destinationPathOrDir: string): Promise<string> {
    let filePath: string;
    if (/\.(jpg|jpeg|png|webp|svg)$/i.test(destinationPathOrDir)) {
      filePath = destinationPathOrDir;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    } else {
      fs.mkdirSync(destinationPathOrDir, { recursive: true });
      filePath = path.join(destinationPathOrDir, `${asset.id}.jpg`);
    }

    const response = await fetch(asset.downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Unsplash asset: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    asset.localPath = filePath;
    return filePath;
  }
}
