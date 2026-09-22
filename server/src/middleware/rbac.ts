import { Request, Response, NextFunction } from 'express';

/**
 * Server-Side Role-Based Access Control (RBAC)
 * 
 * Enforces hierarchical and role-specific permissions across:
 * - superadmin: Platform-wide access
 * - admin: School administrator (full school management)
 * - teacher: Instructional staff (classes, attendance, grading)
 * - student: Individual student (self-access only)
 */

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Platform superadmin always has administrative bypass
    if (req.user.isSuperAdmin || req.user.role === 'superadmin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden. Role '${req.user.role}' is not authorized for this resource. Required: [${roles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireTeacherOrAdmin = requireRole('admin', 'teacher');

/**
 * Ensures that a student can only access their own student-scoped resource,
 * while teachers and administrators can access any student in their tenant.
 */
export function requireSelfOrStaff(getStudentId: (req: Request) => number | null) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (req.user.isSuperAdmin || req.user.role === 'admin' || req.user.role === 'teacher') {
      return next();
    }

    const targetStudentId = getStudentId(req);
    if (req.user.role === 'student' && req.user.studentId && targetStudentId && req.user.studentId === targetStudentId) {
      return next();
    }

    res.status(403).json({ error: 'Forbidden: You are only permitted to access your own student records.' });
  };
}
