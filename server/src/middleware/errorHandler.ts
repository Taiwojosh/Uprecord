import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.
 * Catches unhandled errors, logs them, and returns a sanitized
 * JSON response (no stack traces or internal details leak to clients).
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Server Error]', err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Handle CORS policy rejections
  if (err.message && err.message.includes('CORS Error')) {
    res.status(403).json({ error: err.message });
    return;
  }

  // Prisma known error codes
  const prismaCode = (err as any).code;
  if (prismaCode === 'P2002') {
    res.status(409).json({ error: 'A record with this data already exists.' });
    return;
  }
  if (prismaCode === 'P2025') {
    res.status(404).json({ error: 'Record not found.' });
    return;
  }

  res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
}
