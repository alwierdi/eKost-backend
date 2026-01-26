export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
  path: string;
  requestId?: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  error?: {
    code?: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
  requestId?: string;
};

export type ApiPaginated<T> = {
  data: T;
  meta: Record<string, unknown>;
};

export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success?: unknown }).success === 'boolean'
  );
}

export function isPaginatedPayload(
  value: unknown,
): value is ApiPaginated<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    'data' in v && 'meta' in v && typeof v.meta === 'object' && v.meta !== null
  );
}
