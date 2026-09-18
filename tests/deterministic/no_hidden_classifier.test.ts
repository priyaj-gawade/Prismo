import assert from 'node:assert';
import { ProjectRatioCapability } from '../../core/geometry/ratio.ts';
import { RatioPrecedenceCoordinator, isGeometryAdaptationRequest } from '../../core/geometry/ratio_tools.ts';

export async function runNoHiddenClassifierTest(): Promise<void> {
  console.log('\n----------------------------------------------------');
  console.log('  TEST SUITE: NO HIDDEN CLASSIFIER GATE               ');
  console.log('----------------------------------------------------');

  const capability = new ProjectRatioCapability();
  const coordinator = new RatioPrecedenceCoordinator(capability);

  // Set up an established project with an agent-decided ratio of 3:4
  const projectId = 'proj-anti-classifier-test';
  capability.setProjectRatio(projectId, '3:4', 'agent_decision');

  // Test 1: "Make this suitable for Instagram" triggers relevance gate only, never deterministically selects 1:1 or any ratio
  {
    const prompt = 'Make this suitable for Instagram';
    assert.strictEqual(isGeometryAdaptationRequest(prompt), true, 'Instagram prompt must be recognized as geometry adaptation');

    const result = coordinator.evaluateTurn(projectId, prompt);
    assert.strictEqual(result.explicitFound, false, 'Instagram is not an explicit canonical ratio syntax');
    assert.strictEqual(result.shouldRunAgentRatioTool, true, 'Relevance gate must be open for agent');
    assert.strictEqual(result.isAdaptationTurn, true, 'Must be marked as an adaptation turn');
    assert.strictEqual(result.activeRatioState.ratio, '3:4', 'Ratio must remain UNCHANGED by code (no 1:1 coercion)');
    assert.strictEqual(result.activeRatioState.origin, 'agent_decision', 'Origin must remain agent_decision');
    console.log('  [PASS] Test 1: "Make this suitable for Instagram" triggers relevance gate with ratio unchanged');
  }

  // Test 2: "make this for Instagram" variant also triggers relevance gate only
  {
    const prompt = 'make this for Instagram';
    assert.strictEqual(isGeometryAdaptationRequest(prompt), true, '"make this for Instagram" must be recognized as geometry adaptation');

    const result = coordinator.evaluateTurn(projectId, prompt);
    assert.strictEqual(result.explicitFound, false);
    assert.strictEqual(result.shouldRunAgentRatioTool, true);
    assert.strictEqual(result.activeRatioState.ratio, '3:4', 'Ratio must NOT become 1:1 in code');
    console.log('  [PASS] Test 2: "make this for Instagram" opens tool gate without code-selecting ratio');
  }

  // Test 3: "Make this suitable for mobile" triggers relevance gate only, never deterministically selects 9:16
  {
    const prompt = 'Make this suitable for mobile';
    assert.strictEqual(isGeometryAdaptationRequest(prompt), true, 'Mobile prompt must trigger adaptation check');

    const result = coordinator.evaluateTurn(projectId, prompt);
    assert.strictEqual(result.explicitFound, false);
    assert.strictEqual(result.shouldRunAgentRatioTool, true);
    assert.strictEqual(result.activeRatioState.ratio, '3:4', 'Ratio must NOT become 9:16 in code');
    console.log('  [PASS] Test 3: "Make this suitable for mobile" triggers relevance gate with ratio unchanged');
  }

  // Test 4: "Make this suitable for a presentation slide" triggers relevance gate only, never deterministically selects 16:9
  {
    const prompt = 'Make this suitable for a presentation slide';
    assert.strictEqual(isGeometryAdaptationRequest(prompt), true, 'Presentation slide prompt must trigger adaptation check');

    const result = coordinator.evaluateTurn(projectId, prompt);
    assert.strictEqual(result.explicitFound, false);
    assert.strictEqual(result.shouldRunAgentRatioTool, true);
    assert.strictEqual(result.activeRatioState.ratio, '3:4', 'Ratio must NOT become 16:9 in code');
    console.log('  [PASS] Test 4: "Make this suitable for a presentation slide" triggers relevance gate with ratio unchanged');
  }

  // Test 5: Content refinement preserves ratio state and suppresses ratio tool loop
  {
    const prompt = 'Change the headline to Autonomous Robotics in Deep Space';
    assert.strictEqual(isGeometryAdaptationRequest(prompt), false, 'Headline change is not a geometry adaptation');

    const result = coordinator.evaluateTurn(projectId, prompt);
    assert.strictEqual(result.explicitFound, false);
    assert.strictEqual(result.shouldRunAgentRatioTool, false, 'Ratio tool loop must NOT run for content refinement');
    assert.strictEqual(result.activeRatioState.ratio, '3:4', 'Ratio must remain stable');
    console.log('  [PASS] Test 5: Standard content refinement preserves ratio without running tool loop');
  }

  // Test 6: Explicit ratio always overrides with highest authority
  {
    const prompt = 'Make it 16:9 for widescreen display';
    const result = coordinator.evaluateTurn(projectId, prompt);
    assert.strictEqual(result.explicitFound, true);
    assert.strictEqual(result.shouldRunAgentRatioTool, false);
    assert.strictEqual(result.activeRatioState.ratio, '16:9');
    assert.strictEqual(result.activeRatioState.origin, 'explicit_user');
    assert.strictEqual(result.activeRatioState.locked, true);
    console.log('  [PASS] Test 6: Explicit user ratio locks project to 16:9 with highest authority');
  }

  console.log('\n[ALL NO-HIDDEN-CLASSIFIER TESTS PASSED]\n');
}

// Direct execution support
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('no_hidden_classifier.test')) {
  runNoHiddenClassifierTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
