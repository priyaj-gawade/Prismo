import type { ProjectWorkspace } from '../workspace/workspace.ts';
import type { MarkdownMemoryStore } from '../memory/store.ts';
import { ContextSourceExtractor, type ContextSnippet } from './sources.ts';
import { ContextRanker, type RankedContextSnippet } from './ranker.ts';

export class DeterministicContextRetriever {
  private extractor: ContextSourceExtractor;
  private ranker: ContextRanker;

  constructor() {
    this.extractor = new ContextSourceExtractor();
    this.ranker = new ContextRanker();
  }

  async retrieve(
    query: string,
    workspace: ProjectWorkspace,
    memoryStore?: MarkdownMemoryStore,
    maxResults: number = 6
  ): Promise<RankedContextSnippet[]> {
    const rawSnippets = await this.extractor.extractFromProject(workspace, memoryStore);
    return this.ranker.rank(rawSnippets, query, maxResults);
  }

  formatAsMarkdown(snippets: RankedContextSnippet[]): string {
    if (snippets.length === 0) {
      return '';
    }

    const lines: string[] = ['## Retrieved Project Context'];

    for (const snippet of snippets) {
      const heading = snippet.sectionHeading || snippet.filePath || snippet.id;
      lines.push(`### [${snippet.source.toUpperCase()}] ${heading}`);
      lines.push(snippet.content.trim());
      lines.push('');
    }

    return lines.join('\n').trim();
  }
}
