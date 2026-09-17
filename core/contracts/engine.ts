/**
 * Primary Design and Website Engine Contracts.
 */

import type { Asset } from './assets.ts';

export type TargetType = 'poster';

export interface ProjectMetadata {
  id: string;
  name: string;
  target: TargetType;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
  designSystemId?: string;
  instructions?: string;
  version: number;
}

export interface ArtifactFile {
  path: string;
  size: number;
  content?: string;
  mimeType?: string;
}

export interface FileChangeRecord {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  previousSize?: number;
  newSize?: number;
}

export interface GenerationInput {
  projectId: string;
  conversationId: string;
  prompt: string;
  designSystemId?: string;
  skillName?: string;
  attachments?: string[];
  dimensions?: { width: number; height: number };
}

export interface RefinementInput {
  projectId: string;
  conversationId: string;
  instruction: string;
  targetElementId?: string; // e.g. "hero" or "pricing-table" from data-od-id
  preserveSections?: string[];
}

export interface GenerationResult {
  runId: string;
  projectId: string;
  target: TargetType;
  status: 'succeeded' | 'failed';
  changedFiles: FileChangeRecord[];
  allFiles: string[];
  entryHtmlFile: string;
  previewUrl: string;
  diagnostics: {
    model: string;
    accountId: string;
    durationMs: number;
    fallbackOccurred: boolean;
    stockProvidersUsed: string[];
  };
  error?: string;
}

export interface ExportOptions {
  format: 'png' | 'jpeg';
  width?: number;
  height?: number;
  slideIndex?: number;
  outputPath?: string;
}

export interface ExportResult {
  filePath: string;
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  fileSize: number;
  durationMs: number;
}

export interface PreviewInfo {
  url: string;
  port: number;
  entryFile: string;
  projectRoot: string;
}

export interface DesignEngine {
  createProject(name: string, target: TargetType, instructions?: string): Promise<ProjectMetadata>;
  generate(input: GenerationInput): Promise<GenerationResult>;
  refine(input: RefinementInput): Promise<GenerationResult>;
  inspect(projectId: string): Promise<{ metadata: ProjectMetadata; files: ArtifactFile[]; versions: number }>;
  preview(projectId: string): Promise<PreviewInfo>;
  export(projectId: string, options: ExportOptions): Promise<ExportResult>;
  getProject(projectId: string): Promise<ProjectMetadata | null>;
  getArtifacts(projectId: string): Promise<ArtifactFile[]>;
  rollback(projectId: string, version: number): Promise<ProjectMetadata>;
}
