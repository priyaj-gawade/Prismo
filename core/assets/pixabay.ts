import fs from 'node:fs';
import path from 'node:path';
import type { Asset, AssetSearchQuery, AssetSearchResult, StockProviderAdapter } from '../contracts/assets.ts';

export class PixabayAdapter implements StockProviderAdapter {
  readonly provider = 'pixabay' as const;
  private apiKeys: string[];
  private currentKeyIdx = 0;
  private consecutiveFailures = 0;
  private cooldownUntil = 0;

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys.filter((k) => k && k.trim().length > 0);
  }

  private getActiveKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No Pixabay API keys configured in environment (PIXABAY_KEY_1..3)');
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
      accountId: `pixabay_account_${(this.currentKeyIdx % this.apiKeys.length) + 1}`,
      consecutiveFailures: this.consecutiveFailures,
      cooldownUntil: this.cooldownUntil
    };
  }

  async search(query: AssetSearchQuery): Promise<AssetSearchResult> {
    const limit = Math.max(3, Math.min(query.limit || 10, 200));
    const orientationParam = query.orientation ? `&orientation=${query.orientation === 'square' ? 'all' : query.orientation}` : '';
    const maxAttempts = Math.max(1, this.apiKeys.length);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = this.getActiveKey();
      const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query.query)}&image_type=photo&per_page=${limit}${orientationParam}`;

      try {
        const response = await fetch(url);

        if (response.status === 429) {
          this.consecutiveFailures += 1;
          this.rotateKey();
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Pixabay API error [${response.status}]: ${errText}`);
        }

        const data = await response.json() as {
          total?: number;
          hits?: Array<{
            id: number;
            pageURL: string;
            type: string;
            tags: string;
            previewURL: string;
            webformatURL: string;
            largeImageURL: string;
            imageWidth: number;
            imageHeight: number;
            user: string;
          }>;
        };

        this.consecutiveFailures = 0;
        this.cooldownUntil = 0;

        const assets: Asset[] = (data.hits || []).map((hit) => ({
          id: `pixabay_${hit.id}`,
          provider: 'pixabay',
          sourceUrl: hit.pageURL,
          thumbnailUrl: hit.previewURL || hit.webformatURL,
          downloadUrl: hit.webformatURL || hit.largeImageURL,
          width: hit.imageWidth,
          height: hit.imageHeight,
          author: hit.user,
          title: hit.tags || `Pixabay Image ${hit.id}`,
          attribution: `Image by ${hit.user} from Pixabay`,
          metadata: { pixabayId: hit.id, tags: hit.tags }
        }));

        return {
          provider: 'pixabay',
          query: query.query,
          total: data.total || assets.length,
          assets
        };
      } catch (err) {
        lastError = err;
        this.rotateKey();
      }
    }

    throw new Error(`Pixabay search failed after attempting configured keys. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  async getAsset(id: string): Promise<Asset | null> {
    const rawId = id.replace('pixabay_', '');
    const apiKey = this.getActiveKey();
    const url = `https://pixabay.com/api/?key=${apiKey}&id=${rawId}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as { hits?: Array<{ id: number; pageURL: string; tags: string; webformatURL: string; largeImageURL: string; imageWidth: number; imageHeight: number; user: string }> };
    const hit = data.hits?.[0];
    if (!hit) return null;

    return {
      id: `pixabay_${hit.id}`,
      provider: 'pixabay',
      sourceUrl: hit.pageURL,
      thumbnailUrl: hit.webformatURL,
      downloadUrl: hit.largeImageURL || hit.webformatURL,
      width: hit.imageWidth,
      height: hit.imageHeight,
      author: hit.user,
      title: hit.tags || `Pixabay Image ${hit.id}`,
      attribution: `Image by ${hit.user} from Pixabay`,
      metadata: { pixabayId: hit.id }
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

    let response = await fetch(asset.downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://pixabay.com/'
      }
    });

    if (!response.ok && asset.thumbnailUrl && asset.thumbnailUrl !== asset.downloadUrl) {
      response = await fetch(asset.thumbnailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://pixabay.com/'
        }
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to download Pixabay asset: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    asset.localPath = filePath;
    return filePath;
  }
}
