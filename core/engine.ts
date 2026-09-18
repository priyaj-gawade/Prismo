import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
import type { ModelProvider } from './contracts/models.ts';
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
import { ProjectRatioCapability, getCanonicalDimensions, type SupportedRatio, type RatioState } from './geometry/ratio.ts';
import { ArtifactValidator } from './validation/validator.ts';
import { RatioPrecedenceCoordinator, RatioToolDispatcher } from './geometry/ratio_tools.ts';

export interface DesignEngineOptions {
  dataDir?: string;
  previewPort?: number;
  geminiKeys: string[];
  pexelsKeys?: string[];
  pixabayKeys?: string[];
  unsplashKeys?: string[];
  enablePreviewServer?: boolean;
  autoExportPng?: boolean;
  modelProvider?: ModelProvider;
}

export class StandaloneDesignEngine implements DesignEngine {
  private dataDir: string;
  private workspaceManager: WorkspaceManager;
  private versioningEngine: VersioningEngine;
  private providerManager: ModelProvider;
  private assetManager: AssetProviderManager;
  private memoryStore: MarkdownMemoryStore;
  private sessionTracker: SessionTracker;
  private previewServer: PreviewServer | null = null;
  private headlessExporter: HeadlessExporter;

  private posterEngine: PosterEngine;
  private previewPort: number = 5180;
  private isPreviewStarted = false;
  private enablePreviewServer: boolean;
  private autoExportPng: boolean;

  private ratioCapability: ProjectRatioCapability;
  private precedenceCoordinator: RatioPrecedenceCoordinator;
  private ratioToolDispatcher: RatioToolDispatcher;
  private validator = new ArtifactValidator();

  constructor(options: DesignEngineOptions) {
    this.dataDir = options.dataDir || path.resolve(process.cwd(), 'd8.7-data');
    this.previewPort = options.previewPort || 5180;
    this.enablePreviewServer = options.enablePreviewServer ?? false;
    this.autoExportPng = options.autoExportPng ?? true;

    this.workspaceManager = new WorkspaceManager(this.dataDir);
    this.versioningEngine = new VersioningEngine();

    this.providerManager = options.modelProvider || new GeminiProviderManager({
      apiKeys: options.geminiKeys
    });

    this.assetManager = new AssetProviderManager({
      pexelsKeys: options.pexelsKeys || [],
      pixabayKeys: options.pixabayKeys || [],
      unsplashKeys: options.unsplashKeys || [],
      preferredOrder: ['unsplash', 'pexels', 'pixabay', 'local'],
      localAssetsDir: path.join(this.dataDir, 'assets')
    });

    this.memoryStore = new MarkdownMemoryStore(path.join(this.dataDir, 'memory'));
    this.sessionTracker = new SessionTracker(this.dataDir);

    if (this.enablePreviewServer) {
      this.previewServer = new PreviewServer({
        port: this.previewPort,
        baseDir: path.join(this.dataDir, 'projects')
      });
    }

    this.headlessExporter = new HeadlessExporter();

    this.ratioCapability = new ProjectRatioCapability();
    this.precedenceCoordinator = new RatioPrecedenceCoordinator(this.ratioCapability);
    this.ratioToolDispatcher = new RatioToolDispatcher(this.ratioCapability);

    const deps = {
      workspaceManager: this.workspaceManager,
      providerManager: this.providerManager,
      assetManager: this.assetManager,
      memoryStore: this.memoryStore,
      sessionTracker: this.sessionTracker,
      ratioCapability: this.ratioCapability,
      ratioToolDispatcher: this.ratioToolDispatcher,
      toolRegistry: this.ratioToolDispatcher.getRegistry(),
      precedenceCoordinator: this.precedenceCoordinator
    };

    this.posterEngine = new PosterEngine(deps);
  }

  getRatioCapability(): ProjectRatioCapability {
    return this.ratioCapability;
  }

  getPrecedenceCoordinator(): RatioPrecedenceCoordinator {
    return this.precedenceCoordinator;
  }

  getRatioToolDispatcher(): RatioToolDispatcher {
    return this.ratioToolDispatcher;
  }

  getWorkspaceManager(): WorkspaceManager {
    return this.workspaceManager;
  }

  setProjectRatio(
    projectId: string,
    ratio: SupportedRatio,
    origin: 'explicit_user' | 'agent_decision' | 'default' = 'explicit_user'
  ): RatioState {
    const state = this.ratioCapability.setProjectRatio(projectId, ratio, origin);
    this.workspaceManager.updateProjectMetadata(projectId, { ratioState: state });
    return state;
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

    if (project.ratioState) {
      this.ratioCapability.hydrateProjectRatio(input.projectId, project.ratioState);
    }

    // Ratio Precedence Evaluation (Explicit User > Agent Decision > Default)
    const evalRes = this.precedenceCoordinator.evaluateTurn(input.projectId, input.prompt);
    if (evalRes.unsupportedError) {
      throw new Error(evalRes.unsupportedError);
    }

    input.ratioState = evalRes.activeRatioState;
    input.ratio = evalRes.activeRatioState.ratio;
    this.workspaceManager.updateProjectMetadata(input.projectId, { ratioState: evalRes.activeRatioState });

    const result = await this.posterEngine.generate(input);
    if (this.previewServer) {
      this.previewServer.notifyReload();
    }

    // Automatically render and save canonical output.png directly inside project.rootPath
    if (this.autoExportPng) {
      try {
        const activeRatio = result.ratioState?.ratio || '3:4';
        const canonical = getCanonicalDimensions(activeRatio);
        const projectPngPath = path.join(project.rootPath, 'output.png');
        const targetFilePath = path.join(project.rootPath, 'index.html');
        await this.headlessExporter.exportUrl(targetFilePath, {
          width: canonical.width,
          height: canonical.height,
          format: 'png',
          outputPath: projectPngPath,
          signal: input.signal
        });
      } catch (exportErr: any) {
        console.warn(`[Engine] Auto-export to ${project.rootPath} failed:`, exportErr?.message || exportErr);
      }
    }

    return result;
  }

  async refine(input: RefinementInput): Promise<GenerationResult> {
    const project = await this.getProject(input.projectId);
    if (!project) throw new Error(`Project ${input.projectId} not found`);

    if (project.ratioState) {
      this.ratioCapability.hydrateProjectRatio(input.projectId, project.ratioState);
    }

    const result = await this.posterEngine.refine(input);
    if (this.previewServer) {
      this.previewServer.notifyReload();
    }

    // Update canonical output.png in project.rootPath after refinement
    if (this.autoExportPng) {
      try {
        const activeRatio = result.ratioState?.ratio || '3:4';
        const canonical = getCanonicalDimensions(activeRatio);
        const projectPngPath = path.join(project.rootPath, 'output.png');
        const targetFilePath = path.join(project.rootPath, 'index.html');
        await this.headlessExporter.exportUrl(targetFilePath, {
          width: canonical.width,
          height: canonical.height,
          format: 'png',
          outputPath: projectPngPath,
          signal: input.signal
        });
      } catch (exportErr: any) {
        console.warn(`[Engine] Auto-export to ${project.rootPath} failed:`, exportErr?.message || exportErr);
      }
    }

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
    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    if (this.enablePreviewServer && this.previewServer) {
      if (!this.isPreviewStarted) {
        this.previewPort = await this.previewServer.start();
        this.isPreviewStarted = true;
      }

      return {
        url: `http://localhost:${this.previewPort}/${projectId}/index.html`,
        port: this.previewPort,
        entryFile: 'index.html',
        projectRoot: project.rootPath
      };
    }

    return {
      url: pathToFileURL(path.join(project.rootPath, 'index.html')).href,
      port: 0,
      entryFile: 'index.html',
      projectRoot: project.rootPath
    };
  }

  async export(projectId: string, options: ExportOptions): Promise<ExportResult> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const activeRatio: SupportedRatio = options.ratio || project.ratioState?.ratio || '3:4';
    const canonical = getCanonicalDimensions(activeRatio);
    let width = options.width || canonical.width;
    let height = options.height || canonical.height;

    // Validate dimensions against the project's canonical ratio contracts
    const validation = this.validator.validatePosterDimensions(width, height, activeRatio);
    if (!validation.valid) {
      throw new Error(
        `Export dimension mismatch: project "${projectId}" is ${activeRatio} (${canonical.width}x${canonical.height}). Received ${width}x${height}: ${validation.error}`
      );
    }

    const format = options.format || 'png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    // Route to d8.7-data/exports/<projectId>/
    const projectExportDir = path.join(this.dataDir, 'exports', projectId);
    fs.mkdirSync(projectExportDir, { recursive: true });

    const entryFile = 'index.html';
    const defaultExportPath = path.join(projectExportDir, `export-${Date.now()}.${ext}`);
    const projectFolderOutPath = path.join(project.rootPath, `output.${ext}`);
    const outPath = options.outputPath || defaultExportPath;
    const targetFilePath = path.join(project.rootPath, entryFile);
    const targetUrl = (this.isPreviewStarted && this.previewPort)
      ? `http://localhost:${this.previewPort}/projects/${projectId}/${entryFile}`
      : targetFilePath;

    const exportResult = await this.headlessExporter.exportUrl(targetUrl, {
      ...options,
      width,
      height,
      format,
      outputPath: outPath
    });

    // Ensure output.png / output.jpg is always preserved directly inside project.rootPath
    if (outPath !== projectFolderOutPath && fs.existsSync(outPath)) {
      fs.copyFileSync(outPath, projectFolderOutPath);
    }

    return exportResult;
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
    if (this.previewServer) {
      this.previewServer.notifyReload();
    }
    return updated;
  }

  async shutdown(): Promise<void> {
    if (this.isPreviewStarted && this.previewServer) {
      await this.previewServer.stop();
      this.isPreviewStarted = false;
    }
  }

  getAssetManager(): AssetProviderManager {
    return this.assetManager;
  }

  getProviderDiagnostics() {
    return (this.providerManager as any).getPoolDiagnostics?.() || [];
  }

  getPosterTemplates() {
    return this.posterEngine.getTemplateRegistry().listTemplates();
  }

  applyPosterTemplate(projectId: string, templateId: string, overrides: Record<string, string> = {}): boolean {
    const success = this.posterEngine.applyTemplate(projectId, templateId, overrides);
    if (success && this.previewServer) {
      this.previewServer.notifyReload();
    }
    return success;
  }
}
