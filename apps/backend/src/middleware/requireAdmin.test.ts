import { describe, it, expect } from 'vitest';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import request from 'supertest';
import { requireAdmin } from './requireAdmin.js';
import { AppError } from '../lib/AppError.js';

// P0 #2 — `requireAdmin` fail-closed (sin header → 401, rol incorrecto → 403,
// admin → 200). Test directo del middleware con una mini-app Express. No
// arrastra la app real ni Prisma. Inlineamos un error handler equivalente al
// real para no importar `errorHandler` desde error.ts (cuya cadena de imports
// tira de `logger` → `env` y exige DATABASE_URL en arranque).

const testErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal' } });
};

function buildApp() {
  const app = express();
  app.get('/protected', requireAdmin, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(testErrorHandler);
  return app;
}

describe('requireAdmin middleware (fail-closed)', () => {
  it('should return 401 when x-user-role header is missing', async () => {
    const app = buildApp();

    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when x-user-role header is empty', async () => {
    const app = buildApp();

    const res = await request(app).get('/protected').set('x-user-role', '   ');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 when role is center_manager (identified but not admin)', async () => {
    const app = buildApp();

    const res = await request(app).get('/protected').set('x-user-role', 'center_manager');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 403 when role is teacher', async () => {
    const app = buildApp();

    const res = await request(app).get('/protected').set('x-user-role', 'teacher');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should let admin through (200)', async () => {
    const app = buildApp();

    const res = await request(app).get('/protected').set('x-user-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
