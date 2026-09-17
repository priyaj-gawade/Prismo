import fs from 'node:fs';
import path from 'node:path';
import type { MemoryBucket, MemoryEntry, MemoryStore } from '../contracts/memory.ts';

export class MarkdownMemoryStore implements MemoryStore {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'd8.7-data', 'memory');
    fs.mkdirSync(this.baseDir, { recursive: true });
    this.ensureIndexFile();
  }

  private ensureIndexFile(): void {
    const indexPath = path.join(this.baseDir, 'MEMORY.md');
    if (!fs.existsSync(indexPath)) {
      const initialContent = `# Persistent Memory Index\n\nActive memory buckets and cross-project knowledge.\n\n`;
      fs.writeFileSync(indexPath, initialContent, 'utf8');
    }
  }

  private getFilename(bucket: MemoryBucket, slug: string): string {
    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    return `${bucket}_${safeSlug}.md`;
  }

  async saveEntry(bucket: MemoryBucket, slug: string, title: string, content: string, tags?: string[]): Promise<MemoryEntry> {
    const filename = this.getFilename(bucket, slug);
    const filePath = path.join(this.baseDir, filename);
    const now = Date.now();

    let createdAt = now;
    if (fs.existsSync(filePath)) {
      const existing = await this.getEntry(bucket, slug);
      if (existing) {
        createdAt = existing.createdAt;
      }
    }

    const tagList = tags && tags.length > 0 ? tags.join(', ') : '';
    const frontmatter = [
      '---',
      `id: ${bucket}_${slug}`,
      `bucket: ${bucket}`,
      `title: ${title}`,
      `tags: [${tagList}]`,
      `createdAt: ${createdAt}`,
      `updatedAt: ${now}`,
      '---',
      ''
    ].join('\n');

    const fileBody = `${frontmatter}\n# ${title}\n\n${content.trim()}\n`;
    fs.writeFileSync(filePath, fileBody, 'utf8');
    this.updateIndexFile();

    return {
      id: `${bucket}_${slug}`,
      bucket,
      title,
      content: content.trim(),
      createdAt,
      updatedAt: now,
      tags
    };
  }

  async getEntry(bucket: MemoryBucket, slug: string): Promise<MemoryEntry | null> {
    const filename = this.getFilename(bucket, slug);
    const filePath = path.join(this.baseDir, filename);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf8');
    return this.parseFile(raw, `${bucket}_${slug}`, bucket);
  }

  async listEntries(bucket?: MemoryBucket): Promise<MemoryEntry[]> {
    if (!fs.existsSync(this.baseDir)) return [];
    const files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
    const entries: MemoryEntry[] = [];

    for (const file of files) {
      const match = file.match(/^([a-z]+)_(.+)\.md$/);
      if (!match) continue;
      const fileBucket = match[1] as MemoryBucket;
      if (bucket && fileBucket !== bucket) continue;

      const raw = fs.readFileSync(path.join(this.baseDir, file), 'utf8');
      const entry = this.parseFile(raw, `${fileBucket}_${match[2]}`, fileBucket);
      if (entry) entries.push(entry);
    }

    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteEntry(bucket: MemoryBucket, slug: string): Promise<boolean> {
    const filename = this.getFilename(bucket, slug);
    const filePath = path.join(this.baseDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.updateIndexFile();
      return true;
    }
    return false;
  }

  async readActiveMemory(): Promise<string> {
    const entries = await this.listEntries();
    if (entries.length === 0) {
      return 'No active persistent memory recorded.';
    }

    const sections: string[] = ['## Persistent Memory'];
    for (const entry of entries) {
      sections.push(`### [${entry.bucket.toUpperCase()}] ${entry.title}\n${entry.content}`);
    }
    return sections.join('\n\n');
  }

  private parseFile(raw: string, id: string, bucket: MemoryBucket): MemoryEntry | null {
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!fmMatch) {
      return {
        id,
        bucket,
        title: id,
        content: raw.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    const fm = fmMatch[1];
    const body = fmMatch[2].replace(/^#\s+[^\r\n]+\r?\n/, '').trim();

    let title = id;
    let createdAt = Date.now();
    let updatedAt = Date.now();
    let tags: string[] | undefined = undefined;

    for (const line of fm.split('\n')) {
      const [key, ...vals] = line.split(':');
      if (!key || vals.length === 0) continue;
      const k = key.trim();
      const val = vals.join(':').trim();

      if (k === 'title') title = val;
      if (k === 'createdAt') createdAt = Number(val) || Date.now();
      if (k === 'updatedAt') updatedAt = Number(val) || Date.now();
      if (k === 'tags') {
        const cleaned = val.replace(/^\[|\]$/g, '').trim();
        if (cleaned) {
          tags = cleaned.split(',').map((t) => t.trim());
        }
      }
    }

    return {
      id,
      bucket,
      title,
      content: body,
      createdAt,
      updatedAt,
      tags
    };
  }

  private updateIndexFile(): void {
    const files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
    const lines = [
      '# Persistent Memory Index',
      '',
      `Last updated: ${new Date().toISOString()}`,
      '',
      '| Bucket | Title | File | Updated |',
      '| :--- | :--- | :--- | :--- |'
    ];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(this.baseDir, file), 'utf8');
      const match = file.match(/^([a-z]+)_(.+)\.md$/);
      if (!match) continue;
      const bucket = match[1];
      const entry = this.parseFile(raw, file, bucket as MemoryBucket);
      if (entry) {
        lines.push(`| ${bucket} | ${entry.title} | [${file}](./${file}) | ${new Date(entry.updatedAt).toISOString()} |`);
      }
    }

    fs.writeFileSync(path.join(this.baseDir, 'MEMORY.md'), lines.join('\n') + '\n', 'utf8');
  }
}
