/**
 * Agent-Facing Ratio Capability, Tool Declarations, and Precedence Coordinator.
 * 
 * Invariants:
 * 1. Runtime binds projectId: The model NEVER chooses or supplies projectId.
 * 2. Precedence: Explicit User > Agent Decision > Default.
 * 3. Zero keyword-to-ratio heuristics: The agent reasons about geometry, not code.
 * 4. Zero silent coercion: Unsupported explicit user ratios fail immediately.
 */

import {
  SUPPORTED_RATIOS,
  CANONICAL_RATIO_REGISTRY,
  type SupportedRatio,
  type CanonicalDimension,
  type RatioState,
  ProjectRatioCapability,
  parseExplicitRatio,
  isSupportedRatio
} from './ratio.ts';
import type { FunctionDeclaration } from '../contracts/models.ts';

/**
 * Gemini-compliant function declarations exposed to the agent.
 * Note: projectId is strictly bound by the runtime; never exposed as a model parameter.
 */
export const RATIO_FUNCTION_DECLARATIONS: readonly FunctionDeclaration[] = [
  {
    name: 'get_supported_ratios',
    description: 'Retrieve the five canonical aspect ratios supported by D8.7, their exact pixel dimensions, and non-authoritative common usage notes.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'get_current_ratio',
    description: 'Get the active aspect ratio state for the current project, including dimensions, origin, and whether it is locked by an explicit user request.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'set_ratio',
    description: 'Set the aspect ratio for the current project. Must be one of the five canonical ratios: "3:4", "9:16", "16:9", "1:1", "4:3". Rejects arbitrary dimensions and cannot override active explicit user instructions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        ratio: {
          type: 'STRING',
          enum: ['3:4', '9:16', '16:9', '1:1', '4:3'],
          description: 'The canonical aspect ratio identifier'
        }
      },
      required: ['ratio']
    }
  }
] as const;

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentTool {
  readonly declaration: FunctionDeclaration;
  execute(projectId: string, args: Record<string, unknown>): ToolExecutionResult | Promise<ToolExecutionResult>;
}

export class AgentToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.declaration.name, tool);
  }

  getDeclarations(): FunctionDeclaration[] {
    return Array.from(this.tools.values()).map((t) => t.declaration);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  async executeTool(projectId: string, toolCall: ToolCall): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      return { success: false, error: `Unknown tool: "${toolCall.name}"` };
    }
    return tool.execute(projectId, toolCall.args || {});
  }
}

export function createRatioToolRegistry(capability: ProjectRatioCapability): AgentToolRegistry {
  const registry = new AgentToolRegistry();

  registry.registerTool({
    declaration: RATIO_FUNCTION_DECLARATIONS[0],
    execute: () => {
      const ratios = capability.getSupportedRatios().map((r) => ({
        ratio: r,
        dimensions: capability.getDimensions(r),
        commonUseCases: CANONICAL_RATIO_REGISTRY[r].commonUseCases
      }));
      return { success: true, data: { supportedRatios: ratios } };
    }
  });

  registry.registerTool({
    declaration: RATIO_FUNCTION_DECLARATIONS[1],
    execute: (projectId) => {
      return { success: true, data: capability.getProjectRatio(projectId) };
    }
  });

  registry.registerTool({
    declaration: RATIO_FUNCTION_DECLARATIONS[2],
    execute: (projectId, args) => {
      const ratio = args?.ratio as string;
      if (!ratio || typeof ratio !== 'string') {
        return { success: false, error: 'Missing required argument "ratio".' };
      }
      if (!capability.validateRatio(ratio)) {
        return {
          success: false,
          error: `Unsupported ratio "${ratio}". Supported ratios are: ${capability.getSupportedRatios().join(', ')}.`
        };
      }
      try {
        const updated = capability.setProjectRatio(projectId, ratio as SupportedRatio, 'agent_decision');
        return { success: true, data: updated };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  });

  return registry;
}

/**
 * Tool Execution Dispatcher.
 * Executes ratio tools on the project-scoped capability with runtime-injected projectId.
 */
export class RatioToolDispatcher {
  private capability: ProjectRatioCapability;
  private registry: AgentToolRegistry;

  constructor(capability: ProjectRatioCapability) {
    this.capability = capability;
    this.registry = createRatioToolRegistry(capability);
  }

  getRegistry(): AgentToolRegistry {
    return this.registry;
  }

  executeTool(
    projectId: string,
    toolCall: ToolCall
  ): ToolExecutionResult {
    switch (toolCall.name) {
      case 'get_supported_ratios': {
        const ratios = this.capability.getSupportedRatios().map((r) => ({
          ratio: r,
          dimensions: this.capability.getDimensions(r),
          commonUseCases: CANONICAL_RATIO_REGISTRY[r].commonUseCases
        }));
        return { success: true, data: { supportedRatios: ratios } };
      }

      case 'get_current_ratio': {
        const current = this.capability.getProjectRatio(projectId);
        return { success: true, data: current };
      }

      case 'set_ratio': {
        const ratio = toolCall.args?.ratio as string;
        if (!ratio || typeof ratio !== 'string') {
          return {
            success: false,
            error: 'Missing required argument "ratio".'
          };
        }

        if (!this.capability.validateRatio(ratio)) {
          return {
            success: false,
            error: `Unsupported ratio "${ratio}". Supported ratios are: ${this.capability.getSupportedRatios().join(', ')}.`
          };
        }

        try {
          const updated = this.capability.setProjectRatio(projectId, ratio as SupportedRatio, 'agent_decision');
          return { success: true, data: updated };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      }

      default:
        return { success: false, error: `Unknown ratio tool: "${toolCall.name}"` };
    }
  }
}

/**
 * Detects whether a subsequent user instruction on an existing project
 * actually calls for a format, geometry, or display adaptation,
 * vs an ordinary content, copy, styling, or layout refinement.
 */
export function isGeometryAdaptationRequest(prompt: string): boolean {
  if (!prompt || typeof prompt !== 'string') return false;
  const lower = prompt.toLowerCase();

  const adaptationPatterns = [
    // Direct geometry / aspect ratio alteration keywords
    /\b(?:aspect\s*ratio|change\s*ratio|switch\s*ratio|set\s*ratio|new\s*ratio)\b/,
    /\b(?:reformat|re-format|resize|rescale|convert\s+to|adapt\s+to|switch\s+to)\b/,
    /\b(?:make\s+this\s+(?:suitable\s+for|for|fit|into|as))\b/,
    // Specific geometry shapes / orientations when requested as target
    /\b(?:square\s*(?:post|feed|format|tile|photo|version|canvas)?)\b/,
    /\b(?:landscape\s*(?:slide|presentation|banner|billboard|format|version|canvas)?)\b/,
    /\b(?:vertical\s*(?:story|stories|reel|reels|video|format|version|canvas)?)\b/,
    /\b(?:presentation\s*(?:slide|deck|format|version)?)\b/,
    /\b(?:instagram(?:\s*(?:square|post|feed|story|reel))?)\b/,
    /\b(?:mobile\s*(?:story|reel|screen|video|format))\b/,
    /\b(?:widescreen|ultrawide)\b/
  ];

  return adaptationPatterns.some((p) => p.test(lower));
}

export interface TurnRatioEvaluation {
  explicitFound: boolean;
  activeRatioState: RatioState;
  shouldRunAgentRatioTool: boolean;
  isAdaptationTurn?: boolean;
  unsupportedError?: string;
}

/**
 * Ratio Precedence Coordinator.
 * Strictly enforces the precedence lifecycle: Explicit User > Agent Decision > Default.
 * Responsibilities:
 * - parse explicit user instructions
 * - enforce explicit ratio lock (Explicit User > Agent Decision)
 * - reject unsupported explicit user ratios immediately (no silent conversion)
 * - refresh lock on new explicit instruction in subsequent turns
 * - preserve existing agent-selected ratios by default across normal content/refinement turns
 * - allow agent ratio re-evaluation only when the prompt calls for a geometry adaptation
 * 
 * INVARIANT: Zero keyword-to-ratio heuristics or automated topic routing.
 */
export class RatioPrecedenceCoordinator {
  private capability: ProjectRatioCapability;

  constructor(capability: ProjectRatioCapability) {
    this.capability = capability;
  }

  evaluateTurn(projectId: string, prompt: string): TurnRatioEvaluation {
    const explicit = parseExplicitRatio(prompt);

    // 1. Explicit Unsupported -> Halt immediately with error (No silent coercion)
    if (explicit.found && !explicit.isSupported) {
      return {
        explicitFound: true,
        shouldRunAgentRatioTool: false,
        activeRatioState: this.capability.getProjectRatio(projectId),
        unsupportedError: explicit.error
      };
    }

    // 2. Explicit Supported -> Set ratio and lock for this turn/run
    // Across turns: A new explicit user instruction replaces the previous ratio and refreshes the lock.
    if (explicit.found && explicit.canonicalRatio) {
      const state = this.capability.setProjectRatio(projectId, explicit.canonicalRatio, 'explicit_user');
      return {
        explicitFound: true,
        shouldRunAgentRatioTool: false,
        activeRatioState: state
      };
    }

    // 3. No explicit ratio in prompt -> Inspect existing project ratio origin
    const existing = this.capability.getProjectRatio(projectId);

    // 3A. If project is locked by a prior explicit user turn, maintain it strictly
    if (existing.origin === 'explicit_user' && existing.locked) {
      return {
        explicitFound: false,
        shouldRunAgentRatioTool: false,
        activeRatioState: existing
      };
    }

    // 3B. If project is fresh (origin === 'default'), agent decides ratio on initial generation
    if (existing.origin === 'default') {
      return {
        explicitFound: false,
        shouldRunAgentRatioTool: true,
        isAdaptationTurn: false,
        activeRatioState: existing
      };
    }

    // 3C. If project already has an agent-selected ratio (origin === 'agent_decision'):
    // Preserved by default! Only allow agent re-evaluation if current prompt calls for a geometry adaptation.
    const callsForAdaptation = isGeometryAdaptationRequest(prompt);
    if (callsForAdaptation) {
      return {
        explicitFound: false,
        shouldRunAgentRatioTool: true,
        isAdaptationTurn: true,
        activeRatioState: existing
      };
    }

    // Ordinary refinement/content edit -> Stable ratio by default, zero unexpected mutation
    return {
      explicitFound: false,
      shouldRunAgentRatioTool: false,
      isAdaptationTurn: false,
      activeRatioState: existing
    };
  }
}

/**
 * Formats advisory ratio context for the agent prompt.
 * Contains no automated routing rules; purely informative.
 */
export function formatRatioAgentContext(current: RatioState, isAdaptation: boolean = false): string {
  const supported = SUPPORTED_RATIOS.map((r) => {
    const meta = CANONICAL_RATIO_REGISTRY[r];
    return `- ${r} (${meta.dimensions.width}x${meta.dimensions.height}, ${meta.orientation}) [Notes: ${meta.commonUseCases.join(', ')}]`;
  }).join('\n');

  const adaptationDirective = isAdaptation
    ? `\nNOTE ON RATIO STABILITY & ADAPTATION:
- Active project geometry is currently: ${current.ratio} (${current.origin}).
- The user is asking to adapt or reformat the design for a new display context.
- If the requested adaptation calls for a specific format (e.g. square -> 1:1, landscape/presentation -> 16:9 or 4:3, vertical story/reel -> 9:16), call set_ratio with the corresponding canonical ratio.
- If the existing ratio ${current.ratio} is already optimal, make no tool call to preserve it.`
    : `\nAGENT INSTRUCTIONS FOR ASPECT RATIO:
- If the user explicitly specified an aspect ratio, it is locked and you must not alter it.
- If the user did NOT specify a ratio, reason about the domain, subject, and intended display context.
- To set a ratio, call the tool: set_ratio(ratio: "3:4" | "9:16" | "16:9" | "1:1" | "4:3").
- Common use case notes are informational examples only; choose the ratio that best communicates the subject.
- If you make no tool call, the active project geometry (${current.ratio}) is maintained.`;

  return `
ASPECT RATIO CAPABILITY:
Active Project Geometry: ${current.ratio} (${current.dimensions.width}x${current.dimensions.height}, origin: ${current.origin}, locked: ${current.locked})

Available Canonical Ratios:
${supported}
${adaptationDirective}`;
}
