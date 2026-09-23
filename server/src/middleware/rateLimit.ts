import { Request, Response, NextFunction } from 'express';

/**
 * In-Memory Rate Limiter with Strict Capacity Cap & LRU Eviction
 * 
 * ALGORITHM: Per-Key Fixed Window Counter
 * - On the first request for a given key (IP address or normalized account email),
 *   a window is initialized with count = 1 and resetTime = now + windowMs.
 * - Subsequent requests within [now, resetTime] increment count and update recency.
 * - When now >= resetTime, the window expires and a new window begins.
 * 
 * CAPACITY EXHAUSTION & MEMORY BOUNDING:
 * - Pruning expired entries periodically (every 60s) removes stale keys.
 * - When all entries are concurrently active and the store reaches maxEntries:
 *   1. It runs an immediate prune() pass.
 *   2. If the store remains at or above maxEntries (i.e. every entry is unexpired),
 *      it evicts the Least Recently Used (LRU) entry via Map key iteration order.
 *   3. This guarantees that memory usage is strictly bounded and will NEVER exceed
 *      maxEntries, preventing memory exhaustion under DoS attacks with randomized keys.
 * 
 * DEPLOYMENT SCOPE:
 * - Designed specifically for single-node deployments and school pilot instances.
 * - State resets on server restart. For distributed multi-node production clusters,
 *   replace this with a Redis/Memcached cluster.
 */

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class MemoryStore {
  private hits = new Map<string, RateLimitRecord>();
  private sweepTimer: NodeJS.Timeout | null = null;
  public readonly maxEntries: number;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
    // Periodic sweep every 60 seconds to prune expired buckets
    this.sweepTimer = setInterval(() => this.prune(), 60000);
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.hits.get(key);

    if (existing && existing.resetTime > now) {
      existing.count += 1;
      // Refresh recency for LRU ordering
      this.hits.delete(key);
      this.hits.set(key, existing);
      return { count: existing.count, resetTime: existing.resetTime };
    }

    // Safety guard against unbounded memory growth under DoS
    if (this.hits.size >= this.maxEntries) {
      this.prune();
      // If store is still at or above capacity (all entries active), evict LRU entry
      while (this.hits.size >= this.maxEntries) {
        const oldestKey = this.hits.keys().next().value;
        if (!oldestKey) break;
        this.hits.delete(oldestKey);
      }
    }

    const resetTime = now + windowMs;
    const record: RateLimitRecord = { count: 1, resetTime };
    this.hits.set(key, record);
    return record;
  }

  get(key: string): RateLimitRecord | undefined {
    const now = Date.now();
    const record = this.hits.get(key);
    if (!record) return undefined;
    if (record.resetTime <= now) {
      this.hits.delete(key);
      return undefined;
    }
    // Refresh recency
    this.hits.delete(key);
    this.hits.set(key, record);
    return record;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  clear(): void {
    this.hits.clear();
  }

  getSize(): number {
    return this.hits.size;
  }

  prune(): void {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (record.resetTime <= now) {
        this.hits.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.hits.clear();
  }
}

export const sharedStore = new MemoryStore(10000);

export function resetRateLimitStore(): void {
  sharedStore.clear();
}

/**
 * Extract client IP accounting for configured proxies.
 */
export function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Normalize an email identifier for account-based rate limiting.
 */
export function normalizeAccountKey(email?: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Dual Rate Limiter Middleware Factory
 * 
 * Enforces two separate limits:
 * 1. IP Limiter: Bound generously (default: 50 requests / 15m) to account for an
 *    entire school campus sharing a single public outbound NAT IP.
 * 2. Account Limiter: Bound strictly (default: 5 attempts / 15m) per normalized
 *    account identifier (email), preventing targeted password brute-forcing.
 */
export function createDualRateLimiter(options: {
  windowMs: number;
  ipMax: number;
  accountMax: number;
  accountKeyExtractor?: (req: Request) => string | null;
  message?: string;
  store?: MemoryStore;
}) {
  const {
    windowMs,
    ipMax,
    accountMax,
    accountKeyExtractor = (req) => normalizeAccountKey(req.body?.email),
    message = 'Too many requests. Please try again later.',
    store = sharedStore,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientIp = getClientIp(req);
    const ipKey = `ip:${clientIp}:${req.baseUrl}${req.path}`;

    // 1. Evaluate IP Limit
    const ipRecord = store.increment(ipKey, windowMs);
    if (ipRecord.count > ipMax) {
      const retryAfterSec = Math.max(1, Math.ceil((ipRecord.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('RateLimit-Limit', ipMax);
      res.setHeader('RateLimit-Remaining', 0);
      res.setHeader('RateLimit-Reset', Math.ceil(ipRecord.resetTime / 1000));
      res.status(429).json({
        error: message,
        reason: 'ip_limit_exceeded',
        retryAfter: retryAfterSec,
      });
      return;
    }

    // 2. Evaluate Account Limit if identifier present
    const account = accountKeyExtractor(req);
    if (account) {
      const accountKey = `acc:${account}:${req.baseUrl}${req.path}`;
      const accountRecord = store.increment(accountKey, windowMs);

      if (accountRecord.count > accountMax) {
        const retryAfterSec = Math.max(1, Math.ceil((accountRecord.resetTime - now) / 1000));
        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('RateLimit-Limit', accountMax);
        res.setHeader('RateLimit-Remaining', 0);
        res.setHeader('RateLimit-Reset', Math.ceil(accountRecord.resetTime / 1000));
        res.status(429).json({
          error: message,
          reason: 'account_limit_exceeded',
          retryAfter: retryAfterSec,
        });
        return;
      }

      res.setHeader('RateLimit-Limit', accountMax);
      res.setHeader('RateLimit-Remaining', Math.max(0, accountMax - accountRecord.count));
      res.setHeader('RateLimit-Reset', Math.ceil(accountRecord.resetTime / 1000));
    } else {
      res.setHeader('RateLimit-Limit', ipMax);
      res.setHeader('RateLimit-Remaining', Math.max(0, ipMax - ipRecord.count));
      res.setHeader('RateLimit-Reset', Math.ceil(ipRecord.resetTime / 1000));
    }

    next();
  };
}

/**
 * Standard pre-configured rate limiters
 */

// Login limiter: 5 attempts per account, 50 per IP per 15 minutes
export const loginRateLimiter = createDualRateLimiter({
  windowMs: 15 * 60 * 1000,
  ipMax: 50,
  accountMax: 5,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
});

// Platform Superadmin login limiter: 5 attempts per account, 50 per IP per 15 minutes
export const adminLoginRateLimiter = createDualRateLimiter({
  windowMs: 15 * 60 * 1000,
  ipMax: 50,
  accountMax: 5,
  message: 'Too many administrative login attempts. Please wait 15 minutes before trying again.',
});

// Forgot Password limiter: 3 requests per account, 20 per IP per 15 minutes
export const forgotPasswordRateLimiter = createDualRateLimiter({
  windowMs: 15 * 60 * 1000,
  ipMax: 20,
  accountMax: 3,
  message: 'Too many password reset requests. Please wait a few minutes before trying again.',
});

// Password Reset submission limiter: 5 attempts per IP per 15 minutes
export const resetPasswordRateLimiter = createDualRateLimiter({
  windowMs: 15 * 60 * 1000,
  ipMax: 20,
  accountMax: 5,
  accountKeyExtractor: (req) => {
    const token = req.body?.token;
    return typeof token === 'string' && token.length > 8 ? token.slice(0, 16) : null;
  },
  message: 'Too many password reset attempts. Please wait 15 minutes before trying again.',
});
