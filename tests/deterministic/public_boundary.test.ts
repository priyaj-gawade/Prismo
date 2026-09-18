import assert from 'node:assert';
import * as PublicAPI from '../../core/index.ts';

export async function runPublicBoundaryTest() {
  console.log('--- Testing Public Engine Boundary & Information Hiding ---');

  // 1. Verify intended public API surface is fully available
  assert.strictEqual(typeof PublicAPI.StandaloneDesignEngine, 'function', 'StandaloneDesignEngine must be exported');
  assert.strictEqual(typeof PublicAPI.getEngineConfig, 'function', 'getEngineConfig must be exported');
  assert.strictEqual(typeof PublicAPI.AgentToolRegistry, 'function', 'AgentToolRegistry must be exported');
  assert.strictEqual(typeof PublicAPI.ProjectRatioCapability, 'function', 'ProjectRatioCapability must be exported');
  assert.strictEqual(typeof PublicAPI.getCanonicalDimensions, 'function', 'getCanonicalDimensions must be exported');
  assert.strictEqual(typeof PublicAPI.getOrientationForRatio, 'function', 'getOrientationForRatio must be exported');
  assert.strictEqual(typeof PublicAPI.isSupportedRatio, 'function', 'isSupportedRatio must be exported');
  assert.ok(Array.isArray(PublicAPI.SUPPORTED_RATIOS), 'SUPPORTED_RATIOS must be an array');
  assert.strictEqual(PublicAPI.SUPPORTED_RATIOS.length, 5, 'SUPPORTED_RATIOS must contain exactly 5 canonical ratios');
  assert.ok(PublicAPI.CANONICAL_RATIO_REGISTRY, 'CANONICAL_RATIO_REGISTRY must be exported');

  // 2. Verify private implementation details are strictly HIDDEN
  const privateSymbols = [
    'PosterEngine',
    'WorkspaceManager',
    'VersioningEngine',
    'GeminiProviderManager',
    'GeminiApiClient',
    'MarkdownMemoryStore',
    'SessionTracker',
    'PreviewServer',
    'HeadlessExporter',
    'PromptComposer',
    'SkillRegistry',
    'PosterTemplateRegistry'
  ];

  for (const sym of privateSymbols) {
    assert.strictEqual(
      (PublicAPI as Record<string, unknown>)[sym],
      undefined,
      `Private implementation class "${sym}" must NOT leak through the public entrypoint core/index.ts`
    );
  }

  // 3. Verify D8.7 remains framework-neutral and does not export host-specific adapter symbols
  const hostSpecificSymbols = [
    'LimoDesignEngineRequest',
    'LimoDesignEngineResponse',
    'LimoStreamEvent',
    'LimoStreamEventType',
    'LimoDesignEngineAdapter'
  ];

  for (const sym of hostSpecificSymbols) {
    assert.strictEqual(
      (PublicAPI as Record<string, unknown>)[sym],
      undefined,
      `Host-specific contract "${sym}" must NOT be exported by core/index.ts (host adapts D8.7, not vice-versa)`
    );
  }

  console.log('  [PASS] Public entrypoint exports only approved D8.7-native contracts and keeps internals/host-adapters decoupled');
}

if (process.argv[1]?.endsWith('public_boundary.test.ts')) {
  runPublicBoundaryTest().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
