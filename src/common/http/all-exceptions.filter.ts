import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApiErrorResponse } from './api-response';

function isPrismaKnownError(
  err: unknown,
): err is PrismaClientKnownRequestError {
  if (err instanceof PrismaClientKnownRequestError) return true;
  // Fallback (in case the error crosses package boundaries)

  const name = (err as { name?: unknown }).name;

  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string' &&
    typeof name === 'string' &&
    name.includes('Prisma')
  );
}

function mapPrismaToHttp(err: PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
} {
  // Common Prisma errors:
  // P2002: Unique constraint failed
  // P2025: Record not found
  switch (err.code) {
    case 'P2002':
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Unique constraint failed',
        code: err.code,
        details: err.meta,
      };
    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found',
        code: err.code,
        details: err.meta,
      };
    default:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database error',
        code: err.code,
        details: err.meta,
      };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const existingRequestIdHeader = req.headers['x-request-id'];
    const requestId =
      (Array.isArray(existingRequestIdHeader)
        ? existingRequestIdHeader[0]
        : existingRequestIdHeader) ?? randomUUID();

    if (!res.getHeader('x-request-id')) {
      res.setHeader('x-request-id', requestId);
    }

    const timestamp = new Date().toISOString();
    const path = req.originalUrl || req.url;

    // Prisma errors
    if (isPrismaKnownError(exception)) {
      const mapped = mapPrismaToHttp(exception);
      const body: ApiErrorResponse = {
        success: false,
        message: mapped.message,
        error: { code: mapped.code, details: mapped.details },
        timestamp,
        path,
        requestId,
      };
      return res.status(mapped.statusCode).json(body);
    }

    // Nest HttpException (BadRequestException, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      let message = exception.message || 'Request error';
      let details: unknown = undefined;

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        // ValidationPipe default shape: { message: string[], error: string, statusCode: number }
        if (Array.isArray(r.message)) {
          message = 'Validation failed';
          details = r.message;
        } else if (typeof r.message === 'string') {
          message = r.message;
        }

        // keep additional fields for debugging client-side when needed
        const extra: Record<string, unknown> = { ...r };
        delete extra.statusCode;
        delete extra.message;
        if (Object.keys(extra).length > 0) {
          details = details ?? extra;
        }
      }

      const body: ApiErrorResponse = {
        success: false,
        message,
        error: details ? { details } : undefined,
        timestamp,
        path,
        requestId,
      };

      return res.status(statusCode).json(body);
    }

    // Unknown errors
    const body: ApiErrorResponse = {
      success: false,
      message: 'Internal server error',
      error:
        exception instanceof Error
          ? { details: { name: exception.name, message: exception.message } }
          : { details: exception },
      timestamp,
      path,
      requestId,
    };

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
