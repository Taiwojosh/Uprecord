import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { sendSystemEmail } from '../src/lib/mailSink.js';

describe('Demo release safeguards', () => {
  it('does not expose captured recovery emails over HTTP', async () => {
    const response = await request(app).get('/api/auth/__dev/mail-sink/latest').set('Host', 'localhost');
    expect(response.status).toBe(404);
  });
  it('explicitly disables mail operations without pretending to deliver', async () => {
    const previous = process.env.EMAIL_DELIVERY_MODE;
    process.env.EMAIL_DELIVERY_MODE = 'disabled';
    try {
      const capabilities = await request(app).get('/api/auth/capabilities').set('Host', 'localhost');
      expect(capabilities.body.emailEnabled).toBe(false);
      const recovery = await request(app).post('/api/auth/forgot-password').set('Host', 'localhost').send({ email: 'nobody@example.test' });
      expect(recovery.status).toBe(503);
      const anonymousInvite = await request(app).post('/api/auth/invite').set('Host', 'localhost').send({ email: 'nobody@example.test' });
      expect(anonymousInvite.status).toBe(401);
      await expect(sendSystemEmail({ to: 'nobody@example.test', subject: 'Disabled', template: 'password-reset', link: 'https://example.test/reset' })).rejects.toThrow('disabled');
    } finally {
      if (previous === undefined) delete process.env.EMAIL_DELIVERY_MODE;
      else process.env.EMAIL_DELIVERY_MODE = previous;
    }
  });
});
