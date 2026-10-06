import {
  ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import * as Sentry from '@sentry/node';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Ocurrió un error inesperado en el servidor';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || exception.message;
        errorType = (res as any).error || exception.name;
      } else {
        message = res || exception.message;
        errorType = exception.name;
      }
    } else if (exception instanceof QueryFailedError) {
      const err = exception as any;
      this.logger.error(`Database Query Error [${err.code}]: ${err.message}`, err.stack);

      if (err.code === '23505') {
        // Unique violation
        status = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esta información única.';
        errorType = 'Conflict';
      } else if (err.code === '23503') {
        // Foreign key violation
        status = HttpStatus.BAD_REQUEST;
        message = 'La operación hace referencia a un registro que no existe.';
        errorType = 'ForeignKeyViolation';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Error en la consulta de base de datos.';
        errorType = 'DatabaseError';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = process.env.NODE_ENV === 'production'
        ? 'Ocurrió un error inesperado en el servidor.'
        : exception.message;
    } else {
      this.logger.error('Unknown Exception thrown', String(exception));
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR && process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        error: errorType,
        message: Array.isArray(message) ? message : [message],
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
