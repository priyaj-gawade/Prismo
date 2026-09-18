import assert from 'node:assert';
import {
  AgentToolRegistry,
  createRatioToolRegistry,
  type AgentTool
} from '../../core/geometry/ratio_tools.ts';
import { ProjectRatioCapability } from '../../core/geometry/ratio.ts';

export async function runExtensibilityCustomToolTest(): Promise<boolean> {
  console.log('--- Testing Extensibility: AgentToolRegistry & Custom Tool Execution ---');

  // 1. Instantiate registry
  const registry = new AgentToolRegistry();

  // 2. Define a custom layout inspection tool
  const customTool: AgentTool = {
    declaration: {
      name: 'inspect_layout_balance',
      description: 'Analyze visual balance and whitespace distribution of the poster',
      parameters: {
        type: 'OBJECT',
        properties: {
          metric: {
            type: 'STRING',
            enum: ['whitespace', 'focal_contrast', 'typographic_hierarchy']
          }
        },
        required: ['metric']
      }
    },
    execute: (projectId: string, args: Record<string, unknown>) => {
      const metric = args.metric as string;
      return {
        success: true,
        data: {
          projectId,
          metric,
          score: 0.94,
          recommendation: 'Visual balance is optimal'
        }
      };
    }
  };

  // 3. Register custom tool
  registry.registerTool(customTool);
  assert.ok(registry.hasTool('inspect_layout_balance'), 'Registry must register custom tool');

  // 4. Verify declarations format for LLM function calling
  const declarations = registry.getDeclarations();
  assert.strictEqual(declarations.length, 1);
  assert.strictEqual(declarations[0].name, 'inspect_layout_balance');
  assert.strictEqual(declarations[0].description, customTool.declaration.description);
  console.log('  [PASS] Custom tool registered and declarations formatted for model function calling');

  // 5. Execute custom tool
  const execResult = await registry.executeTool('proj_sample_123', {
    name: 'inspect_layout_balance',
    args: { metric: 'whitespace' }
  });

  assert.strictEqual(execResult.success, true);
  const data = execResult.data as Record<string, unknown>;
  assert.strictEqual(data.projectId, 'proj_sample_123');
  assert.strictEqual(data.metric, 'whitespace');
  assert.strictEqual(data.score, 0.94);
  console.log('  [PASS] Typed tool execution routed and executed cleanly');

  // 6. Verify unknown tool dispatch safety
  const unknownResult = await registry.executeTool('proj_sample_123', {
    name: 'non_existent_tool',
    args: {}
  });
  assert.strictEqual(unknownResult.success, false);
  assert.ok(unknownResult.error?.includes('Unknown tool'), 'Unknown tool must return clean failure');
  console.log('  [PASS] Unknown tool call safely handled with structured failure result');

  // 7. Verify standard ratio tools helper integrates seamlessly
  const capability = new ProjectRatioCapability();
  const ratioRegistry = createRatioToolRegistry(capability);
  const ratioDecls = ratioRegistry.getDeclarations();
  const names = ratioDecls.map((d) => d.name);

  assert.strictEqual(names.length, 3);
  assert.ok(names.includes('get_supported_ratios'));
  assert.ok(names.includes('get_current_ratio'));
  assert.ok(names.includes('set_ratio'));

  // Test executing set_ratio via registry
  const setRatioResult = await ratioRegistry.executeTool('proj_sample_456', {
    name: 'set_ratio',
    args: { ratio: '16:9' }
  });
  assert.strictEqual(setRatioResult.success, true);
  assert.strictEqual(capability.getProjectRatio('proj_sample_456').ratio, '16:9');
  console.log('  [PASS] Standard ratio capability tools cleanly registered and executable via registry');

  console.log('AgentToolRegistry & custom tool tests PASSED!\n');
  return true;
}

if (process.argv[1]?.endsWith('extensibility_custom_tool.test.ts')) {
  runExtensibilityCustomToolTest().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
