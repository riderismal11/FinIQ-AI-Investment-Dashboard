import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { MetricsStore } from './server/observability.js';
import path from 'path';
import { type Server } from 'http';

import { serverConfig } from './server/config.js';
import { extractErrorMessage, getOriginHost, responseContainsSecret } from './server/lib/utils.js';

// Import modular routers
import financeRouter from './server/routes/finance.js';
import aiRouter from './server/routes/ai.js';
import portfolioRouter from './server/routes/portfolio.js';

async function startServer() {
  const app = express();

  // Basic Security & Optimization Middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression({ 
    level: 6, 
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));
  app.use(express.json({ limit: '100kb' }));

  // Rate Limiters
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { error: 'Too many requests. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many AI requests. Try again in a few minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Global API pattern
  app.use('/api/', generalLimiter);

  // Health Checks & Metrics (Observability)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/healthz', (_req, res) => {
    const ok = typeof serverConfig?.ai?.provider === 'string' && (serverConfig.ai.isConfigured || serverConfig.ai.provider === 'local');
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'not-ready', provider: serverConfig.ai?.provider ?? 'local' });
  });

  app.get('/metrics', (_req, res) => {
    res.json(MetricsStore.getInstance().snapshot());
  });

  // ROUTE REGISTRATION

  // 1. Finance Routes
  app.use('/api/finance', financeRouter);

  // 2. Portfolio Routes
  app.use('/api/portfolio', portfolioRouter);

  // 3. AI Routes (with specialized security middlewares)
  
  // A. Origin Validation (Production only)
  app.use('/api/ai/', (req, res, next) => {
    if (!serverConfig.isProduction) return next();

    const originHeader = String(req.headers.origin || req.headers.referer || '');
    if (!originHeader) return next();

    const requestHost = req.headers.host || '';
    const originHost = getOriginHost(originHeader);
    if (!originHost || originHost !== requestHost) {
      return res.status(403).json({ error: 'Forbidden: external access not allowed' });
    }
    return next();
  });

  // B. AI Rate Limiting
  app.use('/api/ai/', aiLimiter);

  // C. Data Leak Prevention
  app.use('/api/ai/', (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (serverConfig.secretValues.some((secret) => responseContainsSecret(body, secret))) {
        console.error('CRITICAL: API key leak prevented.');
        return originalJson({ error: 'Internal error' });
      }
      return originalJson(body);
    };
    next();
  });

  // D. AI Logical Endpoints
  app.use('/api/ai', aiRouter);

  // Static Assets & SPA Routing
  if (!serverConfig.isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Server Initialization
  let serverInstance: Server | null = null;
  const bindPort = serverConfig.port;

  const startServerOnPort = (port: number) => {
    serverInstance = app.listen(port, '0.0.0.0', () => {
      console.log(`[FinIQ] Server running on http://localhost:${port}`);
    });

    serverInstance.on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        console.warn(`[FinIQ] Port ${port} in use, trying port ${port + 1}...`);
        serverInstance?.close(() => startServerOnPort(port + 1));
      } else {
        console.error('[FinIQ] Server error', err);
      }
    });
  };

  startServerOnPort(bindPort);
}

startServer().catch((error) => {
  console.error(`[FinIQ] Failed to start server: ${extractErrorMessage(error)}`);
});
