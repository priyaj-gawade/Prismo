import type { ContextSnippet } from './sources.ts';

export interface RankedContextSnippet extends ContextSnippet {
  score: number;
  matchReasons: string[];
}

export class ContextRanker {
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  rank(snippets: ContextSnippet[], query: string, maxResults: number = 8): RankedContextSnippet[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      // Return top snippets by source priority if query is empty or too short
      return snippets.slice(0, maxResults).map((s) => ({
        ...s,
        score: this.getSourceBoost(s.source),
        matchReasons: ['Default source relevance']
      }));
    }

    const ranked: RankedContextSnippet[] = [];

    for (const snippet of snippets) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Source Base Boost
      const sourceBoost = this.getSourceBoost(snippet.source);
      score += sourceBoost;

      // 2. Heading Match
      if (snippet.sectionHeading) {
        const headingLower = snippet.sectionHeading.toLowerCase();
        let headingHits = 0;
        for (const token of queryTokens) {
          if (headingLower.includes(token)) {
            score += 20;
            headingHits++;
          }
        }
        if (headingHits > 0) {
          reasons.push(`Heading matches ${headingHits} query terms (+${headingHits * 20})`);
        }
      }

      // 3. File Path Match
      if (snippet.filePath) {
        const pathLower = snippet.filePath.toLowerCase();
        for (const token of queryTokens) {
          if (pathLower.includes(token)) {
            score += 15;
            reasons.push(`Path '${snippet.filePath}' matches term '${token}' (+15)`);
          }
        }
      }

      // 4. Content Term Frequency
      const contentLower = snippet.content.toLowerCase();
      let contentHits = 0;
      for (const token of queryTokens) {
        const matches = contentLower.split(token).length - 1;
        if (matches > 0) {
          contentHits += Math.min(matches, 5); // cap per token
        }
      }
      if (contentHits > 0) {
        const termScore = Math.min(contentHits * 3, 30);
        score += termScore;
        reasons.push(`Body content term frequency hit ${contentHits} times (+${termScore})`);
      }

      // 5. Special keyword boosts (e.g. typography, color, button, hero, navbar, dark mode)
      const specialTerms = ['color', 'typography', 'font', 'palette', 'hero', 'button', 'card', 'nav', 'dark', 'light'];
      for (const term of specialTerms) {
        if (query.toLowerCase().includes(term) && (snippet.sectionHeading?.toLowerCase().includes(term) || snippet.content.toLowerCase().includes(term))) {
          score += 10;
          reasons.push(`Domain keyword boost for '${term}' (+10)`);
          break;
        }
      }

      ranked.push({
        ...snippet,
        score,
        matchReasons: reasons
      });
    }

    // Sort descending by score
    return ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  private getSourceBoost(source: string): number {
    switch (source) {
      case 'design_md': return 20;
      case 'tokens_css': return 18;
      case 'code': return 15;
      case 'project_json': return 12;
      case 'assets': return 10;
      case 'memory': return 8;
      default: return 5;
    }
  }
}
