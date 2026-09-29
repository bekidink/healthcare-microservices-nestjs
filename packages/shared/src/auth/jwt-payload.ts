/**
 * Access tokens carry identity + a token version/nonce for revocation
 * checks — never a full role/permission list, since those must be resolved
 * server-side per request (a cached permission list would go stale the
 * moment a role/membership changes).
 */
export interface AccessTokenPayload {
  sub: string; // userId
  sid: string; // sessionId, for revocation checks
  activeOrganizationId?: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

/**
 * What the gateway attaches to a request's auth context after validating the
 * access token and resolving the caller's membership/permissions for the
 * request's target organization — this is what downstream services trust,
 * never a raw ID parsed from the request body/path.
 */
export interface AuthContext {
  userId: string;
  sessionId: string;
  organizationId?: string;
  permissions: string[];
}
