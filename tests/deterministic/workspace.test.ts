import fs from 'node:fs';
import path from 'node:path';
import { WorkspaceManager } from '../../core/workspace/workspace.ts';
import { takeProjectSnapshot, computeSnapshotDiff } from '../../core/workspace/diff.ts';
import { VersionManager } from '../../core/workspace/versioning.ts';

export async function runWorkspaceTest(): Promise<boolean> {
  console.log('--- Testing Workspace, Diffing & Versioning ---');

  const testDataDir = path.resolve('d8.7-test-data');
  fs.mkdirSync(testDataDir, { recursive: true });

  const ws = new WorkspaceManager(testDataDir);
  const project = await ws.createProject('Test Project', 'website', 'Initial test site');
  console.log(`  [PASS] Project created: ${project.id}`);

  // Test starter files
  const files = ws.listFiles(project.id);
  const paths = files.map((f) => f.path);
  if (!paths.includes('index.html') || !paths.includes('styles.css') || !paths.includes('tokens.css')) {
    throw new Error(`Expected starter files, got: ${paths.join(', ')}`);
  }
  console.log('  [PASS] Starter files verified');

  // Test pre-run snapshot
  const before = takeProjectSnapshot(project.rootPath);

  // Perform mutation
  ws.writeFile(project.id, 'index.html', '<!DOCTYPE html><html><body><h1>Updated Hero</h1></body></html>');
  ws.writeFile(project.id, 'assets/logo.svg', '<svg></svg>');

  const after = takeProjectSnapshot(project.rootPath);
  const diff = computeSnapshotDiff(before, after);

  const modified = diff.find((d) => d.path === 'index.html');
  const created = diff.find((d) => d.path === 'assets/logo.svg');

  if (!modified || modified.changeType !== 'modified') {
    throw new Error('Expected index.html to be detected as modified');
  }
  if (!created || created.changeType !== 'created') {
    throw new Error('Expected assets/logo.svg to be detected as created');
  }
  console.log('  [PASS] Filesystem diffing accurately detected modified and created files');

  // Test versioning
  const vm = new VersionManager(ws);
  const v2 = vm.createSnapshot(project.id, 'Add logo and update hero', diff);
  if (v2 !== 2) throw new Error(`Expected version 2, got ${v2}`);
  console.log('  [PASS] Version 2 snapshot created');

  // Mutate again for version 3
  ws.writeFile(project.id, 'index.html', '<!DOCTYPE html><html><body><h1>Version 3 Content</h1></body></html>');
  const v3 = vm.createSnapshot(project.id, 'Version 3 change', []);
  if (v3 !== 3) throw new Error(`Expected version 3, got ${v3}`);

  // Test rollback to version 2
  vm.rollback(project.id, 2);
  const rolledBackHtml = ws.readFile(project.id, 'index.html');
  if (!rolledBackHtml || !rolledBackHtml.includes('Updated Hero')) {
    throw new Error(`Rollback failed! Expected 'Updated Hero', got: ${rolledBackHtml}`);
  }
  console.log('  [PASS] Rollback to version 2 verified');

  // Clean up test directory
  fs.rmSync(testDataDir, { recursive: true, force: true });
  console.log('Workspace tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('workspace.test.ts')) {
  runWorkspaceTest().catch(console.error);
}
