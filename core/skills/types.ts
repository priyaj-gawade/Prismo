import type { TargetType } from '../contracts/engine.ts';

export interface SkillDimensions {
  width?: number;
  height?: number;
  aspectRatio?: string; // '1:1' | '4:5' | '1.91:1' | '9:16' | '16:9'
}

export interface SkillDefinition {
  name: string;
  targetType: TargetType;
  description: string;
  dimensions?: SkillDimensions;
  slides?: number;
  requiredSections?: string[];
  rules: string[];
  markdownContent: string;
}
