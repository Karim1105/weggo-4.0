# Weggo Implementation Readiness Playbook

Last updated: 2026-05-17

## 1) Working Mental Model (Code-Truth)

Weggo is a Next.js App Router marketplace where route handlers under `app/api/*` act as the backend, with MongoDB models in `models/*` and domain logic in `lib/*`.

Core runtime boundaries:
- Auth/session and role gates: `lib/auth.ts`, `proxy.ts`
- Listing browse/create pipeline: `app/api/listings/*` + `lib/api/listings/*`
- Seller posting gate + verification: `app/sell/*`, `app/api/auth/upload-id/route.ts`, `User.sellerVerified`
- Messaging and support flows: `app/api/messages/*`, `app/api/tickets/*`, `app/api/admin/tickets/*`
- Moderation/appeals/admin: `app/api/users/ban-appeals/*`, `app/api/admin/*`

Quality baseline at time of this playbook:
- `npm test` passes
- `npm run lint` passes (typegen + typecheck + eslint)

## 2) Deep-Dive Pass 1: Listings + Sell (Priority)

End-to-end create flow:
1. `app/sell/page.tsx` orchestrates form state + hooks.
2. `app/sell/hooks/useImageUpload.ts` preprocesses images in-browser (resize/compress/metadata-strip), manages object URL lifecycle.
3. `app/sell/hooks/useSubmitListing.ts` posts `FormData` via `app/sell/api.ts` to `POST /api/listings` with CSRF header.
4. `app/api/listings/route.ts` -> controller -> `createListingService` in `lib/api/listings/service.ts`.
5. `createListingService` enforces:
- persistent rate limit (`listings:create`)
- auth required
- banned-user deny (`ACCOUNT_BANNED`)
- seller verification gate (`VERIFICATION_REQUIRED`)
- form parse + validation (`parseCreateListingForm`, `validateCreateListingForm`)
- upload write + DB create + upload cleanup on DB failure
- cache invalidation (`invalidateMarketplaceDiscoveryCaches`) + `revalidateTag('listings')`
6. `models/Product.ts` stores listing schema/indexes and default `status: 'active'`.

Browse/read flow:
1. `GET /api/listings` parses query in `lib/api/listings/query.ts`.
2. `buildListingsPipeline` in `lib/api/listings/pipeline.ts` builds Mongo pipeline + cursor pagination.
3. Sorting/cursor semantics depend on normalized `isBoosted` add-field and optional text-score path.
4. Output is sanitized (`sanitizeListing`) to constrain images/description payload.

High-risk seams when editing this domain:
- Frontend/back-end validation mismatch (`react-hook-form` expectations vs `parseCreateListingForm` constraints).
- Upload cleanup correctness if DB or downstream reads fail.
- Cursor/sort stability if sort fields or boost behavior change.
- Category/subcategory drift (`lib/taxonomy.ts`) causing invalid create/filter behavior.
- Cache coherence after listing mutations (home/recommendations/category counts/seller views).
- Seller verification UX edge states around 401/403 redirects and dialog handling.

## 3) Deep-Dive Pass 2: Security/Auth/Admin

Auth invariants:
- JWT in `token` cookie; payload role in `lib/auth.ts`.
- `requireAuth` returns 401; `requireAdmin` intentionally returns 404 for non-admin/unauthenticated callers (route existence hiding).
- `requireAuthNotBanned` blocks banned users with 403.

Proxy invariants (`proxy.ts`):
- Protected page paths require token redirect to `/login?redirect=...`.
- Admin page/API paths require admin role in JWT payload.
- State-changing `/api/*` requests with token require CSRF cookie/header match (login/logout exempted).
- Security headers + CSP are set globally for matched routes.

Admin behavior impacts:
- `/api/admin/*` access semantics rely on both proxy and `requireAdmin`.
- Admin actions are activity-logged by wrapper behavior in `requireAdmin`.

High-risk seams when editing this domain:
- Inconsistent role checks between proxy payload parsing and DB-backed auth wrappers.
- CSRF exemptions accidentally widened.
- Admin route exposure through status-code changes (404 contract regression).
- Token payload shape changes that break `proxy.ts` admin detection.

## 4) Deep-Dive Pass 3: Messaging + Support + Appeals

Messaging flow:
- `app/api/messages/route.ts` with `requireAuthNotBanned`.
- Service split: validator -> service -> repository -> mapper.
- Supports conversation list pagination and conversation detail cursor pagination.
- Send pipeline enforces:
- anti-self-message
- user existence + ban/block relationships
- product participation + active listing checks
- duplicate-message throttling window
- inquiry touch on product after successful message

Support tickets:
- User endpoints in `app/api/tickets/*`; admin queue in `app/api/admin/tickets/*`.
- Ticket and message are separate models (`Ticket`, `TicketMessage`).
- Attachment storage/cleanup runs via `lib/tickets/attachments.ts` + periodic stale closed-ticket cleanup (`lib/tickets/cleanup.ts`).
- Status transitions guarded by `lib/tickets/lifecycle.ts`.

Appeals:
- Authenticated appeal submit endpoint enforces user banned state + pending appeal uniqueness + rate limit.
- Admin appeal list endpoint is admin-protected and paginated.

High-risk seams when editing this domain:
- Pagination contract drift (page/pageSize vs cursor behavior).
- Read-state updates on conversation fetch causing unintended side effects.
- Attachment lifecycle leaks if deletion/cleanup path changes.
- Appeals moderation stats/query drift from status enum semantics.

## 5) Cross-Cutting Safe-Edit Checklist

Before coding:
- Identify domain owner path first (`listings`, `auth/admin`, `messages/tickets/appeals`).
- Confirm guard contracts (401 vs 403 vs 404) for touched endpoints.
- Confirm cache invalidation expectations for any listing/discovery changes.
- Confirm model indexes/fields used by query pipeline and pagination.

During coding:
- Keep request/response shapes backward-compatible unless explicitly changing contract.
- Preserve explicit error codes used by frontend logic (for example `VERIFICATION_REQUIRED`, `ACCOUNT_BANNED`).
- Preserve cleanup paths for uploaded files and ticket attachments.

After coding (minimum checks):
- Run targeted tests for affected domain.
- Run `npm run lint`.
- Run `npm test` when change is cross-domain or touches shared libs/auth/middleware.

## 6) Targeted Test Matrix

Listings/Sell:
- `npx vitest run tests/listings-pipeline.test.ts tests/sell-api.test.ts tests/sell-image-upload.test.ts tests/integration/listings.integration.test.ts`

Auth/Admin:
- `npx vitest run tests/auth.test.ts tests/integration/auth.integration.test.ts tests/navbar-role.test.ts tests/role-ui.test.ts`

Messaging/Support:
- `npx vitest run tests/messages-hook.test.ts tests/ticket-attachments.test.ts`

Global guardrails:
- `npm test`
- `npm run lint`

## 7) Operational Mode For Future Implementation Requests

For any requested feature/fix:
1. Start from this playbook's domain map and invariants.
2. Choose smallest safe edit surface first.
3. Call out hidden risk early (security/pagination/cache/cleanup/admin exposure).
4. Validate with domain-targeted tests first, then broad guardrails as needed.

## 8) Edge Cases and Gotchas (Second Deep Pass)

Listing lifecycle gotchas:
- `GET /api/listings/[id]` only serves `status === 'active'` and intentionally strips seller private fields; avoid adding seller PII to listing detail payloads.
- Seller/admin `DELETE /api/listings/[id]` soft-deletes (`status='deleted'`) and invalidates discovery caches.
- Admin `PATCH /api/admin/listings/[id]` visibility toggles are restricted to `active/deleted`; sold/pending listings must not be overwritten (409 contract is tested).
- Admin `POST /api/admin/listings/[id]/boost` must clear `listings*`, `seller_*`, and `admin_analytics*` cache keys after boost/unboost.

Browse/discovery gotchas:
- Browse UI distinguishes total count vs loaded count; cursor pagination behavior is part of UX contract.
- Discovery recommendations for logged-out users must show explicit fallback messaging, not implied personalization.
- Nearby listings logic must not silently map unknown locations to Cairo (regression covered by integration tests).

Admin/auth gotchas:
- Admin APIs must stay enumeration-safe (`requireAdmin` returning 404 for non-admin/unauthenticated).
- Proxy/admin checks rely on JWT payload role fields; payload shape changes can silently break access behavior.
- CSRF checks apply to state-changing API requests with authenticated tokens; avoid accidental exemptions.

Support/messages gotchas:
- Conversation reads mutate state (`markConversationRead`) as part of fetch path; refactors must preserve this side effect intentionally.
- Ticket cleanup deletes attachments for stale closed tickets; avoid changing retention/cleanup triggers without matching tests.
