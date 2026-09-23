import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import studentRoutes from './routes/students.js';
import classRoutes from './routes/classes.js';
import settingsRoutes from './routes/settings.js';
import schoolsRoutes from './routes/schools.js';
import aiRoutes from './routes/ai.js';
import { corsMiddleware } from './middleware/cors.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getTrustedProxySetting } from './config/domains.js';
import { resolveTenantFromHostname } from './middleware/hostnameTenant.js';

// Load environment variables
dotenv.config();

import { assertProductionSecrets } from './config/secrets.js';
assertProductionSecrets();

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

// ─── Proxy Trust Configuration ───────────────────────────────────────
// Configured explicitly per deployment; never hardcoded to blindly trust all proxies.
app.set('trust proxy', getTrustedProxySetting());

// ─── Global Security Middleware ──────────────────────────────────────

// Strict credentialed CORS supporting configured origins and custom school domains
app.use(corsMiddleware);

// Cookie parser for HttpOnly session and CSRF cookies
app.use(cookieParser());

// Body parser with 10MB limit for base64 media uploads
app.use(express.json({ limit: '10mb' }));

// Double-submit CSRF protection for cookie-authenticated state-modifying requests
app.use(csrfProtection);

// ─── Health Check (Platform & Monitoring) ────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', product: 'GlobePen', timestamp: new Date().toISOString() });
});

// ─── Server-Side Hostname Tenant Resolution ──────────────────────────
// Inspects Host/hostname, validates against allowed platform hosts, subdomains,
// or verified custom domains. Rejects unknown/unverified hosts with HTTP 404.
app.use(resolveTenantFromHostname);

// ─── API Routes ──────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

// ─── Global Error Handler (must be last) ─────────────────────────────

app.use(errorHandler);

// ─── Start Server (only when run directly) ───────────────────────────

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🔒 GlobePen API Server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;
