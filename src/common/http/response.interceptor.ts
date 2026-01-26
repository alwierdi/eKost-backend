import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  ApiSuccessResponse,
  isApiResponse,
  isPaginatedPayload,
} from './api-response';

function defaultMessageFromStatus(statusCode: number): string {
  if (statusCode === 201) return 'Created';
  if (statusCode === 204) return 'No Content';
  if (statusCode >= 200 && statusCode < 300) return 'OK';
  return 'OK';
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const existingRequestIdHeader = req.headers['x-request-id'];
    const requestId =
      (Array.isArray(existingRequestIdHeader)
        ? existingRequestIdHeader[0]
        : existingRequestIdHeader) ?? randomUUID();

    if (!res.getHeader('x-request-id')) {
      res.setHeader('x-request-id', requestId);
    }

    return next.handle().pipe(
      map((value: unknown) => {
        // Respect endpoints that intentionally return no body.
        if (res.statusCode === 204) {
          return undefined as unknown as ApiResponse<unknown>;
        }

        // If a controller explicitly returns ApiResponse, do not wrap twice.
        if (isApiResponse(value)) return value;

        const timestamp = new Date().toISOString();
        const path = req.originalUrl || req.url;
        const message = defaultMessageFromStatus(res.statusCode);

        // Lift pagination meta if services return { data, meta }.
        if (isPaginatedPayload(value)) {
          const body: ApiSuccessResponse<unknown> = {
            success: true,
            message,
            data: value.data,
            meta: value.meta,
            timestamp,
            path,
            requestId,
          };
          return body;
        }

        const body: ApiSuccessResponse<unknown> = {
          success: true,
          message,
          data: value,
          timestamp,
          path,
          requestId,
        };
        return body;
      }),
    );
  }
}
