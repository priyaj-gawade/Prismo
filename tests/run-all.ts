import { spawnSync } from 'node:child_process';

console.log('====================================================');
console.log('  D8.7 MASTER TEST SUITE: DETERMINISTIC + SMOKE     ');
console.log('====================================================\n');

console.log('>>> [1/2] RUNNING DETERMINISTIC TESTS...');
const det = spawnSync('node', ['--experimental-strip-types', 'tests/deterministic/run.ts'], { stdio: 'inherit' });
if (det.status !== 0) {
  process.exit(det.status || 1);
}

console.log('\n>>> [2/2] RUNNING REAL API SMOKE TESTS...');
const smoke = spawnSync('node', ['--experimental-strip-types', 'tests/smoke/run.ts'], { stdio: 'inherit' });
if (smoke.status !== 0) {
  process.exit(smoke.status || 1);
}

console.log('\n====================================================');
console.log('  MASTER TEST SUITE PASSED! ALL CONTRACTS VERIFIED.  ');
console.log('====================================================');
