# Ban Appeal System

This document reflects the current appeal system in the repo as of 2026-04-15.

## Main Pieces

### Data Model

`models/BanAppeal.ts` stores:

- `userId`
- `bannedBy`
- `reason`
- `appealMessage`
- `status`
- `reviewedBy`
- `reviewedAt`
- `rejectionReason`

## User-Facing Appeal Paths

### 1. Public appeal submission for banned users who cannot log in

**Endpoint:** `POST /api/auth/ban-appeal`

Use this flow when a banned user is blocked at login and cannot access the authenticated app.

Input:

- `email`
- `appealMessage`

Behavior:

- rate limited to 5 requests per hour
- validates email and appeal length
- only creates a real appeal if the email belongs to a banned user with no pending appeal
- intentionally returns a success-like `201` response even for unknown, non-banned, or already-pending users to reduce account enumeration

### 2. Authenticated appeal history

**Endpoint:** `GET /api/users/ban-appeals`

Use this for the signed-in appeals page.

Behavior:

- requires auth
- returns the current user’s appeals
- paginated with `page` and `limit`

### 3. Authenticated appeal submission

**Endpoint:** `POST /api/users/ban-appeals/submit`

Use this when a banned authenticated user is already inside the app and wants to submit an appeal from the appeals page.

Input:

- `appealMessage`

Behavior:

- requires auth
- rate limited to 5 requests per hour
- only works for banned users
- blocks duplicate pending appeals

## Admin Appeal APIs

### List appeals

**Endpoint:** `GET /api/admin/ban-appeals`

Query params:

- `page`
- `limit`
- `status` = `all | pending | approved | rejected`

Returns:

- paginated appeals
- populated user/admin references
- basic appeal stats

### Appeal detail

**Endpoint:** `GET /api/admin/ban-appeals/[id]`

Returns:

- one populated appeal record
- banned-user details needed for review screens

### Review an appeal

**Endpoint:** `POST /api/admin/ban-appeals/[id]`

Input:

- `action`: `approve` or `reject`
- `rejectionReason`: required when rejecting

Behavior:

- approve: unbans the user and marks the appeal approved
- reject: stores a rejection reason and marks the appeal rejected
- admin override of a previously reviewed appeal is allowed and tracked

## Login Integration

`app/api/auth/login/route.ts` checks `user.banned` after password verification.

If the user is banned:

- the login flow redirects back to `/login`
- `error=banned` is included
- ban reason is included in the query string
- the login page can then direct the user toward the appeal flow

## Current Admin / Page Flow

- user sees banned login state
- user submits public appeal or authenticated appeal depending on context
- admin reviews appeals in the admin dashboard appeals module
- admin can open appeal detail, related user listings, and related chats

## Notes

- The public route is deliberately written to avoid easy user enumeration.
- The authenticated appeal routes are the main source of truth for the in-app appeals page.
- The admin dashboard now uses modular admin screens rather than one large legacy page.
