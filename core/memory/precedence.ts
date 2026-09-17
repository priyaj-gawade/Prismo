/**
 * Precedence hierarchy implementation:
 * Current User Request > Project Constraints > Active DESIGN.md > User Preferences > Memory Defaults > Skill Defaults
 */

export interface PrecedenceContext {
  userRequest: string;
  projectConstraints?: Record<string, any>;
  designMd?: string;
  userPreferences?: string[];
  memoryDefaults?: string[];
  skillDefaults?: Record<string, any>;
}

export interface ResolvedRule {
  key: string;
  source: 'user_request' | 'project_constraints' | 'design_md' | 'user_preferences' | 'memory_defaults' | 'skill_defaults';
  value: any;
  overriddenBy?: string;
}

export class PrecedenceResolver {
  /**
   * Resolves instructions according to the strict priority chain.
   * Higher priority levels explicitly preempt lower priority levels.
   */
  resolveDirectives(context: PrecedenceContext): {
    directives: string[];
    precedenceLog: string[];
  } {
    const directives: string[] = [];
    const precedenceLog: string[] = [];

    // 1. Current User Request (Rank 1 - Supreme)
    if (context.userRequest && context.userRequest.trim()) {
      directives.push(`[PRIORITY 1 - USER REQUEST]: ${context.userRequest.trim()}`);
      precedenceLog.push('Rank 1 active: Immediate user prompt takes supreme precedence over all defaults and memory.');
    }

    // 2. Project Constraints (Rank 2)
    if (context.projectConstraints && Object.keys(context.projectConstraints).length > 0) {
      directives.push(`[PRIORITY 2 - PROJECT CONSTRAINTS]: ${JSON.stringify(context.projectConstraints)}`);
      precedenceLog.push('Rank 2 active: Explicit project constraints applied.');
    }

    // 3. Active DESIGN.md (Rank 3)
    if (context.designMd && context.designMd.trim()) {
      directives.push(`[PRIORITY 3 - DESIGN SYSTEM]: Follow active DESIGN.md layout, tokens, and aesthetic specifications unless contradicted by User Request.`);
      precedenceLog.push('Rank 3 active: DESIGN.md rules applied.');
    }

    // 4. User Preferences (Rank 4)
    if (context.userPreferences && context.userPreferences.length > 0) {
      for (const pref of context.userPreferences) {
        directives.push(`[PRIORITY 4 - USER PREFERENCE]: ${pref}`);
      }
      precedenceLog.push(`Rank 4 active: ${context.userPreferences.length} durable user preferences applied.`);
    }

    // 5. Memory Defaults (Rank 5)
    if (context.memoryDefaults && context.memoryDefaults.length > 0) {
      for (const mem of context.memoryDefaults) {
        directives.push(`[PRIORITY 5 - MEMORY DEFAULT]: ${mem}`);
      }
      precedenceLog.push(`Rank 5 active: ${context.memoryDefaults.length} background memory defaults loaded.`);
    }

    // 6. Skill Defaults (Rank 6 - Lowest)
    if (context.skillDefaults && Object.keys(context.skillDefaults).length > 0) {
      directives.push(`[PRIORITY 6 - SKILL DEFAULTS]: ${JSON.stringify(context.skillDefaults)}`);
      precedenceLog.push('Rank 6 active: Base skill parameters applied.');
    }

    return { directives, precedenceLog };
  }

  /**
   * Explains precedence conflict resolution between two directives.
   */
  hasDirectConflict(directiveA: string, directiveB: string): boolean {
    const lowerA = directiveA.toLowerCase();
    const lowerB = directiveB.toLowerCase();
    // Common design conflict keywords
    if ((lowerA.includes('dark mode') || lowerA.includes('theme: dark')) &&
        (lowerB.includes('light mode') || lowerB.includes('theme: light'))) {
      return true;
    }
    if ((lowerA.includes('minimalist') && lowerB.includes('maximalist')) ||
        (lowerA.includes('single-page') && lowerB.includes('multi-page'))) {
      return true;
    }
    return false;
  }
}
