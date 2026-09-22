# SuperTokens assessment for GlobePen

Reviewed 22 September 2026. Preference: no recurring authentication vendor fees.

## Recommendation

SuperTokens is technically suitable for replacing GlobePen's hand-written login
and session handling, but it is a separate authentication migration, not a
branding dependency. Finish the school pilot release gate first. Then prototype
the free, self-hosted core on staging, with one default authentication tenant and
GlobePen retaining school membership, roles, status, and hostname authorization.
Do not enable commercial features or move existing users during this phase.

The self-hosted open-source core has no MAU licensing cap. Email/password,
password reset, email verification and session management are included. Native
multitenancy, unified login across domains, MFA and account linking are listed as
paid add-ons. Free licensing still leaves hosting, backups, operations and email
delivery costs. [Official pricing](https://supertokens.com/pricing).

## Fit with the actual code

GlobePen uses React 19, Vite 6, Express 5, Prisma 6, bcrypt password hashes and
HttpOnly JWT cookies. `User.email` is globally unique and each user has one
schoolId today, so one authentication user pool fits the current model. Moving
to multiple-school memberships or allowing different identities with the same
email would require additional application design.

The backend must map a verified SuperTokens identity to the existing numeric
User.id, reload its active status and permissions, then enforce the existing
schoolId and hostname checks. A SuperTokens tenant ID is not school-access
authorization. [Official tenant concepts](https://supertokens.com/docs/authentication/enterprise/important-concepts).

Use host-only cookies and same-origin `/api` routing for each school portal.
Require a separate login on unrelated custom domains. This is a proposed free
design to validate against the chosen SDK version, not a claim that arbitrary
domains work with the default configuration. The official unified-login flow is
an OAuth-based separate capability. Never share a wildcard session cookie across
schools merely to simplify login. [Multiple-domain guide](https://supertokens.com/docs/authentication/unified-login/quickstart-guides/multiple-frontends-with-a-single-backend).

## Required work before adoption

1. Run a pinned SuperTokens Core release and its supported PostgreSQL version on
   a private network. Keep Core and PostgreSQL off public ports; configure the
   Core API key, health checks, backups and resource limits. GlobePen's business
   database can remain SQLite for this pilot. Docker is not installed on this
   Windows machine; an isolated staging environment is needed for a full service
   test. [Self-hosting documentation](https://supertokens.com/docs/deployment/self-host-supertokens).
2. Verify the selected Node/React SDK versions against React 19, Express 5 and the
   server's Node version. Replace AuthContext/API session handling and backend
   authenticate middleware together; preserve every existing tenant test.
3. Disable default public sign-up. Keep school registration and staff invitations
   authoritative in GlobePen. Handle partial failure between the business DB and
   authentication service with reconciliation; never create unassigned active
   school users. Restrict superadmin access to platform hosts.
4. Rehearse bcrypt-hash migration with an explicit identity mapping. Handle
   pending invitations separately, and require fresh login at cutover rather
   than silently trusting old cookies indefinitely. Password migration is
   supported; it must be rehearsed with this application's actual data.
   [Account migration](https://supertokens.com/docs/migration/account-migration).
5. Verify reset and verification links use only server-approved portal origins;
   unknown Host headers must never choose email-link destinations. Configure a
   real email provider and test delivery without exposing credentials to Vite.
6. Test login, logout/revocation, refresh, expired sessions, suspended users,
   invitations, recovery, wrong-school access, custom-domain cookies, CSRF,
   service outage, and rollback with two isolated schools. Do not automatically
   fall back to legacy JWT authentication when Core is unavailable.

## Status

Research and repository fit assessment completed. No SuperTokens packages,
services, subscriptions, production credentials or user migrations were added.
The current Phase 2 fixes continue using the existing authentication system.
The next authentication step is an isolated free-core integration prototype,
followed by the above migration and security gate before switching users.
