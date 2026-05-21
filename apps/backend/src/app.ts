import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { centersRouter } from './modules/centers/centers.router.js';
import { leadsRouter } from './modules/leads/leads.router.js';
import { studentsRouter } from './modules/students/students.router.js';
import { teachersRouter } from './modules/teachers/teachers.router.js';
import { groupsRouter } from './modules/groups/groups.router.js';
import { sessionsRouter } from './modules/sessions/sessions.router.js';
import { sepaRouter } from './modules/billing/sepa.router.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 200,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/centers', centersRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/teachers', teachersRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/sepa-mandates', sepaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
