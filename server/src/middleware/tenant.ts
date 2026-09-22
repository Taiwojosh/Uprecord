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
 * Must be placed AFTER `authenticate` and `resolveTenantFromHostname`.
 * 
 * Enforces:
 * 1. Authenticated user has a valid schoolId.
 * 2. Hostname/Session agreement: If request arrived on a school-specific portal
 *    (subdomain or verified custom domain), user.schoolId MUST match req.resolvedSchool.id.
 * 3. On platform hosts (req.resolvedSchool is null), tenant is derived from the user's session.
 * 4. Blanket superadmin bypass is removed: superadmins cannot impersonate or execute
 *    arbitrary actions on school portal routes without going through dedicated platform admin routes.
 * 5. Strips client-supplied schoolId from request bodies and query parameters.
 * 6. Instantiates tenantDb scoped strictly to req.user.schoolId.
 */
export function enforceTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.schoolId) {
    res.status(403).json({
      error: 'Tenant context missing. Authentication may be invalid or user is not assigned to a school.',
    });
    return;
  }

  // 1. Hostname/Session Agreement Check
  if (req.resolvedSchool) {
    // Superadmins cannot access individual school portal routes directly
    if (req.user.role === 'superadmin' || req.user.isSuperAdmin) {
      res.status(403).json({
        error: 'Superadmin accounts must use dedicated platform administration routes.',
      });
      return;
    }

    // Normal users must belong to the exact school portal they are accessing
    if (req.user.schoolId !== req.resolvedSchool.id) {
      res.status(403).json({
        error: `Hostname tenant mismatch: Your authenticated session belongs to a different school portal.`,
      });
      return;
    }
  }

  // 2. Strip client-supplied schoolId from body/query to prevent parameter tampering
  if (req.body && typeof req.body === 'object') {
    delete req.body.schoolId;
  }
  if (req.query && typeof req.query === 'object') {
    delete req.query.schoolId;
  }

  // 3. Instantiate and bind the tenant data access layer
  req.tenantDb = createTenantDb(req.user.schoolId);

  next();
}
