import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createOpenApiExpressMiddleware, generateOpenApiDocument } from 'trpc-to-openapi';
import express, { NextFunction, Request, Response } from 'express';
import { router } from './router';
import swaggerUi from 'swagger-ui-express';
import "dotenv/config";
import cors from 'cors';
import { initializeDatabase } from './utils/db';
import fs from 'fs/promises';
import { getCdnM3u8Path } from './utils/cdn-path';
import zlib from "zlib";
import { promisify } from "util";

const decompress = promisify((zlib as any).zstdDecompress as typeof zlib.unzip); // Node 22.15+

async function startServer() {
  // Initialize database before starting the server
  await initializeDatabase();

  const app = express();
  app.use(cors());
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  // Define context
  const createContext = ({ req }: { req: Request }) => {
    const adminSecret = req.headers['x-admin-secret'];
    return {
      ...(typeof adminSecret === 'string' && { adminSecret }),
    };
  };

  const config = { router, createContext } as const

  // Mount tRPC at /trpc
  app.use('/trpc', createExpressMiddleware(config));

  // Mount OpenAPI routes
  app.use('/api', createOpenApiExpressMiddleware(config));

  // Generate OpenAPI document
  const baseOrigin = 'https://archive.speedrun.club'
  const baseUrl = `/api`
  const openApiDocument = generateOpenApiDocument(router, {
    title: 'Speedrun Archive Club API',
    description: 'API for accessing speedrun videos',
    version: '1.0.0',
    baseUrl,
  });
  openApiDocument.servers = [{ url: baseUrl, description: 'Production' }]
  console.log("docs", baseUrl, JSON.stringify(openApiDocument.servers))

  // swagger ui package is broken on prod??? so we write a little middleware to fkn hack it
  function rewriteDocsHost(req: Request, res: Response, next: NextFunction) {
    // only run in production (optional)
    // if (process.env.NODE_ENV !== 'production') return next();

    const originalSend = res.send.bind(res);

    res.send = function (body?: any) {
      try {
        // only touch string bodies (HTML / JS)
        if (typeof body === 'string') {
          // replace common localhost patterns
          body = body
            .replace(/http:\/\/localhost:3000/g, baseOrigin)
            // .replace(/http:\/\/127\.0\.0\.1:3000/g, baseOrigin)
            // sometimes swagger UI produces `window.location.origin + '/api'` fragments;
            // you can add more replacements if you find patterns in the bundle
            ;
        }
      } catch (err) {
        // if replacement fails, continue with original body
        console.error('docs rewrite failed', err);
      }
      return originalSend(body);
    };

    next();
  }

  // Serve Swagger UI at /docs
  app.use('/docs', rewriteDocsHost, swaggerUi.serve, swaggerUi.setup(openApiDocument, { swaggerOptions: { urls: [{ url: baseUrl, name: 'Production' }] } }));

  // CDN endpoints
  app.get('/cdn/:videoId.m3u8', async (req: Request, res: Response) => {
    const videoId = req.params.videoId;
    const filePath = getCdnM3u8Path(videoId);
    try {
      const contents = await fs.readFile(filePath)
      const data = await decompress(contents)

      const lines = data.toString('utf-8').trim().split('\n')
      let root = lines.shift()
      if (!root) {
        res.status(500).send('Unable to parse cdn file');
        return;
      }

      if (req.query.cors) {
        root = `https://corsproxy.io/?url=${encodeURIComponent(root)}`
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#')) continue
        lines[i] = `${root}${line}`
      }
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(lines.join('\n'));
    } catch {
      res.status(404).send('Not found');
    }
  });

  const port = parseInt(process.env.PORT || '3000');
  console.log(`Server listening on port ${port}`);
  app.listen(port);
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
