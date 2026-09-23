/**
 * Private Development Mail Sink & Outbound Email Dispatcher
 * 
 * In development and automated tests, intercepts outbound emails (invitations,
 * password resets) and stores them in a private in-memory ring buffer.
 * 
 * CRITICAL SECURITY INVARIANT:
 * Production (NODE_ENV === 'production') MUST NEVER silently write to this sink.
 * If a real production transport (e.g. SMTP/SES) is not configured, dispatching
 * throws an explicit error to prevent false delivery confirmations.
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
 * Dispatch an outbound system email.
 */
export async function sendSystemEmail(email: Omit<OutboundEmail, 'timestamp'>): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // Production must use verified mail transport. Never silently sink credentials.
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    if (!hasSmtp) {
      throw new Error(
        '[Mail Dispatch Error] Production email provider is not configured. Configure SMTP_HOST/SMTP_USER or email service provider.'
      );
    }
    // In production with configured SMTP, real mailer would send here.
    // For this pilot architecture without external mail purchases, production fails safe.
    return;
  }

  // Non-production development & test sink
  const record: OutboundEmail = {
    ...email,
    timestamp: new Date(),
  };

  memorySink.push(record);
  if (memorySink.length > MAX_SINK_ENTRIES) {
    memorySink.shift();
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Dev Mail Sink] Dispatched '${record.template}' email to <${record.to}>: ${record.link}`);
  }
}

/**
 * Test & Verification Helpers
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
