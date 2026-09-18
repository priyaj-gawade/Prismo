import assert from 'node:assert';
import { ProjectRatioCapability } from '../../core/geometry/ratio.ts';
import {
  RATIO_FUNCTION_DECLARATIONS,
  RatioToolDispatcher,
  RatioPrecedenceCoordinator
} from '../../core/geometry/ratio_tools.ts';

export async function runRatioCapabilityTest(): Promise<void> {
  console.log('\n----------------------------------------------------');
  console.log('  TEST SUITE: AGENT RATIO CAPABILITY & TOOLS (PHASE 2)');
  console.log('----------------------------------------------------');

  // Test 1: Tool Schema Validity & Runtime-Bound Project Scope
  {
    assert.strictEqual(RATIO_FUNCTION_DECLARATIONS.length, 3, 'Must declare exactly 3 ratio tools');

    const toolNames = RATIO_FUNCTION_DECLARATIONS.map((d) => d.name);
    assert.deepStrictEqual(
      toolNames,
      ['get_supported_ratios', 'get_current_ratio', 'set_ratio'],
      'Tool declarations must match expected names'
    );

    const setRatioDecl = RATIO_FUNCTION_DECLARATIONS.find((d) => d.name === 'set_ratio')!;
    const ratioProp = (setRatioDecl.parameters.properties as any).ratio;
    assert(ratioProp, 'set_ratio must have a ratio parameter');
    assert.deepStrictEqual(
      ratioProp.enum,
      ['3:4', '9:16', '16:9', '1:1', '4:3'],
      'set_ratio enum must be strictly restricted to the 5 canonical ratios'
    );

    // CRITICAL: projectId must NOT be present in tool parameter schemas (runtime-bound!)
    for (const decl of RATIO_FUNCTION_DECLARATIONS) {
      assert.strictEqual(
        'projectId' in decl.parameters.properties,
        false,
        `Tool "${decl.name}" must not expose projectId to the model (runtime-bound invariant)`
      );
    }

    console.log('  [PASS] Test 1: Tool Schema Validity & Runtime-Bound Project Scope verified');
  }

  // Test 2: Supported-Ratio Enumeration via Dispatcher
  {
    const capability = new ProjectRatioCapability();
    const dispatcher = new RatioToolDispatcher(capability);

    const res = dispatcher.executeTool('proj_dummy', { name: 'get_supported_ratios', args: {} });
    assert.strictEqual(res.success, true);
    const data = res.data as { supportedRatios: Array<{ ratio: string; dimensions: { width: number; height: number }; commonUseCases: string[] }> };
    assert(data && Array.isArray(data.supportedRatios));
    assert.strictEqual(data.supportedRatios.length, 5);

    const ratios = data.supportedRatios.map((r) => r.ratio);
    assert.deepStrictEqual(ratios, ['3:4', '9:16', '16:9', '1:1', '4:3']);
    for (const r of data.supportedRatios) {
      assert(r.dimensions.width > 0 && r.dimensions.height > 0);
      assert(Array.isArray(r.commonUseCases) && r.commonUseCases.length > 0);
    }

    console.log('  [PASS] Test 2: Supported-Ratio Enumeration via Dispatcher verified');
  }

  // Test 3: Valid & Invalid Tool Calls
  {
    const capability = new ProjectRatioCapability();
    const dispatcher = new RatioToolDispatcher(capability);

    // Valid call to set 16:9
    const validRes = dispatcher.executeTool('proj_1', { name: 'set_ratio', args: { ratio: '16:9' } });
    assert.strictEqual(validRes.success, true);
    const validData = validRes.data as any;
    assert.strictEqual(validData.ratio, '16:9');
    assert.strictEqual(validData.origin, 'agent_decision');
    assert.strictEqual(validData.locked, false);
    assert.deepStrictEqual(validData.dimensions, { width: 1920, height: 1080 });

    // Invalid ratio key (e.g. 2:3)
    const invalidRes = dispatcher.executeTool('proj_1', { name: 'set_ratio', args: { ratio: '2:3' } });
    assert.strictEqual(invalidRes.success, false);
    assert(invalidRes.error?.includes('Unsupported ratio "2:3"'));
    // State of proj_1 must remain 16:9
    assert.strictEqual(capability.getProjectRatio('proj_1').ratio, '16:9');

    // Missing ratio arg
    const missingRes = dispatcher.executeTool('proj_1', { name: 'set_ratio', args: {} });
    assert.strictEqual(missingRes.success, false);
    assert(missingRes.error?.includes('Missing required argument "ratio"'));

    // Unknown tool name
    const unknownRes = dispatcher.executeTool('proj_1', { name: 'random_tool', args: {} });
    assert.strictEqual(unknownRes.success, false);
    assert(unknownRes.error?.includes('Unknown ratio tool'));

    console.log('  [PASS] Test 3: Valid & Invalid Tool Calls verified');
  }

  // Test 4: Project Isolation via Runtime
  {
    const capability = new ProjectRatioCapability();
    const dispatcher = new RatioToolDispatcher(capability);

    // Set proj_A to 9:16 via tool
    dispatcher.executeTool('proj_A', { name: 'set_ratio', args: { ratio: '9:16' } });
    // Set proj_B to 1:1 via tool
    dispatcher.executeTool('proj_B', { name: 'set_ratio', args: { ratio: '1:1' } });

    // Inspect proj_A
    const getA = dispatcher.executeTool('proj_A', { name: 'get_current_ratio', args: {} });
    assert.strictEqual((getA.data as any).ratio, '9:16');

    // Inspect proj_B
    const getB = dispatcher.executeTool('proj_B', { name: 'get_current_ratio', args: {} });
    assert.strictEqual((getB.data as any).ratio, '1:1');

    // Inspect untouched proj_C -> default 3:4
    const getC = dispatcher.executeTool('proj_C', { name: 'get_current_ratio', args: {} });
    assert.strictEqual((getC.data as any).ratio, '3:4');
    assert.strictEqual((getC.data as any).origin, 'default');

    console.log('  [PASS] Test 4: Project Isolation via Runtime verified (zero cross-talk)');
  }

  // Test 5: Authority & Precedence Enforcement (Explicit User > Agent Tool)
  {
    const capability = new ProjectRatioCapability();
    const coordinator = new RatioPrecedenceCoordinator(capability);
    const dispatcher = new RatioToolDispatcher(capability);

    // User explicitly asks for 9:16
    const evalRes = coordinator.evaluateTurn('proj_locked', 'Design a high-craft poster in 9:16 format for mobile reel');
    assert.strictEqual(evalRes.explicitFound, true);
    assert.strictEqual(evalRes.activeRatioState.ratio, '9:16');
    assert.strictEqual(evalRes.activeRatioState.origin, 'explicit_user');
    assert.strictEqual(evalRes.activeRatioState.locked, true);

    // Agent attempts to call set_ratio with 16:9 on proj_locked
    const toolRes = dispatcher.executeTool('proj_locked', { name: 'set_ratio', args: { ratio: '16:9' } });
    assert.strictEqual(toolRes.success, false, 'Agent must not override an explicit user ratio in same turn');
    assert(toolRes.error?.includes('Cannot override explicit user ratio for project "proj_locked"'));

    // State remains 9:16
    assert.strictEqual(capability.getProjectRatio('proj_locked').ratio, '9:16');

    console.log('  [PASS] Test 5: Authority & Precedence Enforcement (Explicit User > Agent Tool) verified');
  }

  // Test 6: Multi-Turn Lock Refresh Invariant
  {
    const capability = new ProjectRatioCapability();
    const coordinator = new RatioPrecedenceCoordinator(capability);

    // Turn 1: User explicitly asks for 9:16
    const t1 = coordinator.evaluateTurn('proj_multi', 'Make this 9:16');
    assert.strictEqual(t1.activeRatioState.ratio, '9:16');
    assert.strictEqual(t1.activeRatioState.locked, true);

    // Turn 2: Across turns, user explicitly asks for 16:9 -> successfully replaces ratio and refreshes lock!
    const t2 = coordinator.evaluateTurn('proj_multi', 'Now make this in 16:9 widescreen format');
    assert.strictEqual(t2.activeRatioState.ratio, '16:9');
    assert.strictEqual(t2.activeRatioState.origin, 'explicit_user');
    assert.strictEqual(t2.activeRatioState.locked, true);

    // Turn 3: Across turns, user explicitly asks for 1:1
    const t3 = coordinator.evaluateTurn('proj_multi', 'Reformat as 1:1 square for social feed');
    assert.strictEqual(t3.activeRatioState.ratio, '1:1');
    assert.strictEqual(t3.activeRatioState.origin, 'explicit_user');
    assert.strictEqual(t3.activeRatioState.locked, true);

    console.log('  [PASS] Test 6: Multi-Turn Lock Refresh Invariant verified');
  }

  // Test 7: Immediate Unsupported Explicit Ratio Rejection (No Silent Coercion)
  {
    const capability = new ProjectRatioCapability();
    const coordinator = new RatioPrecedenceCoordinator(capability);

    const unsupportedPrompts = [
      'create a poster in 2:3 ratio',
      'generate 21:9 ultrawide display',
      'layout in 4:5 format'
    ];

    for (const prompt of unsupportedPrompts) {
      const res = coordinator.evaluateTurn('proj_unsupported', prompt);
      assert.strictEqual(res.explicitFound, true, `Should detect explicit intent in "${prompt}"`);
      assert(res.unsupportedError, 'Must return unsupportedError');
      assert(res.unsupportedError?.includes('Unsupported aspect ratio'), 'Error message must specify unsupported ratio');
      assert(res.unsupportedError?.includes('3:4, 9:16, 16:9, 1:1, 4:3'), 'Error message must list the 5 canonical options');
      // Must NOT silently convert to 3:4!
    }

    console.log('  [PASS] Test 7: Immediate Unsupported Explicit Ratio Rejection (Zero Coercion) verified');
  }

  // Test 8: Default Fallback when No Explicit Ratio and No Tool Call
  {
    const capability = new ProjectRatioCapability();
    const coordinator = new RatioPrecedenceCoordinator(capability);

    const neutralRes = coordinator.evaluateTurn('proj_neutral', 'Poster for an international conference on clean energy');
    assert.strictEqual(neutralRes.explicitFound, false);
    assert.strictEqual(neutralRes.activeRatioState.ratio, '3:4');
    assert.strictEqual(neutralRes.activeRatioState.origin, 'default');
    assert.strictEqual(neutralRes.activeRatioState.locked, false);

    console.log('  [PASS] Test 8: Default Fallback (3:4 @ 1080x1440) verified');
  }

  // Test 9: Ratio Stability Across Refinement Turns vs Geometry Adaptation
  {
    const capability = new ProjectRatioCapability();
    const coordinator = new RatioPrecedenceCoordinator(capability);

    // Turn 1: Agent decides 9:16 for a mobile context
    capability.setProjectRatio('proj_stability', '9:16', 'agent_decision');
    assert.strictEqual(capability.getProjectRatio('proj_stability').ratio, '9:16');
    assert.strictEqual(capability.getProjectRatio('proj_stability').origin, 'agent_decision');

    // Turn 2: User requests normal copy/styling refinement ("Change headline wording...")
    const refineTurn = coordinator.evaluateTurn(
      'proj_stability',
      "Change the headline wording to 'Berlin Electronic Odyssey' and use yellow typography"
    );
    assert.strictEqual(refineTurn.explicitFound, false, 'No explicit ratio given');
    assert.strictEqual(refineTurn.shouldRunAgentRatioTool, false, 'Must NOT run agent ratio tool on normal refinement');
    assert.strictEqual(refineTurn.activeRatioState.ratio, '9:16', 'Ratio must remain stable 9:16 by default');
    assert.strictEqual(refineTurn.activeRatioState.origin, 'agent_decision');

    // Turn 3: User requests geometry adaptation ("Now make this suitable for Instagram square")
    const adaptTurn = coordinator.evaluateTurn(
      'proj_stability',
      'Now make this suitable for Instagram square feed'
    );
    assert.strictEqual(adaptTurn.explicitFound, false);
    assert.strictEqual(adaptTurn.shouldRunAgentRatioTool, true, 'MUST run agent ratio tool when prompt calls for adaptation');
    assert.strictEqual(adaptTurn.isAdaptationTurn, true);
    assert.strictEqual(adaptTurn.activeRatioState.ratio, '9:16');

    // Agent executes adaptation tool call to 1:1
    const dispatcher = new RatioToolDispatcher(capability);
    const adaptExec = dispatcher.executeTool('proj_stability', { name: 'set_ratio', args: { ratio: '1:1' } });
    assert.strictEqual(adaptExec.success, true);
    assert.strictEqual(capability.getProjectRatio('proj_stability').ratio, '1:1');
    assert.strictEqual(capability.getProjectRatio('proj_stability').origin, 'agent_decision');

    // Turn 4: Subsequent ordinary refinement on 1:1 project preserves 1:1
    const refineTurn2 = coordinator.evaluateTurn('proj_stability', 'Make the album title larger');
    assert.strictEqual(refineTurn2.shouldRunAgentRatioTool, false);
    assert.strictEqual(refineTurn2.activeRatioState.ratio, '1:1', '1:1 remains stable across subsequent refinements');

    console.log('  [PASS] Test 9: Ratio Stability Across Refinement Turns vs Geometry Adaptation verified');
  }

  // Test 10: Bounded Tool Execution & Safe Error Termination
  {
    const capability = new ProjectRatioCapability();
    const dispatcher = new RatioToolDispatcher(capability);

    // Malformed calls return clean failure instead of crashing or looping
    const malformedCases = [
      { name: 'unknown_tool', args: {} },
      { name: 'set_ratio', args: null as any },
      { name: 'set_ratio', args: { ratio: 12345 } as any },
      { name: 'set_ratio', args: { ratio: '99:1' } },
      { name: 'set_ratio', args: {} }
    ];

    for (const badCall of malformedCases) {
      const res = dispatcher.executeTool('proj_bounded', badCall);
      assert.strictEqual(res.success, false, `Call to ${badCall.name} must return success: false`);
      assert(typeof res.error === 'string' && res.error.length > 0, 'Must provide clean error description');
    }

    // Verify capability hydration
    capability.hydrateProjectRatio('proj_hydrated', {
      ratio: '16:9',
      dimensions: { width: 1920, height: 1080 },
      origin: 'agent_decision',
      locked: false
    });
    assert.strictEqual(capability.getProjectRatio('proj_hydrated').ratio, '16:9');

    console.log('  [PASS] Test 10: Bounded Tool Execution & Safe Error Termination verified');
  }
}

if (process.argv[1]?.endsWith('ratio_capability.test.ts')) {
  runRatioCapabilityTest().catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
}
