import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export interface PreviewServerOptions {
  port?: number;
  baseDir: string;
}

export class PreviewServer {
  private server: http.Server | null = null;
  private port: number;
  private baseDir: string;
  private sseClients: Set<http.ServerResponse> = new Set();

  constructor(options: PreviewServerOptions) {
    this.port = options.port || 5180;
    this.baseDir = options.baseDir;
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Try next port if busy
          this.port += 1;
          this.server?.listen(this.port);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        resolve(this.port);
      });
    });
  }

  async stop(): Promise<void> {
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  notifyReload(): void {
    const data = `data: ${JSON.stringify({ type: 'reload', timestamp: Date.now() })}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(data);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  getUrl(projectId: string): string {
    return `http://localhost:${this.port}/projects/${projectId}/index.html`;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    let pathname = decodeURIComponent(url.pathname);

    // SSE endpoint for live reload
    if (pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(': connected\n\n');
      this.sseClients.add(res);

      req.on('close', () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // Static project files serving: /projects/<projectId>/...
    let filePath = path.join(this.baseDir, pathname);

    // Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.baseDir);
    if (!resolvedPath.startsWith(resolvedBase)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      filePath = path.join(resolvedPath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // If serving HTML, inject live-reload script
    if (ext === '.html') {
      let content = fs.readFileSync(filePath, 'utf8');
      const liveReloadScript = `
<script>
  (function() {
    if (window.EventSource) {
      const es = new EventSource('/events');
      es.onmessage = function(e) {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'reload') window.location.reload();
        } catch(err){}
      };
    }
  })();
</script>
`;
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${liveReloadScript}</body>`);
      } else {
        content += liveReloadScript;
      }
      res.writeHead(200);
      res.end(content);
      return;
    }

    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  }
}
