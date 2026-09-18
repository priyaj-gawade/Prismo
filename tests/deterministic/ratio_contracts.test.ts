import assert from 'node:assert';
import {
  SUPPORTED_RATIOS,
  CANONICAL_RATIO_REGISTRY,
  isSupportedRatio,
  getCanonicalDimensions,
  getOrientationForRatio,
  parseExplicitRatio,
  validateDimensionPair,
  ProjectRatioCapability
} from '../../core/geometry/ratio.ts';
import { ArtifactValidator } from '../../core/validation/validator.ts';

export async function runRatioContractsTest(): Promise<void> {
  console.log('\n----------------------------------------------------');
  console.log('  TEST SUITE: MULTI-RATIO CAPABILITY & CONTRACTS     ');
  console.log('----------------------------------------------------');

// Test 1: Canonical Registry & Exact Dimensions
{
  assert.strictEqual(SUPPORTED_RATIOS.length, 5, 'Exactly 5 canonical ratios must be supported');
  assert.deepStrictEqual(
    [...SUPPORTED_RATIOS],
    ['3:4', '9:16', '16:9', '1:1', '4:3'],
    'Supported ratios must match exact canonical identifiers'
  );

  assert.deepStrictEqual(getCanonicalDimensions('3:4'), { width: 1080, height: 1440 });
  assert.deepStrictEqual(getCanonicalDimensions('9:16'), { width: 1080, height: 1920 });
  assert.deepStrictEqual(getCanonicalDimensions('16:9'), { width: 1920, height: 1080 });
  assert.deepStrictEqual(getCanonicalDimensions('1:1'), { width: 1080, height: 1080 });
  assert.deepStrictEqual(getCanonicalDimensions('4:3'), { width: 1440, height: 1080 });

  assert.strictEqual(getOrientationForRatio('3:4'), 'portrait');
  assert.strictEqual(getOrientationForRatio('9:16'), 'portrait');
  assert.strictEqual(getOrientationForRatio('16:9'), 'landscape');
  assert.strictEqual(getOrientationForRatio('1:1'), 'square');
  assert.strictEqual(getOrientationForRatio('4:3'), 'landscape');

  assert.strictEqual(isSupportedRatio('3:4'), true);
  assert.strictEqual(isSupportedRatio('9:16'), true);
  assert.strictEqual(isSupportedRatio('16:9'), true);
  assert.strictEqual(isSupportedRatio('1:1'), true);
  assert.strictEqual(isSupportedRatio('4:3'), true);
  assert.strictEqual(isSupportedRatio('2:3'), false);
  assert.strictEqual(isSupportedRatio('21:9'), false);
  assert.strictEqual(isSupportedRatio('random'), false);

  console.log('  [PASS] Test 1: Canonical Registry & Exact Dimensions verified for all 5 ratios');
}

// Test 2: Dimension Validation & Integer Safety
{
  const validator = new ArtifactValidator();

  // All 5 canonical dimensions must pass validator and dimension pair checker
  const canonicalPairs: [number, number, string][] = [
    [1080, 1440, '3:4'],
    [1080, 1920, '9:16'],
    [1920, 1080, '16:9'],
    [1080, 1080, '1:1'],
    [1440, 1080, '4:3']
  ];

  for (const [w, h, expectedRatio] of canonicalPairs) {
    const pairRes = validateDimensionPair(w, h);
    assert.strictEqual(pairRes.valid, true, `${w}x${h} must be valid canonical dimensions`);
    assert.strictEqual(pairRes.ratio, expectedRatio, `${w}x${h} must map to ${expectedRatio}`);

    const valRes = validator.validatePosterDimensions(w, h, expectedRatio as any);
    assert.strictEqual(valRes.valid, true, `Validator must accept ${w}x${h} as ${expectedRatio}`);
    assert.strictEqual(valRes.ratio, expectedRatio, `Validator must identify ratio ${expectedRatio}`);

    const anyRes = validator.validateAnySupportedDimensions(w, h);
    assert.strictEqual(anyRes.valid, true, `Validator validateAnySupportedDimensions must accept ${w}x${h}`);
    assert.strictEqual(anyRes.ratio, expectedRatio);
  }

  // Unsupported dimensions that do not match any of the 5 canonical ratios
  const invalidPairs: [number, number][] = [
    [1080, 1350], // 4:5
    [1920, 800],  // 2.4:1
    [1200, 800],  // 3:2
    [1000, 700],  // 10:7
    [0, 1440],    // zero
    [-1080, 1440],// negative
    [1080.5, 1440]// float
  ];

  for (const [w, h] of invalidPairs) {
    const pairRes = validateDimensionPair(w, h);
    assert.strictEqual(pairRes.valid, false, `${w}x${h} must be rejected`);
    assert(pairRes.error && pairRes.error.length > 0, 'Error message must be present');

    const valRes = validator.validateAnySupportedDimensions(w, h);
    assert.strictEqual(valRes.valid, false, `Validator must reject ${w}x${h}`);
  }

  // Backward compatibility check: validatePosterDimensions without expectedRatio defaults to 3:4
  const defaultCheckPass = validator.validatePosterDimensions(1080, 1440);
  assert.strictEqual(defaultCheckPass.valid, true, 'Default check must pass 1080x1440 as 3:4');
  const defaultCheckFail = validator.validatePosterDimensions(1080, 1920);
  assert.strictEqual(defaultCheckFail.valid, false, 'Default check must reject 1080x1920 as not 3:4');

  console.log('  [PASS] Test 2: Integer-safe dimension validation verified across canonical and invalid pairs');
}

// Test 3: Explicit User Ratio Parsing & Strict Rejection (No Silent Coercion)
{
  // Supported prompts
  const testCases: [string, string][] = [
    ['poster design in 9:16 format for social reel', '9:16'],
    ['make this 16:9 widescreen presentation', '16:9'],
    ['Genesis book talk in 1:1 format', '1:1'],
    ['Formula 1 supercar 3:4 poster', '3:4'],
    ['Architectural study in 4:3 ratio', '4:3'],
    ['Generate a widescreen graphic layout', '16:9'],
    ['Mobile story wallpaper for event', '9:16'],
    ['Square post for Instagram', '1:1']
  ];

  for (const [prompt, expectedRatio] of testCases) {
    const res = parseExplicitRatio(prompt);
    assert.strictEqual(res.found, true, `Should detect ratio in: "${prompt}"`);
    assert.strictEqual(res.isSupported, true, `Ratio in "${prompt}" should be supported`);
    assert.strictEqual(res.canonicalRatio, expectedRatio, `Ratio should match ${expectedRatio}`);
  }

  // Unsupported explicit ratios: MUST ERROR OUT, ZERO SILENT COERCION!
  const unsupportedCases = [
    'make this 2:3 vertical',
    'generate ultra-wide 21:9 banner',
    'layout in 5:7 format'
  ];

  for (const prompt of unsupportedCases) {
    const res = parseExplicitRatio(prompt);
    assert.strictEqual(res.found, true, `Should detect raw ratio in: "${prompt}"`);
    assert.strictEqual(res.isSupported, false, `Ratio in "${prompt}" must NOT be supported`);
    assert.strictEqual(res.canonicalRatio, undefined, 'No canonical ratio should be assigned for unsupported input');
    assert(res.error?.includes('Unsupported aspect ratio'), 'Must contain clear unsupported ratio error message');
    assert(res.error?.includes('3:4, 9:16, 16:9, 1:1, 4:3'), 'Must list the 5 canonical supported ratios in error');
  }

  // Neutral prompt without ratio mention
  const neutral = parseExplicitRatio('Minimalist Porsche poster with dark cinematic lighting');
  assert.strictEqual(neutral.found, false, 'Neutral prompt should not find an explicit ratio');
  assert.strictEqual(neutral.isSupported, false);

  // Guard checks: timestamps and scripture citations must NOT trigger false ratio detection
  const timestampPrompt = parseExplicitRatio('Architecture lecture on Tuesday at 9:30 am');
  assert.strictEqual(timestampPrompt.found, false, 'Timestamp "9:30 am" must not be detected as ratio');

  const scripturePrompt = parseExplicitRatio('Book talk discussing Genesis 1:1 and ancient origins');
  assert.strictEqual(scripturePrompt.found, false, 'Citation "Genesis 1:1" must not be detected as ratio');

  console.log('  [PASS] Test 3: Explicit user ratio parsing & strict rejection (zero silent coercion) verified');
}

// Test 4: Project-Scoped Ratio Capability & Multi-Turn State Isolation
{
  const capability = new ProjectRatioCapability();

  // Project A initially defaults to 3:4
  const projA_initial = capability.getProjectRatio('proj_alpha');
  assert.strictEqual(projA_initial.ratio, '3:4');
  assert.strictEqual(projA_initial.origin, 'default');
  assert.strictEqual(projA_initial.locked, false);

  // Set Project A to 9:16 via agent decision
  const projA_set = capability.setProjectRatio('proj_alpha', '9:16', 'agent_decision');
  assert.strictEqual(projA_set.ratio, '9:16');
  assert.strictEqual(projA_set.origin, 'agent_decision');
  assert.strictEqual(projA_set.locked, false);
  assert.deepStrictEqual(projA_set.dimensions, { width: 1080, height: 1920 });

  // Project B MUST still be default 3:4 (Zero cross-project state leakage!)
  const projB_initial = capability.getProjectRatio('proj_beta');
  assert.strictEqual(projB_initial.ratio, '3:4', 'Project B must remain 3:4 despite Project A being 9:16');
  assert.strictEqual(projB_initial.origin, 'default');

  // Turn 1: Lock Project B with an explicit user ratio 9:16
  const projB_t1 = capability.setProjectRatio('proj_beta', '9:16', 'explicit_user');
  assert.strictEqual(projB_t1.ratio, '9:16');
  assert.strictEqual(projB_t1.origin, 'explicit_user');
  assert.strictEqual(projB_t1.locked, true);

  // Turn 1 (same turn): Attempting to override Project B via agent decision MUST throw an error
  assert.throws(
    () => {
      capability.setProjectRatio('proj_beta', '1:1', 'agent_decision');
    },
    /Cannot override explicit user ratio for project "proj_beta"/,
    'Agent decision must not override an explicit user ratio in the same turn'
  );
  assert.strictEqual(capability.getProjectRatio('proj_beta').ratio, '9:16');

  // Turn 2 (across turns): New explicit user instruction CAN replace previous explicit user ratio
  const projB_t2 = capability.setProjectRatio('proj_beta', '16:9', 'explicit_user');
  assert.strictEqual(projB_t2.ratio, '16:9', 'New explicit user instruction must replace previous ratio');
  assert.strictEqual(projB_t2.locked, true);

  // Turn 3 (across turns): Another explicit user instruction updates to 1:1
  const projB_t3 = capability.setProjectRatio('proj_beta', '1:1', 'explicit_user');
  assert.strictEqual(projB_t3.ratio, '1:1');
  assert.strictEqual(projB_t3.locked, true);

  console.log('  [PASS] Test 4: Project-Scoped Ratio Capability & Multi-turn state isolation verified (zero leakage, user override)');
}
}

if (process.argv[1]?.endsWith('ratio_contracts.test.ts')) {
  runRatioContractsTest().catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
}
