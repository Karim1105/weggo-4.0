# Security Checklist

Use this as the current working checklist for the repo.

## Already in place

- [x] JWT cookie-based authentication
- [x] CSRF validation for state-changing API requests
- [x] security headers in `proxy.ts`
- [x] password reset token hashing
- [x] admin-only route enforcement
- [x] private handling for seller ID documents
- [x] banned-user enforcement for normal guarded flows and conversation pages
- [x] ticket attachment cleanup when old closed tickets are purged

## Environment / deployment

- [ ] set a strong `JWT_SECRET`
- [ ] set `NEXT_PUBLIC_SITE_URL`
- [ ] set `NEXT_PUBLIC_APP_URL`
- [ ] configure SMTP only if password reset email delivery is needed
- [ ] verify production Mongo indexes exist
- [ ] verify uploaded files are backed up if local disk storage is being used

## Review regularly

- [ ] verify CSRF is still applied after adding new write endpoints
- [ ] verify new admin routes are covered by admin-only guards
- [ ] verify new uploaded file types are validated before serving
- [ ] verify appeal, ticket, and moderation flows do not expose unsafe personal data
- [ ] verify env docs stay aligned with the real runtime requirements

## Known accepted / deferred realities

- [ ] seller verification is still a lightweight self-attestation flow
- [ ] national ID numbers are still stored in plaintext
- [ ] AI pricing is still simulated/mock

## Good next hardening targets

- [ ] move local uploads to managed object storage if production scale needs it
- [ ] add more targeted security/integration tests around auth, admin, and tickets
- [ ] revisit encrypted handling or retention policy for sensitive identity data
- [ ] continue removing raw `<img>` usage where optimized image handling matters
