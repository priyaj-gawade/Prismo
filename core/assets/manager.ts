import type { Asset, AssetSearchQuery, AssetSearchResult, AssetProviderType, StockProviderAdapter } from '../contracts/assets.ts';
import { PexelsAdapter } from './pexels.ts';
import { PixabayAdapter } from './pixabay.ts';
import { UnsplashAdapter } from './unsplash.ts';
import { LocalAssetAdapter } from './local.ts';

export interface AssetManagerConfig {
  pexelsKeys: string[];
  pixabayKeys: string[];
  unsplashKeys: string[];
  localAssetsDir?: string;
  preferredOrder?: AssetProviderType[];
}

export class AssetProviderManager {
  private adapters: Map<AssetProviderType, StockProviderAdapter> = new Map();
  private fallbackOrder: AssetProviderType[] = ['unsplash', 'pexels', 'pixabay', 'local'];

  constructor(config: AssetManagerConfig) {
    this.adapters.set('pexels', new PexelsAdapter(config.pexelsKeys));
    this.adapters.set('pixabay', new PixabayAdapter(config.pixabayKeys));
    this.adapters.set('unsplash', new UnsplashAdapter(config.unsplashKeys));
    this.adapters.set('local', new LocalAssetAdapter(config.localAssetsDir || './assets'));

    if (config.preferredOrder && config.preferredOrder.length > 0) {
      this.fallbackOrder = config.preferredOrder;
    }
  }

  setLocalAssetsDir(dir: string): void {
    const local = this.adapters.get('local') as LocalAssetAdapter;
    if (local) local.setAssetsDir(dir);
  }

  registerAdapter(adapter: StockProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
    if (!this.fallbackOrder.includes(adapter.provider)) {
      this.fallbackOrder.unshift(adapter.provider);
    }
  }

  getAdapter(provider: AssetProviderType): StockProviderAdapter | undefined {
    return this.adapters.get(provider);
  }

  getHealthSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {};
    for (const [name, adapter] of this.adapters.entries()) {
      summary[name] = adapter.getHealth();
    }
    return summary;
  }

  /**
   * Searches for assets using explicit provider or fallback chain.
   */
  async search(query: AssetSearchQuery, provider?: AssetProviderType): Promise<AssetSearchResult> {
    const providersToTry = provider ? [provider] : this.fallbackOrder;
    let lastError: unknown = null;

    for (const p of providersToTry) {
      const adapter = this.adapters.get(p);
      if (!adapter) continue;

      try {
        const result = await adapter.search(query);
        if (result.assets.length > 0) {
          return result;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[AssetManager] Provider '${p}' failed for query "${query.query}":`, err instanceof Error ? err.message : String(err));
      }
    }

    if (lastError && !provider) {
      console.warn('[AssetManager] All stock providers failed or returned 0 results.');
    }

    return {
      provider: provider || 'pexels',
      query: query.query,
      total: 0,
      assets: []
    };
  }

  /**
   * Downloads an asset to destination directory and returns local relative path.
   */
  async downloadAsset(asset: Asset, destinationDir: string): Promise<string> {
    const adapter = this.adapters.get(asset.provider);
    if (!adapter) {
      throw new Error(`No adapter found for asset provider: ${asset.provider}`);
    }
    return adapter.downloadAsset(asset, destinationDir);
  }
}
