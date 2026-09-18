import { runEnvTest } from './env.test.ts';
import { runPoolTest } from './pool.test.ts';
import { runWorkspaceTest } from './workspace.test.ts';
import { runAssetsTest } from './assets.test.ts';
import { runMemoryTest } from './memory.test.ts';
import { runRetrievalTest } from './retrieval.test.ts';
import { runPromptAndDesignTest } from './prompt.test.ts';
import { runContractsTest } from './contracts.test.ts';
import { runExportValidationTest } from './export_validation.test.ts';
import { runAntiSlopMicroUiTest } from './anti_slop_micro_ui.test.ts';
import { runTypographyTest } from './typography.test.ts';
import { runEditorialCompositionTest } from './editorial_composition.test.ts';
import { runSemanticIntentTests } from './semantic_intent.test.ts';
import { runRatioContractsTest } from './ratio_contracts.test.ts';
import { runRatioCapabilityTest } from './ratio_capability.test.ts';
import { runNoHiddenClassifierTest } from './no_hidden_classifier.test.ts';
import { runRatioPipelineTest } from './ratio_pipeline.test.ts';
import { runPublicBoundaryTest } from './public_boundary.test.ts';
import { runEmbeddedEngineModeTest } from './embedded_engine_mode.test.ts';
import { runConcurrencyAsyncExportTest } from './concurrency_async_export.test.ts';
import { runExtensibilityMockProviderTest } from './extensibility_mock_provider.test.ts';
import { runExtensibilityCustomToolTest } from './extensibility_custom_tool.test.ts';
import { runHostIntegrationContractTest } from './host_integration_contract.test.ts';

async function runAllDeterministic() {
  console.log('====================================================');
  console.log('  RUNNING ALL D8.7 DETERMINISTIC TEST SUITES (23/23) ');
  console.log('====================================================\n');

  // Baseline Suites (17)
  await runEnvTest();
  await runPoolTest();
  await runWorkspaceTest();
  await runAssetsTest();
  await runMemoryTest();
  await runRetrievalTest();
  await runPromptAndDesignTest();
  await runContractsTest();
  await runExportValidationTest();
  await runAntiSlopMicroUiTest();
  await runTypographyTest();
  await runEditorialCompositionTest();
  await runSemanticIntentTests();
  await runRatioContractsTest();
  await runRatioCapabilityTest();
  await runNoHiddenClassifierTest();
  await runRatioPipelineTest();

  // Architectural & Host-Integration Suites (6)
  await runPublicBoundaryTest();
  await runEmbeddedEngineModeTest();
  await runConcurrencyAsyncExportTest();
  await runExtensibilityMockProviderTest();
  await runExtensibilityCustomToolTest();
  await runHostIntegrationContractTest();

  console.log('====================================================');
  console.log('  ALL 23 DETERMINISTIC TEST SUITES PASSED CLEANLY!  ');
  console.log('====================================================\n');
}

runAllDeterministic().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
