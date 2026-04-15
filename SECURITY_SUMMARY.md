# Security Summary

This file is the current high-level security snapshot for the repo as of 2026-04-15.

## Current Security Controls

### Authentication

- JWT cookie-based auth via `lib/auth.ts`
- role-based admin access through the normal user model
- banned-user enforcement in guarded routes and message flows

### CSRF protection

- state-changing API requests are checked in `proxy.ts`
- token uses a double-submit cookie pattern
- client helpers add the CSRF header for protected writes

### Security headers

`proxy.ts` currently sets:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`
- `Content-Security-Policy`
- `Strict-Transport-Security` in production

### Sensitive file handling

- seller ID documents are not served from a public folder
- ticket attachments and listing uploads are served through the uploads route rather than by exposing arbitrary paths directly

### Auth / account safety

- reset password tokens are hashed before storage
- auth routes use rate limiting in key places
- admin-only APIs return not-found style responses in the route guard path

## Current Known Security / Trust Caveats

These are not hidden bugs in the docs; they are current product realities:

- seller verification is still lightweight and not a full manual review system
- national ID numbers are still stored in plaintext on the user record
- AI pricing remains simulated/mock and should not be represented as authoritative market data

## Operational Notes

- production requires `JWT_SECRET`
- production should also set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL`
- local/shared-drive builds can still hit environment-level `SIGBUS` issues unrelated to app logic

## Source of Truth

For exact implementation details, use:

- [proxy.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/proxy.ts)
- [lib/auth.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/lib/auth.ts)
- [lib/csrf.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/lib/csrf.ts)
- [lib/imageUpload.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/lib/imageUpload.ts)
