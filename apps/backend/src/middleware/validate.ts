import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate<T extends ZodTypeAny>(schema: T, target: ValidationTarget = 'body'): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    (req as unknown as Record<ValidationTarget, z.infer<T>>)[target] = parsed.data;
    next();
  };
}
