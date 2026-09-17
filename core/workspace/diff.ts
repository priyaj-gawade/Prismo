import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { FileChangeRecord } from '../contracts/engine.ts';

export interface FileSnapshotEntry {
  path: string;
  size: number;
  mtime: number;
  hash: string;
}

export type ProjectSnapshot = Map<string, FileSnapshotEntry>;

function hashFile(filePath: string): string {
  try {
    const buffer = fs.readFileSync(filePath);
    return createHash('sha256').update(buffer).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Takes an immutable snapshot of all project files (ignoring .versions).
 */
export function takeProjectSnapshot(projectRoot: string): ProjectSnapshot {
  const snapshot: ProjectSnapshot = new Map();
  if (!fs.existsSync(projectRoot)) return snapshot;

  const walk = (dir: string, rel: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.versions') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      const relative = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, relative);
      } else {
        const stat = fs.statSync(full);
        snapshot.set(relative, {
          path: relative,
          size: stat.size,
          mtime: stat.mtimeMs,
          hash: hashFile(full)
        });
      }
    }
  };

  walk(projectRoot, '');
  return snapshot;
}

/**
 * Computes difference between pre-run and post-run snapshots.
 */
export function computeSnapshotDiff(before: ProjectSnapshot, after: ProjectSnapshot): FileChangeRecord[] {
  const changes: FileChangeRecord[] = [];

  // Created or modified
  for (const [relPath, post] of after.entries()) {
    const pre = before.get(relPath);
    if (!pre) {
      changes.push({
        path: relPath,
        changeType: 'created',
        newSize: post.size
      });
    } else if (pre.hash !== post.hash || pre.size !== post.size) {
      changes.push({
        path: relPath,
        changeType: 'modified',
        previousSize: pre.size,
        newSize: post.size
      });
    }
  }

  // Deleted
  for (const [relPath, pre] of before.entries()) {
    if (!after.has(relPath)) {
      changes.push({
        path: relPath,
        changeType: 'deleted',
        previousSize: pre.size
      });
    }
  }

  return changes;
}

export class FilesystemDiffEngine {
  snapshot(projectRoot: string): ProjectSnapshot {
    return takeProjectSnapshot(projectRoot);
  }

  computeDiff(before: ProjectSnapshot, after: ProjectSnapshot): FileChangeRecord[] {
    return computeSnapshotDiff(before, after);
  }
}
