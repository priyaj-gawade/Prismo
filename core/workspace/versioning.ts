import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceManager } from './workspace.ts';
import type { FileChangeRecord, ProjectMetadata } from '../contracts/engine.ts';

export interface VersionManifest {
  version: number;
  timestamp: number;
  requestPrompt: string;
  changedFiles: FileChangeRecord[];
  model?: string;
  accountId?: string;
}

export class VersionManager {
  private workspace: WorkspaceManager;

  constructor(workspace: WorkspaceManager) {
    this.workspace = workspace;
  }

  createSnapshot(projectId: string, prompt: string, changedFiles: FileChangeRecord[], diagnostics?: { model?: string; accountId?: string }): number {
    const project = this.workspace.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const nextVersion = (project.version || 1) + 1;
    const versionDir = path.join(this.workspace.getProjectPath(projectId), '.versions', `v${nextVersion}`);
    fs.mkdirSync(versionDir, { recursive: true });

    // Copy all project files into snapshot (except .versions)
    const files = this.workspace.listFiles(projectId);
    for (const file of files) {
      const src = path.join(this.workspace.getProjectPath(projectId), file.path);
      const dst = path.join(versionDir, file.path);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }

    const manifest: VersionManifest = {
      version: nextVersion,
      timestamp: Date.now(),
      requestPrompt: prompt,
      changedFiles,
      model: diagnostics?.model,
      accountId: diagnostics?.accountId
    };

    fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    this.workspace.updateProjectMetadata(projectId, { version: nextVersion });
    return nextVersion;
  }

  listVersions(projectId: string): VersionManifest[] {
    const versionsDir = path.join(this.workspace.getProjectPath(projectId), '.versions');
    if (!fs.existsSync(versionsDir)) return [];

    const dirs = fs.readdirSync(versionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('v'))
      .sort((a, b) => {
        const numA = parseInt(a.name.slice(1), 10) || 0;
        const numB = parseInt(b.name.slice(1), 10) || 0;
        return numA - numB;
      });

    const manifests: VersionManifest[] = [];
    for (const dir of dirs) {
      const mPath = path.join(versionsDir, dir.name, 'manifest.json');
      if (fs.existsSync(mPath)) {
        try {
          manifests.push(JSON.parse(fs.readFileSync(mPath, 'utf8')));
        } catch {
          // ignore corrupted manifest
        }
      }
    }
    return manifests;
  }

  rollback(projectId: string, targetVersion: number): ProjectMetadata {
    const versionDir = path.join(this.workspace.getProjectPath(projectId), '.versions', `v${targetVersion}`);
    if (!fs.existsSync(versionDir)) {
      throw new Error(`Version v${targetVersion} not found for project ${projectId}`);
    }

    const root = this.workspace.getProjectPath(projectId);

    // Delete current workspace files (except .versions)
    const currentFiles = this.workspace.listFiles(projectId);
    for (const file of currentFiles) {
      this.workspace.deleteFile(projectId, file.path);
    }

    // Restore files from versionDir
    const walkAndRestore = (dir: string, rel: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'manifest.json' && rel === '') continue; // skip manifest
        const full = path.join(dir, entry.name);
        const relative = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkAndRestore(full, relative);
        } else {
          const targetPath = path.join(root, relative);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.copyFileSync(full, targetPath);
        }
      }
    };
    walkAndRestore(versionDir, '');

    return this.workspace.updateProjectMetadata(projectId, { version: targetVersion });
  }
}

export class VersioningEngine {
  createVersion(projectRoot: string, prompt: string, runId?: string): { version: number } {
    const versionsDir = path.join(projectRoot, '.versions');
    fs.mkdirSync(versionsDir, { recursive: true });

    const existing = fs.readdirSync(versionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('v'))
      .map((d) => parseInt(d.name.slice(1), 10) || 0);

    const nextVersion = existing.length > 0 ? Math.max(...existing) + 1 : 2;
    const versionDir = path.join(versionsDir, `v${nextVersion}`);
    fs.mkdirSync(versionDir, { recursive: true });

    // Copy all project files except .versions and node_modules
    const copyRecursive = (src: string, dest: string) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.versions' || entry.name === 'node_modules') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(projectRoot, versionDir);

    const manifest = {
      version: nextVersion,
      timestamp: Date.now(),
      prompt,
      runId
    };
    fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    return { version: nextVersion };
  }

  listVersions(projectRoot: string): VersionManifest[] {
    const versionsDir = path.join(projectRoot, '.versions');
    if (!fs.existsSync(versionsDir)) return [];

    const dirs = fs.readdirSync(versionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('v'))
      .sort((a, b) => {
        const numA = parseInt(a.name.slice(1), 10) || 0;
        const numB = parseInt(b.name.slice(1), 10) || 0;
        return numA - numB;
      });

    const manifests: VersionManifest[] = [];
    for (const dir of dirs) {
      const mPath = path.join(versionsDir, dir.name, 'manifest.json');
      if (fs.existsSync(mPath)) {
        try {
          manifests.push(JSON.parse(fs.readFileSync(mPath, 'utf8')));
        } catch {}
      }
    }
    return manifests;
  }

  rollback(projectRoot: string, targetVersion: number): boolean {
    const versionDir = path.join(projectRoot, '.versions', `v${targetVersion}`);
    if (!fs.existsSync(versionDir)) {
      throw new Error(`Version v${targetVersion} does not exist`);
    }

    // Delete existing files in projectRoot except .versions
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.versions' || entry.name === 'node_modules') continue;
      const target = path.join(projectRoot, entry.name);
      fs.rmSync(target, { recursive: true, force: true });
    }

    // Restore from versionDir
    const restoreRecursive = (src: string, dest: string) => {
      const vEntries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of vEntries) {
        if (entry.name === 'manifest.json' && src === versionDir) continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          restoreRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    restoreRecursive(versionDir, projectRoot);
    return true;
  }
}
