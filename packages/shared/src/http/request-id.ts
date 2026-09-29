export const REQUEST_ID_HEADER = 'x-request-id';

/** Standard error response shape returned by every service through the gateway. */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}
