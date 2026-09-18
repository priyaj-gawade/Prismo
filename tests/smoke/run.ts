import { runPexelsSmoke } from './pexels.smoke.ts';
import { runPixabaySmoke } from './pixabay.smoke.ts';
import { runUnsplashSmoke } from './unsplash.smoke.ts';
import { runGeminiSmoke } from './gemini.smoke.ts';
import { runExportSmoke } from './export.smoke.ts';

async function runAllSmoke() {
  console.log('====================================================');
  console.log('  RUNNING D8.7 REAL API SMOKE ACCEPTANCE SUITE       ');
  console.log('====================================================\n');

  await runPexelsSmoke();
  await runPixabaySmoke();
  await runUnsplashSmoke();
  await runGeminiSmoke();
  await runExportSmoke();

  console.log('\n====================================================');
  console.log('  ALL REAL API ACCEPTANCE SMOKE TESTS PASSED!       ');
  console.log('====================================================\n');
}

runAllSmoke().catch((err) => {
  console.error('Smoke Suite Failed:', err);
  process.exit(1);
});
