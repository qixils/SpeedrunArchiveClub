import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createOpenApiExpressMiddleware, generateOpenApiDocument } from 'trpc-to-openapi';
import express, { Request, Response } from 'express';
import { router } from './router';
import swaggerUi from 'swagger-ui-express';
import "dotenv/config";
import cors from 'cors';
import { initializeDatabase } from './utils/db';
import fs from 'fs';
import { getCdnM3u8Path } from './utils/cdn-path';

async function startServer() {
  // Initialize database before starting the server
  await initializeDatabase();

  const app = express();
  app.use(cors());

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
  const openApiDocument = generateOpenApiDocument(router, {
    title: 'Speedrun Archive Club API',
    description: 'API for accessing speedrun videos',
    version: '1.0.0',
    baseUrl: 'http://localhost:3000/api',
  });

  // Serve Swagger UI at /docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // CDN endpoints
  app.get('/cdn/:videoId.m3u8', (req: Request, res: Response) => {
    const videoId = req.params.videoId;
    const filePath = getCdnM3u8Path(videoId);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.status(404).send('Not found');
        return;
      }
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(data);
    });
  });

  const port = parseInt(process.env.PORT || '3000');
  console.log(`Server listening on port ${port}`);
  app.listen(port);
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
