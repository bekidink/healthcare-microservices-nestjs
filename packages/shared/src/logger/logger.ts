import pino from 'pino';

/**
 * Structured JSON logger shared by every service so logs are consistently
 * shaped across the platform. Never log PII/PHI (patient identifiers,
 * credentials, tokens) directly — pass identifiers via the `context` object
 * and redact anything sensitive before it reaches here.
 */
export function createLogger(serviceName: string) {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
  });
}

export type Logger = ReturnType<typeof createLogger>;
