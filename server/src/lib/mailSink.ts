import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Private Development Mail Sink & Outbound Email Dispatcher
 * 
 * In development and automated tests (by default), intercepts outbound emails
 * (invitations, password resets) and stores them in a private in-memory ring buffer.
 * 
 * In production (or when real transport is explicitly enabled via USE_REAL_MAIL_TRANSPORT='true'),
 * outbound emails are dispatched through a verified SMTP transport.
 * 
 * CRITICAL SECURITY INVARIANTS:
 * 1. Tokens and reset URLs are NEVER logged to stdout/stderr or console.
 * 2. In-memory sink is strictly bounded (max 50 entries) with FIFO eviction.
 * 3. In production, missing SMTP configuration fails immediately at startup/dispatch.
 * 4. Transport errors are redacted to prevent credential and secret leakage in logs.
 * 5. Delivery failures must never crash caller processes or reveal account existence.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  template: 'invitation' | 'password-reset';
  link: string;
  recipientName?: string;
  schoolName?: string;
  timestamp: Date;
}

const MAX_SINK_ENTRIES = 50;
const memorySink: OutboundEmail[] = [];

/**
 * Redact sensitive secrets (passwords, tokens, credentials, secret hashes) from error messages.
 */
export function redactTransportError(err: unknown): string {
  if (!err) return 'Unknown transport error';
  const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return raw
    .replace(/(password|pass|auth|secret|token|key|bearer|user|usr)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/(https?:\/\/[^\s]+[?&](?:token|key|secret|password)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/[a-f0-9]{32,64}/gi, '[REDACTED_TOKEN]');
}

/**
 * Validates whether required SMTP environment variables are defined.
 */
export function validateSmtpConfig(env: NodeJS.ProcessEnv = process.env): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!env.SMTP_HOST) missing.push('SMTP_HOST');
  if (!env.SMTP_USER) missing.push('SMTP_USER');
  if (!env.SMTP_PASS) missing.push('SMTP_PASS');
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Build plain text content for system email templates.
 */
function buildPlainTextBody(email: Omit<OutboundEmail, 'timestamp'>): string {
  if (email.template === 'invitation') {
    return [
      `Hello ${email.recipientName || 'there'},`,
      '',
      `You have been invited to join SeferNote${email.schoolName ? ` for ${email.schoolName}` : ''}.`,
      'To activate your account and set your password, visit the link below:',
      email.link,
      '',
      'This activation link expires in 48 hours.',
      'If you were not expecting this invitation, you can ignore this email.',
    ].join('\n');
  }

  return [
    `Hello,`,
    '',
    'A password reset request was received for your SeferNote account.',
    'To reset your password, visit the link below:',
    email.link,
    '',
    'This password reset link expires in 1 hour.',
    'If you did not request a password reset, you can safely ignore this email.',
  ].join('\n');
}

/**
 * Build HTML content for system email templates.
 */
function buildHtmlBody(rawEmail: Omit<OutboundEmail, 'timestamp'>): string {
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  const email = { ...rawEmail, schoolName: rawEmail.schoolName ? escapeHtml(rawEmail.schoolName) : undefined, link: escapeHtml(rawEmail.link) };
  const title = email.template === 'invitation' ? 'Activate Your SeferNote Account' : 'Reset Your SeferNote Password';
  const actionText = email.template === 'invitation' ? 'Activate Account' : 'Reset Password';
  const explanation = email.template === 'invitation'
    ? `You have been invited to join SeferNote${email.schoolName ? ` for <strong>${email.schoolName}</strong>` : ''}.`
    : 'A request was made to reset your SeferNote account password.';

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>${title}</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1e293b; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
          <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
          <p>${explanation}</p>
          <div style="margin: 28px 0;">
            <a href="${email.link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              ${actionText}
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Or copy and paste this URL into your browser:<br/>
            <span style="word-break: break-all; color: #2563eb;">${email.link}</span>
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            This link is sensitive and expires automatically. Do not share this email.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Dispatches an outbound system email using real SMTP transport in production
 * or writes to the private in-memory sink in development/testing.
 */
export async function sendSystemEmail(
  email: Omit<OutboundEmail, 'timestamp'>,
  options?: { customTransporter?: Transporter }
): Promise<void> {
  if (process.env.EMAIL_DELIVERY_MODE === 'disabled') throw new Error('Email delivery is explicitly disabled.');
  const isProd = process.env.NODE_ENV === 'production';
  const forceRealTransport = process.env.USE_REAL_MAIL_TRANSPORT === 'true';

  // 1. Real Transport Path (Production or explicit test configuration)
  if (isProd || forceRealTransport || options?.customTransporter) {
    let transporter = options?.customTransporter;

    if (!transporter) {
      const { valid, missing } = validateSmtpConfig();
      if (!valid) {
        throw new Error(
          `[Mail Transport Error] Missing required SMTP configuration: ${missing.join(', ')}`
        );
      }

      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
      });
    }

    const from = process.env.SMTP_FROM || 'SeferNote Security <noreply@ifyspace.tech>';

    try {
      await transporter.sendMail({
        from,
        to: email.to,
        subject: email.subject,
        text: buildPlainTextBody(email),
        html: buildHtmlBody(email),
      });
    } catch (err) {
      const redacted = redactTransportError(err);
      throw new Error(`[SMTP Delivery Failure] ${redacted}`);
    }

    return;
  }

  // 2. Private Development / Test Sink Path
  const record: OutboundEmail = {
    ...email,
    timestamp: new Date(),
  };

  memorySink.push(record);
  if (memorySink.length > MAX_SINK_ENTRIES) {
    memorySink.shift();
  }

  // Keep captured tokens and links strictly private; NEVER log full links to stdout
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Dev Mail Sink] Captured '${record.template}' email for recipient <${record.to}> (stored in private sink).`);
  }
}

/**
 * Inspection and test helpers for private mail sink.
 */
export function getMailSink(): readonly OutboundEmail[] {
  return [...memorySink];
}

export function getLastSentEmail(): OutboundEmail | undefined {
  return memorySink[memorySink.length - 1];
}

export function findSentEmail(predicate: (email: OutboundEmail) => boolean): OutboundEmail | undefined {
  return memorySink.slice().reverse().find(predicate);
}

export function clearMailSink(): void {
  memorySink.length = 0;
}
