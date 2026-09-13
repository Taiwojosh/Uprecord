# Backend Implementation Plan: Multi-Tenant School Management System

This plan outlines the modular implementation of a production-ready Express backend with PostgreSQL/Prisma, JWT authentication, and multi-tenancy.

## Phase 1: Environment & Schema Setup
- [x] Initialize Prisma and configure database connection (SQLite used for dev).
- [x] Define the multi-tenant database schema (School, User, Student, Class, Result, Subscription, Subject).
- [x] Implement a global `school_id` filter strategy.

## Phase 2: Core Middleware & Utilities
- [x] Setup global error handling middleware.
- [x] Implement JWT authentication and Role-Based Access Control (RBAC) middleware.
- [x] Create validation utilities using Zod.
- [x] Implement Multi-tenancy context middleware.

## Phase 3: Authentication Module
- [x] `POST /api/auth/register`: Register school and admin user.
- [x] `POST /api/auth/login`: Issue JWT.
- [x] `GET /api/auth/me`: Fetch current user details.

## Phase 4: Students & Teachers Module
- [x] `GET /api/students`: List students for the school.
- [x] CRUD for Students.
- [x] `GET /api/teachers`: Manage teacher accounts (Admin only).

## Phase 5: Classes, Subjects & Results Module
- [x] CRUD for Classes and Subjects.
- [x] `POST /api/results/bulk-upload`: Process results.
- [x] `GET /api/results`: Fetch results with ranking logic (optimized via SQL).

## Phase 6: Subscriptions & Dashboard
- [x] `GET /api/dashboard/stats`: High-level analytics for the multi-tenant SaaS.
- [x] `POST /api/subscriptions/webhook`: Paystack integration.
- [x] Middleware to block access if subscription is inactive.

## Phase 7: Integration & Refactoring
- [ ] Refactor `server.ts` to use the new modular routes.
- [ ] Update `package.json` with necessary scripts and dependencies.
- [ ] Final verification and performance check of ranking logic.
