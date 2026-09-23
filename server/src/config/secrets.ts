/**
 * Production Secret & Configuration Validation
 * 
 * Enforces fail-fast behavior: if running in production, the application
 * immediately refuses to start if cryptographic secrets are missing,
 * too short, or set to known default/insecure placeholders.
 */

export interface SecretValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProductionSecrets(env: NodeJS.ProcessEnv = process.env): SecretValidationResult {
  const isProd = env.NODE_ENV === 'production';
  const errors: string[] = [];

  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProd) {
      errors.push('JWT_SECRET is required in production.');
    }
  } else {
    if (jwtSecret.length < 32) {
      errors.push(`JWT_SECRET must be at least 32 characters long for cryptographic security (found ${jwtSecret.length}).`);
    }
    const insecurePlaceholders = [
      'change_me',
      'dev-only',
      'secret',
      'changeme',
      'supersecret',
      'default',
    ];
    const lower = jwtSecret.toLowerCase();
    if (insecurePlaceholders.some((p) => lower.includes(p))) {
      errors.push('JWT_SECRET contains an insecure development placeholder. Provide a cryptographically secure random secret.');
    }
  }

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    errors.push('DATABASE_URL is required.');
  }

  if (isProd) {
    const platformHosts = env.PLATFORM_HOSTS;
    const baseDomains = env.PLATFORM_BASE_DOMAINS;
    if (!platformHosts && !baseDomains) {
      errors.push('Either PLATFORM_HOSTS or PLATFORM_BASE_DOMAINS must be configured in production.');
    }

    const hasSmtp = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
    if (!hasSmtp && env.EMAIL_DELIVERY_MODE !== 'disabled') {
      errors.push('Production email transport (SMTP_HOST, SMTP_USER, and SMTP_PASS) must be configured in production.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gate: Call at server initialization. Throws if secrets are invalid in production.
 */
export function assertProductionSecrets(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateProductionSecrets(env);
  if (!result.valid) {
    const isProd = env.NODE_ENV === 'production';
    const message = `[FATAL] Security configuration validation failed:\n  - ${result.errors.join('\n  - ')}`;
    if (isProd) {
      console.error(message);
      throw new Error(message);
    } else {
      console.warn(`[SECURITY WARNING] Non-production configuration notice:\n  - ${result.errors.join('\n  - ')}`);
    }
  }
}
