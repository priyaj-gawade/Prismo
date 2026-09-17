import fs from 'node:fs';
import path from 'node:path';
import type {
  ArtifactFile,
  DesignEngine,
  ExportOptions,
  ExportResult,
  GenerationInput,
  GenerationResult,
  PreviewInfo,
  ProjectMetadata,
  RefinementInput,
  TargetType
} from './contracts/engine.ts';
import { WorkspaceManager } from './workspace/workspace.ts';
import { VersioningEngine } from './workspace/versioning.ts';
import { GeminiProviderManager } from './providers/manager.ts';
import { AssetProviderManager } from './assets/manager.ts';
import { MarkdownMemoryStore } from './memory/store.ts';
import { SessionTracker } from './memory/session.ts';
import { PreviewServer } from './preview/server.ts';
import { HeadlessExporter } from './export/exporter.ts';
import { PosterEngine } from './generation/poster.ts';
import { DESIGN_PRESETS } from './design-system/presets.ts';
import { TokenGenerator } from './design-system/tokens.ts';
import { DesignSystemParser } from './design-system/parser.ts';

export interface DesignEngineOptions {
  dataDir?: string;
  previewPort?: number;
  geminiKeys: string[];
  pexelsKeys?: string[];
  pixabayKeys?: string[];
  unsplashKeys?: string[];
}

export class StandaloneDesignEngine implements DesignEngine {
  private dataDir: string;
  private workspaceManager: WorkspaceManager;
  private versioningEngine: VersioningEngine;
  private providerManager: GeminiProviderManager;
  private assetManager: AssetProviderManager;
  private memoryStore: MarkdownMemoryStore;
  private sessionTracker: SessionTracker;
  private previewServer: PreviewServer;
  private headlessExporter: HeadlessExporter;

  private posterEngine: PosterEngine;
  private previewPort: number = 5180;
  private isPreviewStarted = false;

  constructor(options: DesignEngineOptions) {
    this.dataDir = options.dataDir || path.resolve(process.cwd(), 'd8.7-data');
    this.previewPort = options.previewPort || 5180;

    this.workspaceManager = new WorkspaceManager(this.dataDir);
    this.versioningEngine = new VersioningEngine();

    this.providerManager = new GeminiProviderManager({
      apiKeys: options.geminiKeys
    });

    this.assetManager = new AssetProviderManager({
      pexelsKeys: options.pexelsKeys || [],
      pixabayKeys: options.pixabayKeys || [],
      unsplashKeys: options.unsplashKeys || [],
      localAssetsDir: path.join(this.dataDir, 'assets')
    });

    this.memoryStore = new MarkdownMemoryStore(path.join(this.dataDir, 'memory'));
    this.sessionTracker = new SessionTracker(this.dataDir);

    this.previewServer = new PreviewServer({
      port: this.previewPort,
      baseDir: path.join(this.dataDir, 'projects')
    });

    this.headlessExporter = new HeadlessExporter();

    const deps = {
      workspaceManager: this.workspaceManager,
      providerManager: this.providerManager,
      memoryStore: this.memoryStore,
      sessionTracker: this.sessionTracker
    };

    this.posterEngine = new PosterEngine(deps);
  }

  async createProject(
    nameOrOptions: string | { name?: string; title?: string; target?: TargetType; instructions?: string; preset?: string },
    target: TargetType = 'poster',
    instructions?: string,
    presetName: string = 'modern-dark'
  ): Promise<ProjectMetadata> {
    let projName: string;
    let projTarget: TargetType = target;
    let projInstructions: string | undefined = instructions;
    let projPreset: string = presetName;

    if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
      projName = nameOrOptions.name || nameOrOptions.title || 'Untitled Project';
      projTarget = nameOrOptions.target || 'poster';
      projInstructions = nameOrOptions.instructions;
      projPreset = nameOrOptions.preset || 'modern-dark';
    } else {
      projName = nameOrOptions || 'Untitled Project';
    }

    const meta = await this.workspaceManager.createProject(projName, projTarget, projInstructions);

    // Apply preset DESIGN.md and tokens.css
    const preset = DESIGN_PRESETS[projPreset] || DESIGN_PRESETS['modern-dark'];
    if (preset) {
      const parser = new DesignSystemParser();
      const tokenGen = new TokenGenerator();
      this.workspaceManager.writeFile(meta.id, 'DESIGN.md', parser.serialize(preset));
      this.workspaceManager.writeFile(meta.id, 'tokens.css', tokenGen.generateCss(preset));
    }

    return meta;
  }

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const project = await this.getProject(input.projectId);
    if (!project) throw new Error(`Project ${input.projectId} not found`);

    const result = await this.posterEngine.generate(input);
    this.previewServer.notifyReload();
    return result;
  }

  async refine(input: RefinementInput): Promise<GenerationResult> {
    const project = await this.getProject(input.projectId);
    if (!project) throw new Error(`Project ${input.projectId} not found`);

    const result = await this.posterEngine.refine(input);
    this.previewServer.notifyReload();
    return result;
  }

  async inspect(projectId: string): Promise<{ metadata: ProjectMetadata; files: ArtifactFile[]; versions: number }> {
    const metadata = await this.getProject(projectId);
    if (!metadata) throw new Error(`Project ${projectId} not found`);

    const files = await this.getArtifacts(projectId);
    const versions = await this.versioningEngine.listVersions(metadata.rootPath);

    return {
      metadata,
      files,
      versions: versions.length
    };
  }

  async preview(projectId: string): Promise<PreviewInfo> {
    if (!this.isPreviewStarted) {
      this.previewPort = await this.previewServer.start();
      this.isPreviewStarted = true;
    }

    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    return {
      url: `http://localhost:${this.previewPort}/${projectId}/index.html`,
      port: this.previewPort,
      entryFile: 'index.html',
      projectRoot: project.rootPath
    };
  }

  async export(projectId: string, options: ExportOptions): Promise<ExportResult> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    let width = options.width || 1080;
    let height = options.height || 1440;

    // Strict 3:4 poster dimension validation
    if (width * 4 !== height * 3) {
      throw new Error(
        `Export for poster must be strictly 3:4. Canonical target is 1080x1440. Received ${width}x${height}.`
      );
    }

    const format = options.format || 'png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    // Route to d8.7-data/exports/<projectId>/
    const projectExportDir = path.join(this.dataDir, 'exports', projectId);
    fs.mkdirSync(projectExportDir, { recursive: true });

    const entryFile = 'index.html';
    const outPath = options.outputPath || path.join(projectExportDir, `export_${Date.now()}.${ext}`);
    const targetFilePath = path.join(project.rootPath, entryFile);
    const targetUrl = (this.isPreviewStarted && this.previewPort)
      ? `http://localhost:${this.previewPort}/projects/${projectId}/${entryFile}`
      : targetFilePath;

    return this.headlessExporter.exportUrl(targetUrl, {
      ...options,
      width,
      height,
      format,
      outputPath: outPath
    });
  }

  async getProject(projectId: string): Promise<ProjectMetadata | null> {
    return this.workspaceManager.getProject(projectId);
  }

  async getArtifacts(projectId: string): Promise<ArtifactFile[]> {
    return this.workspaceManager.listFiles(projectId);
  }

  async rollback(projectId: string, version: number): Promise<ProjectMetadata> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    await this.versioningEngine.rollback(project.rootPath, version);
    const updated = this.workspaceManager.updateProjectMetadata(projectId, { version });
    this.previewServer.notifyReload();
    return updated;
  }

  async shutdown(): Promise<void> {
    if (this.isPreviewStarted) {
      await this.previewServer.stop();
      this.isPreviewStarted = false;
    }
  }

  getAssetManager(): AssetProviderManager {
    return this.assetManager;
  }

  getProviderDiagnostics() {
    return this.providerManager.getPoolDiagnostics();
  }

  getPosterTemplates() {
    return this.posterEngine.getTemplateRegistry().listTemplates();
  }

  applyPosterTemplate(projectId: string, templateId: string, overrides: Record<string, string> = {}): boolean {
    const success = this.posterEngine.applyTemplate(projectId, templateId, overrides);
    if (success) {
      this.previewServer.notifyReload();
    }
    return success;
  }
}
