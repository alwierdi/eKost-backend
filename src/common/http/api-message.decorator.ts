import { SetMetadata } from '@nestjs/common';

export const API_MESSAGE_KEY = 'api:message';

/**
 * Set custom success message for a route handler (or controller).
 * If not set, message falls back to status-code default.
 */
export const ApiMessage = (message: string) =>
  SetMetadata(API_MESSAGE_KEY, message);
