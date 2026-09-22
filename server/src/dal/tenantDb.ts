import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export class TenantIsolationError extends Error {
  constructor(message = 'Access denied: Tenant isolation violation.') {
    super(message);
    this.name = 'TenantIsolationError';
  }
}

/**
 * Tenant-Aware Data Access Layer (DAL)
 * 
 * Guarantees that EVERY database query and mutation on tenant-owned models
 * is strictly scoped to the tenant's `schoolId`.
 * 
 * Route handlers must NEVER call raw un-scoped Prisma methods for tenant data.
 */
export class TenantDb {
  readonly schoolId: string;

  constructor(schoolId: string) {
    if (!schoolId || typeof schoolId !== 'string') {
      throw new TenantIsolationError('A valid schoolId is required to construct TenantDb.');
    }
    this.schoolId = schoolId;
  }

  // ─── Students ────────────────────────────────────────────────────────
  students = {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; take?: number; skip?: number }) => {
      const where = { ...(args?.where || {}), schoolId: this.schoolId };
      return prisma.student.findMany({
        ...args,
        where,
      });
    },

    findById: async (id: number, include?: any) => {
      return prisma.student.findFirst({
        where: { id, schoolId: this.schoolId },
        include,
      });
    },

    findByAdmission: async (admissionNumber: string) => {
      return prisma.student.findFirst({
        where: { admissionNumber, schoolId: this.schoolId },
      });
    },

    count: async (where?: any) => {
      return prisma.student.count({
        where: { ...(where || {}), schoolId: this.schoolId },
      });
    },

    create: async (data: Omit<Prisma.StudentCreateInput, 'school'> & { classId: number }) => {
      // Strips any caller-provided school or schoolId to guarantee isolation
      const cleanData: any = { ...data };
      delete cleanData.schoolId;
      delete cleanData.school;

      return prisma.student.create({
        data: {
          ...cleanData,
          school: { connect: { id: this.schoolId } },
        },
      });
    },

    update: async (id: number, data: any) => {
      // Verify ownership before updating
      const existing = await prisma.student.findFirst({
        where: { id, schoolId: this.schoolId },
      });

      if (!existing) {
        throw new TenantIsolationError(`Student with ID ${id} not found in this tenant context.`);
      }

      const cleanData = { ...data };
      delete cleanData.schoolId;
      delete cleanData.school;

      return prisma.student.update({
        where: { id },
        data: cleanData,
      });
    },

    delete: async (id: number) => {
      // Verify ownership before deleting
      const existing = await prisma.student.findFirst({
        where: { id, schoolId: this.schoolId },
      });

      if (!existing) {
        throw new TenantIsolationError(`Student with ID ${id} not found in this tenant context.`);
      }

      return prisma.student.delete({
        where: { id },
      });
    },
  };

  // ─── Classes ─────────────────────────────────────────────────────────
  classes = {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      return prisma.class.findMany({
        ...args,
        where: { ...(args?.where || {}), schoolId: this.schoolId },
      });
    },

    findById: async (id: number, include?: any) => {
      return prisma.class.findFirst({
        where: { id, schoolId: this.schoolId },
        include,
      });
    },

    create: async (data: any) => {
      const cleanData = { ...data };
      delete cleanData.schoolId;

      return prisma.class.create({
        data: {
          ...cleanData,
          schoolId: this.schoolId,
        },
      });
    },

    update: async (id: number, data: any) => {
      const existing = await prisma.class.findFirst({
        where: { id, schoolId: this.schoolId },
      });

      if (!existing) {
        throw new TenantIsolationError(`Class with ID ${id} not found in this tenant context.`);
      }

      const cleanData = { ...data };
      delete cleanData.schoolId;

      return prisma.class.update({
        where: { id },
        data: cleanData,
      });
    },

    delete: async (id: number) => {
      const existing = await prisma.class.findFirst({
        where: { id, schoolId: this.schoolId },
      });

      if (!existing) {
        throw new TenantIsolationError(`Class with ID ${id} not found in this tenant context.`);
      }

      return prisma.class.delete({
        where: { id },
      });
    },
  };

  // ─── Subjects ────────────────────────────────────────────────────────
  subjects = {
    findMany: async (args?: { where?: any; include?: any }) => {
      return prisma.subject.findMany({
        ...args,
        where: { ...(args?.where || {}), schoolId: this.schoolId },
      });
    },

    findById: async (id: number) => {
      return prisma.subject.findFirst({
        where: { id, schoolId: this.schoolId },
      });
    },

    create: async (data: any) => {
      const cleanData = { ...data };
      delete cleanData.schoolId;

      return prisma.subject.create({
        data: {
          ...cleanData,
          schoolId: this.schoolId,
        },
      });
    },

    delete: async (id: number) => {
      const existing = await prisma.subject.findFirst({
        where: { id, schoolId: this.schoolId },
      });

      if (!existing) {
        throw new TenantIsolationError(`Subject with ID ${id} not found in this tenant context.`);
      }

      return prisma.subject.delete({
        where: { id },
      });
    },
  };

  // ─── Grades / Results ────────────────────────────────────────────────
  grades = {
    findMany: async (args?: { where?: any; include?: any }) => {
      return prisma.grade.findMany({
        ...args,
        where: { ...(args?.where || {}), schoolId: this.schoolId },
      });
    },

    upsert: async (studentId: number, subjectId: number, term: number, session: string, data: any) => {
      // Verify both student and subject belong to this school
      const [student, subject] = await Promise.all([
        prisma.student.findFirst({ where: { id: studentId, schoolId: this.schoolId } }),
        prisma.subject.findFirst({ where: { id: subjectId, schoolId: this.schoolId } }),
      ]);

      if (!student || !subject) {
        throw new TenantIsolationError('Student or subject does not belong to this school.');
      }

      return prisma.grade.upsert({
        where: {
          schoolId_studentId_subjectId_term_session: {
            schoolId: this.schoolId,
            studentId,
            subjectId,
            term,
            session,
          },
        },
        update: data,
        create: {
          ...data,
          studentId,
          subjectId,
          term,
          session,
          schoolId: this.schoolId,
        },
      });
    },
  };

  // ─── School Settings ─────────────────────────────────────────────────
  settings = {
    get: async () => {
      return prisma.schoolSettings.findUnique({
        where: { schoolId: this.schoolId },
      });
    },

    update: async (data: any) => {
      const cleanData = { ...data };
      delete cleanData.schoolId;
      delete cleanData.id;

      return prisma.schoolSettings.upsert({
        where: { schoolId: this.schoolId },
        update: cleanData,
        create: {
          ...cleanData,
          schoolId: this.schoolId,
          schoolName: cleanData.schoolName || 'My School',
        },
      });
    },
  };

  // ─── Users in School ─────────────────────────────────────────────────
  users = {
    findMany: async (args?: { where?: any; select?: any }) => {
      return prisma.user.findMany({
        ...args,
        where: { ...(args?.where || {}), schoolId: this.schoolId },
      });
    },

    findById: async (id: number) => {
      return prisma.user.findFirst({
        where: { id, schoolId: this.schoolId },
      });
    },
  };

  // ─── Attendance ──────────────────────────────────────────────────────
  attendance = {
    findMany: async (args?: { where?: any; include?: any }) => {
      return prisma.attendance.findMany({
        ...args,
        where: { ...(args?.where || {}), schoolId: this.schoolId },
      });
    },
  };
}

/**
 * Factory to create a tenant-scoped database context.
 */
export function createTenantDb(schoolId: string): TenantDb {
  return new TenantDb(schoolId);
}
