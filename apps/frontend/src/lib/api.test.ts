import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage } from './api';

// P0 #7 — getErrorMessage blindaje 5xx
//
// El backend nunca debería leakear mensajes internos (SQLSTATE, queries
// Prisma, stacktraces) al usuario final. Aunque el errorHandler de Express
// ya devuelve un `INTERNAL_ERROR_MESSAGE` genérico para errores no AppError,
// el frontend mantiene una segunda defensa: para CUALQUIER 5xx, ignoramos
// `data.error.message` y devolvemos el mensaje genérico hardcodeado.

const GENERIC_5XX_MESSAGE = 'Error interno del servidor. Inténtalo de nuevo más tarde.';

function makeAxiosError(opts: {
  status: number;
  message?: string;
  bodyMessage?: string;
}): AxiosError {
  const err = new AxiosError(opts.message ?? 'Request failed');
  err.response = {
    status: opts.status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
    data: opts.bodyMessage
      ? { error: { code: 'INTERNAL_ERROR', message: opts.bodyMessage } }
      : undefined,
  };
  return err;
}

describe('getErrorMessage', () => {
  it('should mask the backend message for 500 errors (even if body leaks internals)', () => {
    const err = makeAxiosError({
      status: 500,
      message: 'Request failed with status code 500',
      bodyMessage:
        'SQLSTATE 42000: query Prisma at line 42: SELECT * FROM students WHERE ...',
    });

    expect(getErrorMessage(err)).toBe(GENERIC_5XX_MESSAGE);
  });

  it('should mask the backend message for 502/503/504 (any 5xx)', () => {
    for (const status of [502, 503, 504]) {
      const err = makeAxiosError({
        status,
        bodyMessage: 'whatever the backend says',
      });
      expect(getErrorMessage(err)).toBe(GENERIC_5XX_MESSAGE);
    }
  });

  it('should pass through the backend message for 4xx errors (e.g. 400 validation)', () => {
    const err = makeAxiosError({
      status: 400,
      bodyMessage: 'Validation error: monthlyFee must be > 0',
    });

    expect(getErrorMessage(err)).toBe('Validation error: monthlyFee must be > 0');
  });

  it('should pass through the backend message for 409 conflict', () => {
    const err = makeAxiosError({
      status: 409,
      bodyMessage: 'Slug already in use',
    });

    expect(getErrorMessage(err)).toBe('Slug already in use');
  });

  it('should fall back to axios message when 4xx has no canonical body', () => {
    const err = makeAxiosError({
      status: 404,
      message: 'Request failed with status code 404',
    });

    expect(getErrorMessage(err)).toBe('Request failed with status code 404');
  });

  it('should handle plain Error instances', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('should stringify unknown error shapes', () => {
    expect(getErrorMessage('plain string')).toBe('plain string');
  });
});
