/**
 * Unified Stock and Local Asset Contracts.
 */

export type AssetProviderType = 'pexels' | 'pixabay' | 'unsplash' | 'local';

export interface Asset {
  id: string;
  provider: AssetProviderType;
  sourceUrl: string;
  thumbnailUrl: string;
  downloadUrl: string;
  localPath?: string;
  width: number;
  height: number;
  author: string;
  title: string;
  attribution: string;
  metadata: Record<string, unknown>;
}

export interface AssetSearchQuery {
  query: string;
  limit?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  minWidth?: number;
  minHeight?: number;
}

export interface AssetSearchResult {
  provider: AssetProviderType;
  query: string;
  total: number;
  assets: Asset[];
}

export interface StockProviderAdapter {
  readonly provider: AssetProviderType;
  search(query: AssetSearchQuery): Promise<AssetSearchResult>;
  getAsset(id: string): Promise<Asset | null>;
  downloadAsset(asset: Asset, destinationDir: string): Promise<string>;
  getHealth(): { healthy: boolean; accountId: string; consecutiveFailures: number; cooldownUntil: number };
}
