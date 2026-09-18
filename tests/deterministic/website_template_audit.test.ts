import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebsiteTemplateRegistry } from '../../core/templates/registry.ts';
import { PromptComposer } from '../../core/prompt/composer.ts';
import { DESIGN_PRESETS, getPreset } from '../../core/design-system/presets.ts';

describe('Website Template & Generation Audit Verification', () => {
  const registry = new WebsiteTemplateRegistry();

  it('correctly matches bright/white templates for bright portfolio query and rejects dark templates', () => {
    const query = 'modern bright, white dyanamic 3d portfolio website for a python developer';
    const matches = registry.matchTemplates(query, 5);
    
    assert.ok(matches.length > 0, 'Should find matching templates');
    const top = matches[0];
    
    // Top template must NOT be the dark ethan-clark-designer-16 template
    assert.notEqual(top.slug, 'ethan-clark-designer-16', 'Must not pick the dark Ethan Clark template for a bright/white query');
    
    // Top template should have clean, minimal, white, or light tags/desc
    const tagString = (top.tags || []).join(' ').toLowerCase() + ' ' + (top.description || '').toLowerCase();
    const isLightOrClean = tagString.includes('clean') || tagString.includes('minimal') || tagString.includes('white') || tagString.includes('light');
    assert.ok(isLightOrClean, 'Selected template should match light/clean aesthetic');
  });

  it('correctly matches dark templates when dark theme is explicitly requested', () => {
    const query = 'dark cyberpunk neon terminal portfolio for rust engineer';
    const matches = registry.matchTemplates(query, 5);
    
    assert.ok(matches.length > 0);
    const top = matches[0];
    const tagString = (top.tags || []).join(' ').toLowerCase() + ' ' + (top.description || '').toLowerCase();
    assert.ok(tagString.includes('dark'), 'Selected template must match dark theme when dark requested');
  });

  it('includes modern-bright-white preset with crisp white tokens and no generic purple', () => {
    const whitePreset = getPreset('modern-bright-white');
    assert.ok(whitePreset, 'modern-bright-white preset must exist');
    assert.equal(whitePreset.colors.background, '#FFFFFF');
    assert.equal(whitePreset.colors.surface, '#F8FAFC');
    assert.equal(whitePreset.colors.primary, '#2563EB'); // Royal Electric Blue
    assert.notEqual(whitePreset.colors.primary, '#6366F1'); // Not purple
  });

  it('prompt composer enforces universal anti-purple and professional icons rules', () => {
    const composer = new PromptComposer();
    const result = composer.compose({
      userPrompt: 'modern bright, white 3d portfolio website for a python developer'
    });

    assert.ok(result.systemInstruction.includes('ANTI-AI-SLOP & PALETTE DISCIPLINE'), 'Must include anti-ai-slop palette rule');
    assert.ok(result.systemInstruction.includes('NEVER default to generic purple/violet backgrounds'), 'Must explicitly ban generic purple');
    assert.ok(result.systemInstruction.includes('PROFESSIONAL ICONS (NO EMOJIS)'), 'Must enforce professional vector icons');
    assert.ok(result.systemInstruction.includes('NEVER use raw Unicode emojis'), 'Must explicitly ban raw emojis');
  });
});
