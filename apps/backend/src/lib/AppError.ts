import { ErrorCodes, type ErrorCode } from '@academiaplaton/shared';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static notFound(resource: string): AppError {
    return new AppError(404, ErrorCodes.NOT_FOUND, `${resource} not found`);
  }

  static conflict(message: string): AppError {
    return new AppError(409, ErrorCodes.CONFLICT, message);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(401, ErrorCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(403, ErrorCodes.FORBIDDEN, message);
  }
}
