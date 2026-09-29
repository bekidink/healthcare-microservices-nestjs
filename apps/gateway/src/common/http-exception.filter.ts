import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, type ApiErrorResponse } from '@healthcare/shared';

/**
 * Normalizes every error thrown inside the gateway itself to the platform's
 * standard { code, message, details, requestId } shape. Errors coming back
 * from a proxied downstream service pass through as-is (each service is
 * responsible for shaping its own error responses the same way) — this
 * filter only covers failures the gateway itself produces (auth, rate
 * limiting, routing, validation).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers[REQUEST_ID_HEADER] as string) || 'unknown';

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof body === 'string'
        ? body
        : (body as any)?.message || (exception instanceof Error ? exception.message : 'Internal error');

    const payload: ApiErrorResponse = {
      code: HttpStatus[status] || 'INTERNAL_ERROR',
      message: Array.isArray(message) ? message.join(', ') : message,
      details: typeof body === 'object' ? body : undefined,
      requestId,
    };

    response.status(status).json(payload);
  }
}
