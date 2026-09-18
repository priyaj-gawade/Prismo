import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { getEngineConfig } from '../../core/index.ts';
import { StandaloneDesignEngine } from '../../core/index.ts';
import type { TargetType } from '../../core/index.ts';

export async function startServer(port: number = 5180): Promise<{ server: http.Server; engine: StandaloneDesignEngine; port: number }> {
  const envConfig = getEngineConfig();

  const dataDir = path.resolve(process.cwd(), 'd8.7-data');
  fs.mkdirSync(dataDir, { recursive: true });

  const engine = new StandaloneDesignEngine({
    dataDir,
    previewPort: port,
    enablePreviewServer: true,
    autoExportPng: true,
    geminiKeys: envConfig.geminiKeys,
    pexelsKeys: envConfig.pexelsKeys,
    pixabayKeys: envConfig.pixabayKeys,
    unsplashKeys: envConfig.unsplashKeys
  });

  const staticPanelPath = path.resolve(import.meta.dirname, 'static', 'index.html');
  const sseClients: Set<http.ServerResponse> = new Set();

  const parseJsonBody = (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  };

  const sendJson = (res: http.ServerResponse, statusCode: number, data: any) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
  };

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      // 1. Root / UI Panel
      if (pathname === '/' || pathname === '/index.html') {
        if (fs.existsSync(staticPanelPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fs.readFileSync(staticPanelPath, 'utf8'));
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('D8.7 Standalone Design Engine running.');
        }
        return;
      }

      // 2. SSE Live Reload Events
      if (pathname === '/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write(': connected\n\n');
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }

      // 3. API Endpoints
      if (pathname === '/api/status' && req.method === 'GET') {
        const diagnostics = engine.getProviderDiagnostics();
        sendJson(res, 200, {
          status: 'ok',
          provider: 'gemini',
          accounts: diagnostics,
          stockProviders: {
            pexels: envConfig.pexelsKeys.length,
            pixabay: envConfig.pixabayKeys.length,
            unsplash: envConfig.unsplashKeys.length
          }
        });
        return;
      }

      if (pathname === '/api/projects' && req.method === 'GET') {
        const projectsDir = path.join(dataDir, 'projects');
        const projects: any[] = [];
        if (fs.existsSync(projectsDir)) {
          const dirs = fs.readdirSync(projectsDir, { withFileTypes: true });
          for (const d of dirs) {
            if (d.isDirectory()) {
              const p = await engine.getProject(d.name);
              if (p) projects.push(p);
            }
          }
        }
        sendJson(res, 200, projects);
        return;
      }

      if (pathname === '/api/projects' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const name = body.name || 'Untitled Project';
        const target: TargetType = body.target || 'poster';
        const preset = body.preset || 'modern-dark';
        const project = await engine.createProject(name, target, body.instructions, preset);
        sendJson(res, 201, project);
        return;
      }

      if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
        const projectId = pathname.replace('/api/projects/', '');
        const details = await engine.inspect(projectId);
        sendJson(res, 200, details);
        return;
      }

      if (pathname === '/api/generate' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await engine.generate({
          projectId: body.projectId,
          conversationId: body.conversationId || `conv_${Date.now()}`,
          prompt: body.prompt,
          skillName: body.skillName,
          dimensions: body.dimensions
        });

        // Broadcast reload to SSE clients
        for (const client of sseClients) {
          try { client.write(`data: ${JSON.stringify({ type: 'reload' })}\n\n`); } catch {}
        }

        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/refine' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await engine.refine({
          projectId: body.projectId,
          conversationId: body.conversationId || `conv_${Date.now()}`,
          instruction: body.instruction,
          targetElementId: body.targetElementId
        });

        for (const client of sseClients) {
          try { client.write(`data: ${JSON.stringify({ type: 'reload' })}\n\n`); } catch {}
        }

        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/export' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await engine.export(body.projectId, {
          format: body.format || 'png',
          width: body.width,
          height: body.height,
          slideIndex: body.slideIndex ? parseInt(body.slideIndex, 10) : undefined,
          outputPath: body.outputPath
        });
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/export-all' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const results = await engine.exportAllSlides(body.projectId, {
          format: body.format || 'png',
          width: body.width,
          height: body.height
        });
        sendJson(res, 200, { results, total: results.length });
        return;
      }

      if (pathname === '/api/rollback' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = await engine.rollback(body.projectId, body.version);
        sendJson(res, 200, result);
        return;
      }

      if (pathname === '/api/assets/search' && req.method === 'GET') {
        const query = url.searchParams.get('q') || '';
        const provider = url.searchParams.get('provider') as any;
        const result = await engine.getAssetManager().search({ query, provider });
        sendJson(res, 200, result);
        return;
      }

      // 4. Static Project File Preview: /projects/:projectId/...
      if (pathname.startsWith('/projects/')) {
        const rel = pathname.replace(/^\/projects\//, '');
        const filePath = path.join(dataDir, 'projects', rel);
        const safeBase = path.join(dataDir, 'projects');

        if (!path.resolve(filePath).startsWith(safeBase)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        let targetFile = filePath;
        if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) {
          targetFile = path.join(targetFile, 'index.html');
        }

        if (!fs.existsSync(targetFile)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Artifact Not Found');
          return;
        }

        const ext = path.extname(targetFile).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp'
        };

        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');

        if (ext === '.html') {
          let html = fs.readFileSync(targetFile, 'utf8');
          const reloadScript = `
<script>
  if (window.EventSource) {
    const es = new EventSource('/events');
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'reload') window.location.reload();
      } catch(err){}
    };
  }
</script>
`;
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${reloadScript}</body>`);
          } else {
            html += reloadScript;
          }
          res.writeHead(200);
          res.end(html);
          return;
        }

        res.writeHead(200);
        fs.createReadStream(targetFile).pipe(res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (err: any) {
      sendJson(res, 500, { error: err.message || String(err) });
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, () => {
      console.log(`[D8.7 Server] Running at http://localhost:${port}`);
      resolve({ server, engine, port });
    });
  });
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  const port = parseInt(process.env.D8_PORT || '5180', 10);
  startServer(port).catch(console.error);
}
