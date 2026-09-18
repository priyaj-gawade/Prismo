/**
 * D8.7 Core — Framework-Neutral Public Engine Boundary
 * 
 * Exposes the stable public API surface for standalone use and host integration (e.g. Limo).
 * Internal implementation details (PosterEngine, WorkspaceManager, GeminiApiClient, etc.)
 * remain private.
 */

// 1. Primary Engine Facade & Configuration
export { StandaloneDesignEngine, type DesignEngineOptions } from './engine.ts';
export { getEngineConfig, type EngineConfig } from './config/env.ts';

// 2. Host Operation Contracts
export type {
  DesignEngine,
  GenerationInput,
  RefinementInput,
  GenerationResult,
  GenerationDiagnostics,
  ExportOptions,
  ExportResult,
  ProjectMetadata,
  ArtifactFile,
  FileChangeRecord,
  PreviewInfo,
  TargetType
} from './contracts/engine.ts';

// 3. Geometry & Aspect Ratio Contracts
export {
  CANONICAL_RATIO_REGISTRY,
  SUPPORTED_RATIOS,
  getCanonicalDimensions,
  getOrientationForRatio,
  isSupportedRatio,
  ProjectRatioCapability,
  type SupportedRatio,
  type RatioState,
  type CanonicalDimension,
  type RatioOrigin
} from './geometry/ratio.ts';

// 4. Extensible Agent Tool Seam
export {
  AgentToolRegistry,
  type AgentTool,
  type ToolExecutionResult,
  type ToolCall
} from './geometry/ratio_tools.ts';

// 5. Lightweight Model Provider Seam
export type {
  ModelProvider,
  ModelMessage,
  ModelGenerateOptions,
  ModelGenerateResult,
  ProviderExecutionDiagnostics
} from './contracts/models.ts';

