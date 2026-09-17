import path from 'node:path';
import fs from 'node:fs';
import { getEngineConfig } from '../../core/config/env.ts';
import { StandaloneDesignEngine } from '../../core/engine.ts';
import type { TargetType } from '../../core/contracts/engine.ts';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    console.log(`
D8.7 Standalone Design & Website Engine CLI

Usage:
  node --experimental-strip-types app/cli/index.ts <command> [options]

Commands:
  status                                     Check Gemini pool health & asset providers
  create <name> [--target=<type>] [--preset] Create a new project (website, landing-page, poster, carousel)
  list                                       List all projects in workspace
  inspect <projectId>                        Inspect project details, files, and versions
  generate <projectId> "<prompt>"            Generate website/poster/carousel artifact
  refine <projectId> "<instruction>"         Refine project or section (--element=<od-id>)
  export <projectId> [--format=png|jpeg]     Headless browser screenshot export
  rollback <projectId> <version>             Rollback project to previous version
  search-stock "<query>" [--provider=<name>] Search stock assets (pexels, pixabay, unsplash, local)
  preview <projectId>                        Launch preview server for project
`);
    return;
  }

  const envConfig = getEngineConfig();
  const dataDir = path.resolve(process.cwd(), 'd8.7-data');
  const engine = new StandaloneDesignEngine({
    dataDir,
    previewPort: parseInt(process.env.D8_PORT || String(envConfig.port), 10),
    geminiKeys: envConfig.geminiKeys,
    pexelsKeys: envConfig.pexelsKeys,
    pixabayKeys: envConfig.pixabayKeys,
    unsplashKeys: envConfig.unsplashKeys
  });

  try {
    switch (command) {
      case 'status': {
        console.log('=== D8.7 Standalone Engine Status ===');
        console.log(`Working Data Directory: ${dataDir}`);
        console.log('\n--- Gemini Account Pool (3 Accounts) ---');
        const accounts = engine.getProviderDiagnostics();
        for (const acc of accounts) {
          console.log(`  [${acc.id}] Health: ${acc.health} | Key: ${acc.keyRef} | Req: ${acc.totalRequests} (Succ: ${acc.successfulRequests}, Fail: ${acc.failedRequests})`);
        }
        console.log('\n--- Stock Asset Providers ---');
        console.log(`  Pexels:   ${envConfig.pexelsKeys.length} keys loaded`);
        console.log(`  Pixabay:  ${envConfig.pixabayKeys.length} keys loaded`);
        console.log(`  Unsplash: ${envConfig.unsplashKeys.length} keys loaded (Zero fake data)`);
        console.log(`  Local:    Ready (${path.join(dataDir, 'assets')})`);
        break;
      }

      case 'create': {
        const name = args[1] || 'Untitled Project';
        let target: TargetType = 'poster';
        let preset = 'modern-dark';

        for (const arg of args.slice(2)) {
          if (arg.startsWith('--target=')) target = arg.split('=')[1] as TargetType;
          if (arg.startsWith('--preset=')) preset = arg.split('=')[1];
        }

        const project = await engine.createProject(name, target, undefined, preset);
        console.log(`Created project: ${project.name} (${project.target})`);
        console.log(`ID: ${project.id}`);
        console.log(`Path: ${project.rootPath}`);
        break;
      }

      case 'list': {
        const projectsDir = path.join(dataDir, 'projects');
        if (!fs.existsSync(projectsDir)) {
          console.log('No projects created yet.');
          return;
        }
        const dirs = fs.readdirSync(projectsDir, { withFileTypes: true });
        console.log(`Found ${dirs.length} projects in workspace:`);
        for (const d of dirs) {
          if (d.isDirectory()) {
            const p = await engine.getProject(d.name);
            if (p) {
              console.log(`- [${p.id}] ${p.name} (${p.target} v${p.version})`);
            }
          }
        }
        break;
      }

      case 'inspect': {
        const projectId = args[1];
        if (!projectId) throw new Error('Missing projectId argument');
        const details = await engine.inspect(projectId);
        console.log(`Project: ${details.metadata.name} [${details.metadata.id}]`);
        console.log(`Target: ${details.metadata.target} | Version: v${details.metadata.version}`);
        console.log(`Files (${details.files.length}):`);
        for (const f of details.files) {
          console.log(`  - ${f.path} (${f.size} bytes)`);
        }
        break;
      }

      case 'generate': {
        const projectId = args[1];
        const prompt = args[2];
        if (!projectId || !prompt) throw new Error('Usage: generate <projectId> "<prompt>"');

        console.log(`Generating for project ${projectId}...`);
        const result = await engine.generate({
          projectId,
          conversationId: `cli_${Date.now()}`,
          prompt
        });

        console.log(`Status: ${result.status.toUpperCase()}`);
        console.log(`Model Used: ${result.diagnostics.model} (${result.diagnostics.accountId})`);
        console.log(`Duration: ${result.diagnostics.durationMs}ms`);
        console.log(`Changed Files (${result.changedFiles.length}):`);
        for (const change of result.changedFiles) {
          console.log(`  [${change.changeType}] ${change.path} (${change.newSize || 0} bytes)`);
        }
        console.log(`Preview: ${result.previewUrl}`);
        break;
      }

      case 'refine': {
        const projectId = args[1];
        const instruction = args[2];
        if (!projectId || !instruction) throw new Error('Usage: refine <projectId> "<instruction>" [--element=<od-id>]');

        let targetElementId: string | undefined;
        for (const arg of args.slice(3)) {
          if (arg.startsWith('--element=')) targetElementId = arg.split('=')[1];
        }

        console.log(`Refining project ${projectId} (Target: ${targetElementId || 'global'})...`);
        const result = await engine.refine({
          projectId,
          conversationId: `cli_refine_${Date.now()}`,
          instruction,
          targetElementId
        });

        console.log(`Status: ${result.status.toUpperCase()}`);
        console.log(`Model Used: ${result.diagnostics.model} (${result.diagnostics.accountId})`);
        console.log(`Changed Files (${result.changedFiles.length}):`);
        for (const change of result.changedFiles) {
          console.log(`  [${change.changeType}] ${change.path}`);
        }
        break;
      }

      case 'export': {
        const projectId = args[1];
        if (!projectId) throw new Error('Usage: export <projectId> [--format=png|jpeg] [--out=<path>]');

        let format: 'png' | 'jpeg' = 'png';
        let outputPath: string | undefined;
        for (const arg of args.slice(2)) {
          if (arg.startsWith('--format=')) format = arg.split('=')[1] as any;
          if (arg.startsWith('--out=')) outputPath = arg.split('=')[1];
        }

        console.log(`Exporting screenshot for ${projectId}...`);
        const res = await engine.export(projectId, { format, outputPath });
        console.log(`Exported successfully!`);
        console.log(`File: ${res.filePath}`);
        console.log(`Dimensions: ${res.width}x${res.height}`);
        console.log(`Size: ${res.fileSize} bytes in ${res.durationMs}ms`);
        break;
      }

      case 'rollback': {
        const projectId = args[1];
        const version = parseInt(args[2], 10);
        if (!projectId || isNaN(version)) throw new Error('Usage: rollback <projectId> <version>');

        const rolled = await engine.rollback(projectId, version);
        console.log(`Rolled back ${rolled.id} to version ${rolled.version}`);
        break;
      }

      case 'search-stock': {
        const query = args[1];
        if (!query) throw new Error('Usage: search-stock "<query>" [--provider=pexels|pixabay|unsplash|local]');

        let provider: any;
        for (const arg of args.slice(2)) {
          if (arg.startsWith('--provider=')) provider = arg.split('=')[1];
        }

        const res = await engine.getAssetManager().search({ query, provider });
        console.log(`Search for "${query}" returned ${res.assets.length} results from provider: ${res.provider}`);
        for (const a of res.assets.slice(0, 5)) {
          console.log(`  - [${a.provider}] ${a.title} (${a.width}x${a.height}) by ${a.author}`);
          console.log(`    Thumb: ${a.thumbnailUrl}`);
        }
        break;
      }

      case 'preview': {
        const projectId = args[1];
        if (!projectId) throw new Error('Usage: preview <projectId>');
        const previewInfo = await engine.preview(projectId);
        console.log(`Preview running at: ${previewInfo.url}`);
        console.log('Press Ctrl+C to stop');
        await new Promise(() => {}); // keep process alive
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        break;
    }
  } finally {
    if (command !== 'preview') {
      await engine.shutdown();
    }
  }
}

main().catch((err) => {
  console.error('CLI Error:', err.message || err);
  process.exit(1);
});
