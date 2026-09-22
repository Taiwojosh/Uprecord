import { Request, Response, NextFunction } from 'express';
import { createTenantDb, TenantDb } from '../dal/tenantDb.js';

// Extend Express Request to carry the tenant-scoped data access layer
declare global {
  namespace Express {
    interface Request {
      tenantDb?: TenantDb;
    }
  }
}

/**
 * Middleware: Enforce tenant isolation and attach Tenant Data Access Layer.
 * 
 * Must be placed AFTER `authenticate`. Ensures that `req.user.schoolId`
 * is present, instantiates a tenant-scoped TenantDb, and strips any
 * client-supplied schoolId from request bodies and query parameters.
 */
export function enforceTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.schoolId) {
    res.status(403).json({ error: 'Tenant context missing. Authentication may be invalid or user is not assigned to a school.' });
    return;
  }

  // Strip any client-supplied schoolId from body/query to prevent parameter tampering
  if (req.body && typeof req.body === 'object') {
    delete req.body.schoolId;
  }
  if (req.query && typeof req.query === 'object') {
    delete req.query.schoolId;
  }

  // Instantiate and bind the tenant data access layer
  req.tenantDb = createTenantDb(req.user.schoolId);

  next();
}
