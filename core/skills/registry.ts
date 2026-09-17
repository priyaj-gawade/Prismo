import fs from 'node:fs';
import path from 'node:path';
import type { TargetType } from '../contracts/engine.ts';
import type { SkillDefinition } from './types.ts';

export class SkillRegistry {
  private skillsDir: string;
  private skills: Map<string, SkillDefinition> = new Map();

  constructor(customSkillsDir?: string) {
    this.skillsDir = customSkillsDir || path.resolve(import.meta.dirname, '../../skills');
    this.loadSkills();
  }

  private loadSkills(): void {
    if (!fs.existsSync(this.skillsDir)) return;

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf8');
          const skill = this.parseSkillMd(content, entry.name);
          if (skill) {
            this.skills.set(skill.name, skill);
          }
        }
      }
    }
  }

  private parseSkillMd(raw: string, dirName: string): SkillDefinition | null {
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    let name = dirName;
    let targetType: TargetType = 'poster';
    let description = '';

    let body = raw;

    if (fmMatch) {
      const fm = fmMatch[1];
      body = fmMatch[2].trim();

      for (const line of fm.split('\n')) {
        const [k, ...v] = line.split(':');
        if (!k || v.length === 0) continue;
        const key = k.trim();
        const val = v.join(':').trim();

        if (key === 'name') name = val;
        if (key === 'targetType') targetType = val as TargetType;
        if (key === 'description') description = val;
      }
    }

    const rules: string[] = [];
    for (const line of body.split('\n')) {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        rules.push(line.trim().replace(/^[-*]\s+/, ''));
      }
    }

    return {
      name,
      targetType,
      description,
      rules,
      markdownContent: body
    };
  }

  getSkill(name: string): SkillDefinition | null {
    return this.skills.get(name) || null;
  }

  resolveSkillForTarget(target: TargetType): SkillDefinition | null {
    for (const skill of this.skills.values()) {
      if (skill.targetType === target || skill.name === target) {
        return skill;
      }
    }
    // Fallback to poster
    return this.skills.get('poster') || null;
  }

  listSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }
}
