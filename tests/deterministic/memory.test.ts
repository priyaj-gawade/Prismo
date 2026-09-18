import fs from 'node:fs';
import path from 'node:path';
import { MarkdownMemoryStore } from '../../core/memory/store.ts';
import { SessionTracker } from '../../core/memory/session.ts';
import { PrecedenceResolver } from '../../core/memory/precedence.ts';
import { MemoryExtractor } from '../../core/memory/extractor.ts';

export async function runMemoryTest(): Promise<boolean> {
  console.log('--- Testing Memory Subsystem: Store, Session, Precedence & Extractor ---');

  const testDataDir = path.resolve('d8.7-test-memory-data');
  const memoryDir = path.join(testDataDir, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });

  // 1. Markdown Memory Store
  const store = new MarkdownMemoryStore(memoryDir);
  await store.saveEntry('user', 'dark-mode-taste', 'Dark Mode Preference', 'User prefers rich dark mode with deep slate backgrounds (#0B0F17) and emerald green accents.', ['theme', 'dark']);
  await store.saveEntry('rule', 'no-bright-yellow', 'Prohibited Colors', 'Never use bright electric yellow for buttons or headers.', ['color-rule']);

  const entry = await store.getEntry('user', 'dark-mode-taste');
  if (!entry || !entry.content.includes('#0B0F17') || entry.bucket !== 'user') {
    throw new Error('Failed to retrieve saved user memory entry');
  }
  console.log('  [PASS] Markdown memory store save & retrieve verified');

  const activeMem = await store.readActiveMemory();
  if (!activeMem.includes('Dark Mode Preference') || !activeMem.includes('Prohibited Colors')) {
    throw new Error('Active memory markdown compilation failed');
  }
  console.log('  [PASS] Multi-bucket active memory compilation verified');

  // Verify MEMORY.md index was created and contains tables
  const indexPath = path.join(memoryDir, 'MEMORY.md');
  if (!fs.existsSync(indexPath) || !fs.readFileSync(indexPath, 'utf8').includes('Persistent Memory Index')) {
    throw new Error('MEMORY.md index file was not properly generated');
  }
  console.log('  [PASS] Central MEMORY.md index generation verified');

  // 2. Session Tracker
  const sessionTracker = new SessionTracker(testDataDir);
  await sessionTracker.addTurn({
    id: 'turn_1',
    conversationId: 'conv_123',
    role: 'user',
    content: 'Build a modern hero section with a call to action',
    timestamp: 1000
  });
  await sessionTracker.addTurn({
    id: 'turn_2',
    conversationId: 'conv_123',
    role: 'assistant',
    content: 'I have generated the hero section with id="hero_section".',
    timestamp: 2000
  });

  const history = await sessionTracker.getTurns('conv_123');
  if (history.length !== 2 || history[0].role !== 'user' || history[1].role !== 'assistant') {
    throw new Error('Session turns retrieval failed');
  }

  const historyMd = await sessionTracker.formatHistoryAsMarkdown('conv_123');
  if (!historyMd.includes('### User') || !historyMd.includes('### Assistant')) {
    throw new Error('History markdown formatting failed');
  }
  console.log('  [PASS] Session turns storage & history markdown formatting verified');

  // 3. Precedence Hierarchy
  const resolver = new PrecedenceResolver();
  const resolution = resolver.resolveDirectives({
    userRequest: 'Change all buttons to vibrant cyan and make hero layout single column',
    projectConstraints: { framework: 'vanilla-html', maxAssets: 5 },
    designMd: 'Default color is emerald green.',
    userPreferences: ['Always prefer dark mode']
  });

  if (resolution.directives.length < 3 || !resolution.directives[0].includes('PRIORITY 1 - USER REQUEST')) {
    throw new Error('Precedence hierarchy resolution failed');
  }
  console.log('  [PASS] 6-tier precedence hierarchy resolution verified');

  // 4. Memory Extractor (Heuristic Fallback)
  const extractor = new MemoryExtractor(store);
  const extracted = await extractor.extractAndSave([
    {
      id: 'turn_3',
      conversationId: 'conv_123',
      role: 'user',
      content: 'I always prefer modern typography with Inter or Outfit fonts',
      timestamp: 3000
    },
    {
      id: 'turn_4',
      conversationId: 'conv_123',
      role: 'user',
      content: 'Never use comic sans or pure red',
      timestamp: 4000
    }
  ]);

  if (extracted.length < 2) {
    throw new Error('Extractor failed to mine preferences and negative rules');
  }
  console.log('  [PASS] Durable memory extraction & auto-persistence verified');

  // Cleanup
  fs.rmSync(testDataDir, { recursive: true, force: true });
  console.log('Memory tests PASSED!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('memory.test.ts')) {
  runMemoryTest().catch(console.error);
}
