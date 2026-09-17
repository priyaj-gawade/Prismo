import fs from 'node:fs';
import path from 'node:path';
import type { ProjectWorkspace } from '../workspace/workspace.ts';
import type { MarkdownMemoryStore } from '../memory/store.ts';

export type ContextSourceType = 'design_md' | 'tokens_css' | 'skill_md' | 'project_json' | 'code' | 'assets' | 'memory';

export interface ContextSnippet {
  id: string;
  source: ContextSourceType;
  filePath?: string;
  sectionHeading?: string;
  content: string;
  metadata?: Record<string, any>;
}

export class ContextSourceExtractor {
  async extractFromProject(workspace: ProjectWorkspace, memoryStore?: MarkdownMemoryStore): Promise<ContextSnippet[]> {
    const snippets: ContextSnippet[] = [];
    const root = workspace.projectDir;

    // 1. DESIGN.md
    const designPath = path.join(root, 'DESIGN.md');
    if (fs.existsSync(designPath)) {
      const content = fs.readFileSync(designPath, 'utf8');
      snippets.push(...this.splitMarkdownSections(content, 'design_md', 'DESIGN.md'));
    }

    // 2. tokens.css
    const tokensPath = path.join(root, 'tokens.css');
    if (fs.existsSync(tokensPath)) {
      const content = fs.readFileSync(tokensPath, 'utf8');
      snippets.push({
        id: 'tokens_css_root',
        source: 'tokens_css',
        filePath: 'tokens.css',
        sectionHeading: 'Design Tokens CSS Variables',
        content
      });
    }

    // 3. project.json
    const projectPath = path.join(root, 'project.json');
    if (fs.existsSync(projectPath)) {
      const content = fs.readFileSync(projectPath, 'utf8');
      snippets.push({
        id: 'project_json_meta',
        source: 'project_json',
        filePath: 'project.json',
        sectionHeading: 'Project Specification & Metadata',
        content
      });
    }

    // 4. Existing code: index.html, styles.css, script.js
    const indexHtmlPath = path.join(root, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      const content = fs.readFileSync(indexHtmlPath, 'utf8');
      snippets.push(...this.extractHtmlSections(content));
    }

    const stylesCssPath = path.join(root, 'styles.css');
    if (fs.existsSync(stylesCssPath)) {
      const content = fs.readFileSync(stylesCssPath, 'utf8');
      snippets.push({
        id: 'styles_css_main',
        source: 'code',
        filePath: 'styles.css',
        sectionHeading: 'Main Stylesheet',
        content: content.slice(0, 4000) // cap snippet size
      });
    }

    // 5. Assets manifest
    const assetsDir = path.join(root, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      if (files.length > 0) {
        snippets.push({
          id: 'assets_manifest',
          source: 'assets',
          filePath: 'assets/',
          sectionHeading: 'Local Project Assets',
          content: `Assets present in assets/:\n${files.map((f) => `- assets/${f}`).join('\n')}`
        });
      }
    }

    // 6. Memory Store
    if (memoryStore) {
      const memEntries = await memoryStore.listEntries();
      for (const entry of memEntries) {
        snippets.push({
          id: `memory_${entry.id}`,
          source: 'memory',
          sectionHeading: `[Memory: ${entry.bucket}] ${entry.title}`,
          content: entry.content,
          metadata: { bucket: entry.bucket, tags: entry.tags }
        });
      }
    }

    return snippets;
  }

  private splitMarkdownSections(markdown: string, source: ContextSourceType, filePath: string): ContextSnippet[] {
    const snippets: ContextSnippet[] = [];
    const lines = markdown.split('\n');
    let currentHeading = 'Overview';
    let currentContent: string[] = [];
    let sectionIdx = 0;

    for (const line of lines) {
      if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
        if (currentContent.length > 0 && currentContent.join('\n').trim().length > 0) {
          snippets.push({
            id: `${source}_sec_${sectionIdx++}`,
            source,
            filePath,
            sectionHeading: currentHeading,
            content: currentContent.join('\n').trim()
          });
          currentContent = [];
        }
        currentHeading = line.replace(/^#+\s*/, '').trim();
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0 && currentContent.join('\n').trim().length > 0) {
      snippets.push({
        id: `${source}_sec_${sectionIdx++}`,
        source,
        filePath,
        sectionHeading: currentHeading,
        content: currentContent.join('\n').trim()
      });
    }

    return snippets;
  }

  private extractHtmlSections(html: string): ContextSnippet[] {
    const snippets: ContextSnippet[] = [];
    // Extract sections with data-od-id or standard tag sections
    const sectionRegex = /<(header|nav|section|main|footer|article)[^>]*?(?:data-od-id="([^"]+)")?[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = sectionRegex.exec(html)) !== null) {
      const tag = match[1];
      const odId = match[2] || `${tag}_${idx}`;
      const inner = match[3].trim();
      snippets.push({
        id: `html_sec_${odId}`,
        source: 'code',
        filePath: 'index.html',
        sectionHeading: `HTML Section <${tag}> [${odId}]`,
        content: `<${tag} data-od-id="${odId}">\n${inner.slice(0, 1500)}\n</${tag}>`
      });
      idx++;
    }

    if (snippets.length === 0 && html.trim().length > 0) {
      snippets.push({
        id: 'html_full_snippet',
        source: 'code',
        filePath: 'index.html',
        sectionHeading: 'Full HTML Document Structure',
        content: html.slice(0, 3000)
      });
    }

    return snippets;
  }
}
