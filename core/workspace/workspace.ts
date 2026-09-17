import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TargetType, ProjectMetadata, ArtifactFile } from '../contracts/engine.ts';

export class ProjectWorkspace {
  readonly projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    fs.mkdirSync(this.projectDir, { recursive: true });
  }

  async initializeStarterFiles(name: string = 'New Project'): Promise<void> {
    fs.mkdirSync(path.join(this.projectDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(this.projectDir, '.versions'), { recursive: true });

    const starterHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="tokens.css">
</head>
<body>
  <div id="root" data-od-id="app-root">
    <!-- Generated content will appear here -->
  </div>
  <script src="script.js"></script>
</body>
</html>`;

    const starterCss = `/* Base styles for ${name} */
@import "tokens.css";

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  color: var(--color-text, #1e293b);
  background-color: var(--color-bg, #ffffff);
  line-height: 1.5;
}
`;

    const starterJs = `// Interactive scripts for ${name}
document.addEventListener('DOMContentLoaded', () => {
  console.log('${name} initialized');
});
`;

    const starterTokens = `:root {
  --color-primary: #2563eb;
  --color-bg: #ffffff;
  --color-text: #0f172a;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
`;

    fs.writeFileSync(path.join(this.projectDir, 'index.html'), starterHtml, 'utf8');
    fs.writeFileSync(path.join(this.projectDir, 'styles.css'), starterCss, 'utf8');
    fs.writeFileSync(path.join(this.projectDir, 'script.js'), starterJs, 'utf8');
    fs.writeFileSync(path.join(this.projectDir, 'tokens.css'), starterTokens, 'utf8');
  }
}

export class WorkspaceManager {
  private projectsRoot: string;

  constructor(dataDir: string) {
    this.projectsRoot = path.join(dataDir, 'projects');
    fs.mkdirSync(this.projectsRoot, { recursive: true });
  }

  getProjectPath(projectId: string): string {
    return path.join(this.projectsRoot, projectId);
  }

  async createProject(name: string, target: TargetType, instructions?: string): Promise<ProjectMetadata> {
    const id = `proj_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const rootPath = this.getProjectPath(id);
    
    fs.mkdirSync(rootPath, { recursive: true });
    fs.mkdirSync(path.join(rootPath, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(rootPath, '.versions'), { recursive: true });

    const now = Date.now();
    const meta: ProjectMetadata = {
      id,
      name,
      target,
      rootPath,
      createdAt: now,
      updatedAt: now,
      instructions,
      version: 1
    };

    fs.writeFileSync(path.join(rootPath, 'design.json'), JSON.stringify(meta, null, 2), 'utf8');

    // Default starter files based on target
    const starterHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="tokens.css">
</head>
<body>
  <div id="root" data-od-id="app-root">
    <!-- Generated content will appear here -->
  </div>
  <script src="script.js"></script>
</body>
</html>`;

    const starterCss = `/* Base styles for ${name} */
@import "tokens.css";

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  color: var(--color-text, #1e293b);
  background-color: var(--color-bg, #ffffff);
  line-height: 1.5;
}
`;

    const starterJs = `// Interactive scripts for ${name}
document.addEventListener('DOMContentLoaded', () => {
  console.log('${name} initialized');
});
`;

    const starterTokens = `:root {
  --color-primary: #2563eb;
  --color-bg: #ffffff;
  --color-text: #0f172a;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
`;

    fs.writeFileSync(path.join(rootPath, 'index.html'), starterHtml, 'utf8');
    fs.writeFileSync(path.join(rootPath, 'styles.css'), starterCss, 'utf8');
    fs.writeFileSync(path.join(rootPath, 'script.js'), starterJs, 'utf8');
    fs.writeFileSync(path.join(rootPath, 'tokens.css'), starterTokens, 'utf8');

    // Snapshot initial version 1
    const v1Dir = path.join(rootPath, '.versions', 'v1');
    fs.mkdirSync(v1Dir, { recursive: true });
    fs.copyFileSync(path.join(rootPath, 'index.html'), path.join(v1Dir, 'index.html'));
    fs.copyFileSync(path.join(rootPath, 'styles.css'), path.join(v1Dir, 'styles.css'));
    fs.copyFileSync(path.join(rootPath, 'script.js'), path.join(v1Dir, 'script.js'));
    fs.copyFileSync(path.join(rootPath, 'tokens.css'), path.join(v1Dir, 'tokens.css'));
    fs.copyFileSync(path.join(rootPath, 'design.json'), path.join(v1Dir, 'design.json'));
    fs.writeFileSync(path.join(v1Dir, 'manifest.json'), JSON.stringify({ version: 1, prompt: 'Initial project setup' }), 'utf8');

    return meta;
  }

  getProject(projectId: string): ProjectMetadata | null {
    const metaPath = path.join(this.getProjectPath(projectId), 'design.json');
    if (!fs.existsSync(metaPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      return null;
    }
  }

  updateProjectMetadata(projectId: string, updates: Partial<ProjectMetadata>): ProjectMetadata {
    const current = this.getProject(projectId);
    if (!current) throw new Error(`Project ${projectId} not found`);
    const updated: ProjectMetadata = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };
    fs.writeFileSync(path.join(this.getProjectPath(projectId), 'design.json'), JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  listFiles(projectId: string): ArtifactFile[] {
    const root = this.getProjectPath(projectId);
    if (!fs.existsSync(root)) return [];

    const results: ArtifactFile[] = [];
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
          results.push({
            path: relative,
            size: stat.size
          });
        }
      }
    };
    walk(root, '');
    return results;
  }

  readFile(projectId: string, relPath: string): string | null {
    const full = path.join(this.getProjectPath(projectId), relPath);
    if (!fs.existsSync(full)) return null;
    return fs.readFileSync(full, 'utf8');
  }

  writeFile(projectId: string, relPath: string, content: string | Buffer): void {
    const full = path.join(this.getProjectPath(projectId), relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  deleteFile(projectId: string, relPath: string): boolean {
    const full = path.join(this.getProjectPath(projectId), relPath);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      return true;
    }
    return false;
  }
}
