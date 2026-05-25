import axios, { AxiosError } from 'axios';
import type { ApiError } from '@academiaplaton/shared';

// NOTE: `getErrorCode` se retiró por estar exportado pero sin consumidores.
// Para reintroducirlo con valor real (p.ej. mensaje específico cuando se
// intenta borrar una categoría con expenses asociados) el backend debe
// emitir un código más específico que el actual `CONFLICT` (ver
// `categoriesService.delete` en accounting.service.ts).

// Base URL del backend. Vite expone VITE_* en `import.meta.env`. Por defecto,
// dev local del backend en :3000. En producción se inyecta vía env.
const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor temporal: mientras no haya auth real (ver CLAUDE.md §2.a), el
// frontend marca el rol del usuario actual en una cabecera para que el
// middleware `requireAdmin` del backend pueda discriminar admin vs el resto.
// Se rellena desde fuera (ver `setAuthRole`) y se elimina al hacer logout.
let currentRole: string | null = null;

export function setAuthRole(role: string | null): void {
  currentRole = role;
}

api.interceptors.request.use((config) => {
  if (currentRole) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['x-user-role'] = currentRole;
  }
  return config;
});

// Mensaje genérico para 5xx. Evita filtrar stacktraces, mensajes de Prisma u
// otros internals del backend al admin via UI. No usamos `t()` aquí porque
// esta función vive fuera del árbol React (no hay hook context disponible).
const INTERNAL_ERROR_MESSAGE = 'Error interno del servidor. Inténtalo de nuevo más tarde.';

// Extrae un mensaje legible de un AxiosError respetando el formato canónico
// `{ error: { code, message } }` que devuelve el backend. Para respuestas 5xx
// devolvemos un mensaje genérico (blindaje contra leak de detalles internos).
// Para 4xx con cuerpo canónico, devolvemos el mensaje del backend. Si no
// encaja, caemos a `err.message`. Nunca devuelve `undefined`.
export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    if (typeof status === 'number' && status >= 500) {
      return INTERNAL_ERROR_MESSAGE;
    }
    const data = err.response?.data as ApiError | undefined;
    if (data?.error?.message) return data.error.message;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

