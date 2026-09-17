import type { SessionTurn } from '../contracts/memory.ts';
import type { MarkdownMemoryStore } from './store.ts';
import type { GeminiProviderManager } from '../providers/manager.ts';

export interface ExtractedFact {
  bucket: 'user' | 'feedback' | 'project' | 'rule';
  slug: string;
  title: string;
  content: string;
  tags?: string[];
}

export class MemoryExtractor {
  private memoryStore: MarkdownMemoryStore;
  private providerManager?: GeminiProviderManager;

  constructor(memoryStore: MarkdownMemoryStore, providerManager?: GeminiProviderManager) {
    this.memoryStore = memoryStore;
    this.providerManager = providerManager;
  }

  /**
   * Runs non-blocking background extraction of durable facts from session turns.
   */
  async extractAndSave(turns: SessionTurn[]): Promise<ExtractedFact[]> {
    if (turns.length === 0) return [];

    const userTurns = turns.filter((t) => t.role === 'user');
    if (userTurns.length === 0) return [];

    let facts: ExtractedFact[] = [];

    if (this.providerManager) {
      try {
        facts = await this.extractWithLLM(turns);
      } catch (err) {
        console.warn(`[MemoryExtractor] LLM extraction failed, falling back to heuristic:`, err);
        facts = this.extractHeuristic(turns);
      }
    } else {
      facts = this.extractHeuristic(turns);
    }

    // Persist extracted facts
    for (const fact of facts) {
      await this.memoryStore.saveEntry(
        fact.bucket,
        fact.slug,
        fact.title,
        fact.content,
        fact.tags
      );
    }

    return facts;
  }

  private async extractWithLLM(turns: SessionTurn[]): Promise<ExtractedFact[]> {
    if (!this.providerManager) return [];

    const prompt = `Analyze the following conversation turns between a user and an AI design assistant.
Identify any durable design preferences, aesthetic requirements, repeated rules, or negative constraints expressed by the user.
Ignore one-off temporary requests.

Conversation:
${turns.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n\n')}

Output valid JSON ONLY as an array of objects matching this exact format:
[
  {
    "bucket": "user" | "feedback" | "project" | "rule",
    "slug": "short-kebab-slug",
    "title": "Short Title",
    "content": "Description of the preference or rule",
    "tags": ["tag1", "tag2"]
  }
]`;

    const response = await this.providerManager.generateText({
      model: 'gemini-3.1-flash-lite',
      prompt,
      systemInstruction: 'You are an analytical design memory extraction agent. Output pure JSON only.'
    });

    try {
      const cleaned = response.text.replace(/```json\r?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as ExtractedFact[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Deterministic heuristic extractor for offline tests and fallback.
   */
  private extractHeuristic(turns: SessionTurn[]): ExtractedFact[] {
    const facts: ExtractedFact[] = [];

    for (const turn of turns) {
      if (turn.role !== 'user') continue;
      const text = turn.content.toLowerCase();

      if (text.includes('always prefer') || text.includes('i like') || text.includes('my preference')) {
        facts.push({
          bucket: 'user',
          slug: `preference_${Date.now()}`,
          title: 'User Aesthetic Preference',
          content: turn.content,
          tags: ['preference', 'style']
        });
      }

      if (text.includes('never use') || text.includes('do not use') || text.includes('avoid')) {
        facts.push({
          bucket: 'rule',
          slug: `rule_avoid_${Date.now()}`,
          title: 'Negative Constraint Rule',
          content: turn.content,
          tags: ['constraint', 'negative-rule']
        });
      }
    }

    return facts;
  }
}
