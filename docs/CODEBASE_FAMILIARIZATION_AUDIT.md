# Weggo Codebase Familiarization Audit

## Scope

This note captures a structured familiarization pass across the Weggo codebase on 2026-04-07.

Verification performed:

- `npm run lint`
- `npm test`
- `npm run build`

All three passed at the time of review.

## Pass Summary

### Pass 1: Topology

- Next.js App Router marketplace application.
- Major areas: auth, listings, wishlist, reviews, messages, admin, seller verification, AI chat, AI pricing.
- Shared logic lives in `lib/`, data models in `models/`, admin and user UIs in `app/`.

### Pass 2: Core Runtime Flows

- Auth is JWT-cookie based with middleware protection and CSRF token enforcement.
- Listing creation is gated by `sellerVerified`.
- Messaging, wishlist, recommendations, recently viewed, and reporting all route through API handlers in `app/api/`.
- Admin tooling covers users, sellers, reports, appeals, listing moderation, analytics, and listing boosts.

### Pass 3: Backend Internals

- Database layer is Mongoose with local in-memory cache and local filesystem uploads.
- Several routes are well-guarded, but some backend/platform helpers have correctness gaps.
- Listing-detail caching, rate limiting, and a few debug/observability helpers need tightening.
- Product moderation still uses a mix of soft-delete and hard-delete semantics.

### Pass 4: Frontend Internals

- UI is mostly client-heavy and optimistic in several places.
- Some admin detail pages rely on `localStorage` snapshots instead of server fetches by route id.
- Product copy and UI claims overstate the real behavior of verification and AI features.
- A few high-traffic controls are wired inconsistently across responsive layouts and view modes.
- Shared category, language, and CTA surfaces drift from the actual frontend/state model in several places.

### Pass 5: Quality / Risk

- The repo has some automated tests, but they cover only a small slice of the real product surface.
- E2E coverage is effectively a single optional smoke check.
- Tooling currently treats type-checking as "lint", leaving many framework/client-side issues to slip through review.

### Pass 6: Synthesis

- The core system shape is now clear enough to treat this audit as a working mental model of the repo.
- No additional discrete issue rose above the threshold in this pass; the important remaining risks are already captured in passes 1 through 5.
- The main value of this pass is the change map: where to edit safely, where changes are likely to regress behavior, and which areas need extra verification.

## Issue Register

| ID | Severity | Area | Issue | Evidence |
|---|---|---|---|---|
| F-01 | High | Verification | Seller verification is effectively instant self-attestation. The upload route accepts only a National ID number and immediately flips `sellerVerified` to `true`; no file upload, review queue, uniqueness check, or real verification step exists. | `app/api/auth/upload-id/route.ts:27-56`, `app/sell/page.tsx:63-84`, `app/auth/upload-id/page.tsx:139-175` |
| F-02 | High | Privacy / Data | National ID numbers are stored in plaintext on the `User` document. This is high-risk PII with no hashing, encryption, or retention policy visible in the code. | `models/User.ts:70-76`, `app/api/auth/upload-id/route.ts:45-50` |
| F-03 | Medium | Privacy | Listing detail responses expose seller phone and location to any viewer. If that is not an explicit product decision, it is a privacy leak. | `app/api/listings/[id]/route.ts:16-18`, `app/api/listings/[id]/route.ts:45-59` |
| F-04 | High | Messaging | Message creation does not verify that `productId` belongs to the `receiverId` or is even a valid active listing for that conversation. Any user can attach an arbitrary product to a message thread and update that product's `lastInquiry`. | `app/api/messages/route.ts:141-166`, `app/api/messages/route.ts:219-239` |
| F-05 | Medium | Admin / Data Model | The admin user listings endpoint queries review fields that do not exist in the `Review` model (`sellerId`, `buyerId`). Recent reviews in that screen will be wrong or empty. | `app/api/admin/users/[id]/listings/route.ts:78-84`, `models/Review.ts:4-16` |
| F-06 | High | Moderation / Data Integrity | Bulk admin delete uses hard deletion while the rest of moderation mostly uses soft deletion plus TTL cleanup. This makes moderation behavior inconsistent and can permanently remove data unexpectedly. | `app/api/admin/listings/bulk-delete/route.ts:32-45`, `app/api/admin/listings/[id]/route.ts:28-42`, `app/api/admin/ban-user/route.ts:75-80` |
| F-07 | Medium | Admin UX | Appeal review and seller listing detail pages depend on `localStorage` snapshots created from the admin dashboard. Refreshing or opening those URLs directly loses context and redirects away. | `app/admin/page.tsx:680-744`, `app/appeal-review/[id]/page.tsx:21-38`, `app/seller-listings/[id]/page.tsx:21-37` |
| F-08 | Medium | AI / Product Trust | The AI pricing experience is mock/random in both API and UI. It generates fabricated confidence, trend, and source values while the UI labels it as real market analysis. | `app/api/pricing/route.ts:5-18`, `app/api/pricing/route.ts:56-74`, `components/AIPricingSuggestion.tsx:35-88`, `components/AIPricingSuggestion.tsx:107-109` |
| F-09 | Medium | AI / Architecture | The chatbot component does not call `/api/ai-chat`; it implements its own client-side canned logic instead. There are two parallel AI systems with drift already visible. | `components/AIChatbot.tsx:64-134`, `app/api/ai-chat/route.ts:3-23` |
| F-10 | Medium | Search / Recommendations | Nearby listings load all active products into memory, infer coordinates from string matching, and default unknown locations to Cairo. Results will be inaccurate and will scale poorly. | `app/api/listings/nearby/route.ts:95-135` |
| F-11 | Medium | Admin / Query Logic | Admin sellers query includes `role: 'seller'`, but the user role enum only allows `user` and `admin`. The route also has no pagination and performs N+1 listing counts. | `app/api/admin/sellers/route.ts:14-28`, `models/User.ts:13-18`, `models/User.ts:65-69` |
| F-12 | Medium | Config / Runtime | Server components fetch internal APIs using `NEXT_PUBLIC_API_URL` or hardcoded `http://localhost:3000`. That is brittle in production, preview, proxy, and multi-origin setups and creates unnecessary self-fetches. | `app/page.tsx:14-18`, `components/Navbar.tsx:14-25`, `components/ProductCardServer.tsx:30-39` |
| F-13 | Medium | Docs / Config Drift | Documentation and env configuration are inconsistent: README says payments will never be integrated, while `.env.example` still advertises payment gateways; uploads are filesystem-based but Cloudinary remains in env docs; URL env names are inconsistent across files. | `README.md:34-36`, `README.md:97-112`, `.env.example:11-23`, `app/api/auth/forgot-password/route.ts:38-39`, `app/api/auth/login/route.ts:29-32` |
| F-14 | Low | API Contract | Ban appeal intentionally returns success-like copy with `success: false` and `201` for non-banned or unknown users. That avoids enumeration, but the contract is confusing for clients and future maintainers. | `app/api/auth/ban-appeal/route.ts:55-69`, `app/api/auth/ban-appeal/route.ts:78-86` |
| F-15 | Low | Cache / Freshness | Listing boost mutations do not clear listing caches, so boosted ordering can stay stale until cache expiry. | `app/api/admin/listings/[id]/boost/route.ts:34-54`, `app/api/listings/route.ts:121-137`, `app/api/listings/route.ts:211-225` |
| F-16 | Low | UX / Accuracy | Profile stats are not real account stats. `activeCount` just counts loaded listings, `soldCount` is hardcoded `0`, and the profile listing query only fetches active listings. | `app/profile/page.tsx:52-57`, `app/profile/page.tsx:151-153` |
| F-17 | Low | Product Trust | Featured listings UI claims handpicked, AI-selected, verified 4.5+ sellers, but it simply fetches newest listings and renders hardcoded marketing stats. | `components/FeaturedListings.tsx:42-52`, `components/FeaturedListings.tsx:186-217` |
| F-18 | Low | Config Validation | Environment validation is narrow and does not cover several env vars the code actively depends on for runtime behavior and admin flows. | `lib/env.ts:6-31`, `app/api/auth/forgot-password/route.ts:38-39`, `app/api/admin/seed-admin/route.ts:9-15`, `app/api/admin/seed-featured/route.ts:56-63` |
| F-19 | High | Appeals Flow | The authenticated appeals UI calls `/api/users/ban-appeals` and `/api/users/ban-appeals/submit`, but those routes do not exist in the repo. Authenticated appeal history/submission cannot work as written. | `app/appeals/page.tsx:53-60`, `app/appeals/page.tsx:89-98`, existing public route: `app/api/auth/ban-appeal/route.ts:10-110` |
| F-20 | Medium | Appeals Flow | The appeals page expects `bannedReason` and `bannedAt` from `/api/auth/me`, but that endpoint only returns `banned` as a boolean. The ban info card cannot be reliably populated. | `app/appeals/page.tsx:138-159`, `app/api/auth/me/route.ts:21-35` |
| F-21 | High | Reviews Flow | Reviews list is rendered on the public listing page, but `GET /api/reviews` is protected by `requireAuth`, so anonymous visitors hit an auth error instead of seeing seller reviews. | `app/listings/[id]/page.tsx:434-445`, `components/ReviewsList.tsx:58-65`, `app/api/reviews/route.ts:210-211` |
| F-22 | Medium | Reviews Flow | `ReviewsList` sends `productId`, but the reviews API GET handler ignores it and only filters by `sellerId`. The UI implies product-scoped review context that the backend does not support. | `components/ReviewsList.tsx:48-56`, `app/api/reviews/route.ts:12-105` |
| F-23 | Low | Listing Detail UX | Similar-item cards on the listing detail page render a favorite button, but the callback is a no-op, so the control looks interactive and does nothing. | `app/listings/[id]/page.tsx:454-467` |
| F-24 | Medium | Wishlist UX | Listing-detail wishlist toggling flips local UI state without checking response status. Unauthorized or failed wishlist requests can still leave the heart state looking successful. | `app/listings/[id]/page.tsx:196-214`, `app/api/wishlist/route.ts:183-185` |
| F-25 | Medium | Blocking | The block API accepts any truthy `userId` string and does not validate ObjectId format or target-user existence before mutating `blockedUsers`. | `app/api/blocks/route.ts:20-52` |
| F-26 | Low | View History | `POST /api/recently-viewed` records arbitrary `productId` values without validating format or product existence, allowing dangling history records. | `app/api/recently-viewed/route.ts:10-27` |
| F-27 | Medium | Login UX | Wrong-credentials login feedback regressed. The login route still redirects to `/login?error=1` for failed form logins, but the login page no longer renders any invalid-credentials banner/toast for `error=1`, so users get no visible feedback. | `app/api/auth/login/route.ts:52-88`, `app/login/page.tsx:12-24`, `app/login/page.tsx:89-146` |
| F-28 | Medium | Appeal Review UX | Appeal review silently falls back to empty "No chats found" / "No listings found" states when admin-only detail fetches fail, instead of surfacing the real error. The page relies on a fragile `localStorage` appeal snapshot plus `appeal.userId` extraction and does not handle non-success chat/listing responses beyond showing empty sections. | `app/appeal-review/[id]/page.tsx:21-38`, `app/appeal-review/[id]/page.tsx:40-69`, `app/api/admin/users/[id]/chats/route.ts:154-172`, `app/api/admin/users/[id]/listings/route.ts:92-123` |
| F-29 | High | Caching / Data Integrity | The public listing-detail GET route performs side effects (`views` increment and authenticated `ViewHistory` upsert) but also advertises `Cache-Control: public, s-maxage=30`. Cached hits can skip those writes and serve stale detail data, so view counts and recently-viewed behavior become inaccurate under shared caching. | `app/api/listings/[id]/route.ts:27-37`, `app/api/listings/[id]/route.ts:61-68` |
| F-30 | Medium | Rate Limiting / Runtime | The in-memory rate limiter includes a cleanup routine, but that routine is never initialized anywhere in the repo. Expired IP buckets can accumulate indefinitely in memory over the lifetime of a process. | `lib/rateLimit.ts:10-11`, `lib/rateLimit.ts:46-75` |
| F-31 | Low | Debug / Security | The non-production cookie debug endpoint is open by default when `DEBUG_COOKIES_SECRET` is unset. Any requester in dev/staging can inspect cookie names and value previews. | `app/api/debug/cookies/route.ts:3-22` |
| F-32 | Low | Observability / Cache | `clearCache()` flushes the cache before counting keys, so `metrics.evictions` always records `0` for full-cache clears. Cache metrics are therefore misleading. | `lib/cache.ts:37-42`, `lib/cache.ts:56-78` |
| F-33 | Low | API Robustness | Several routes call `findById` on unvalidated path params and only fall back to the catch block on malformed IDs, which turns bad route params into `500` responses instead of `400`/`404`. Examples include listing detail, admin user chats/listings, and ban-appeal review. | `app/api/listings/[id]/route.ts:13-18`, `app/api/admin/users/[id]/chats/route.ts:29-37`, `app/api/admin/users/[id]/listings/route.ts:27-35`, `app/api/admin/ban-appeals/[id]/route.ts:15-33` |
| F-34 | Medium | Favorites UX | The shared `ProductCard` favorite button sits inside the listing `<Link>` but only calls `stopPropagation()`, not `preventDefault()`. Clicking the heart can still navigate to the listing page while toggling the favorite state. | `components/ProductCard.tsx:138-169` |
| F-35 | Medium | Browse UX | Browse list view renders products as plain cards with no `<Link>` or click handler to open the listing detail page. Switching from grid to list removes the primary path to view an item. | `app/browse/page.tsx:566-617` |
| F-36 | Medium | Admin Navigation | Admin detail pages navigate back to `/admin?tab=appeals` and `/admin?tab=listings`, but the dashboard never reads a `tab` query param and always initializes to `analytics`. Returning from those pages loses the intended admin context. | `app/appeal-review/[id]/page.tsx:93-96`, `app/seller-listings/[id]/page.tsx:186-188`, `app/admin/page.tsx:15-18` |
| F-37 | Medium | Frontend Consistency | Category surfaces are inconsistent across the frontend. Shared config/validation supports `music` and `gaming`, the edit form exposes them, but the sell form omits them and the homepage category grid omits some supported categories. Users can browse/edit categories that they cannot create from the main sell flow. | `lib/utils.ts:69-80`, `app/sell/page.tsx:421-434`, `app/listings/[id]/edit/page.tsx:178-196`, `components/Categories.tsx:24-33` |
| F-38 | Low | Mobile Navigation | Logged-in users have a desktop messages entry with unread badge, but the mobile menu omits any messages link. Messaging is materially less discoverable on mobile. | `components/NavbarClient.tsx:201-215`, `components/NavbarClient.tsx:306-338` |
| F-39 | Low | Homepage CTA | The homepage Categories section renders a “Try AI Search” button with no click handler or link, so it looks actionable but does nothing. | `components/Categories.tsx:248-253` |
| F-40 | Low | Language UX | The navbar language toggle uses local component state instead of the persisted Zustand `language` state. Language choice resets on remount/navigation even though the store is set up to persist it. | `components/NavbarClient.tsx:27-33`, `components/NavbarClient.tsx:103-107`, `lib/store.ts:37-40`, `lib/store.ts:86-92`, `lib/store.ts:109-115` |
| F-41 | Medium | Tooling / Quality Gate | `npm run lint` is only `tsc --noEmit`; there is no actual ESLint/Next lint configuration in the repo. Type-checking alone will not catch many React, hook-dependency, accessibility, or Next-specific correctness issues. | `package.json:5-13`, no ESLint config files found at repo root (`.eslintrc*` / `eslint.config.*`) |
| F-42 | Medium | Test Coverage | Automated tests cover helpers plus a few auth/listings/uploads/wishlist paths, but there are no tests for messages, reviews, appeals, admin workflows, or frontend components/pages. Many of the bugs found in passes 2 through 4 sit entirely outside the current test surface. | `tests/api-response.test.ts`, `tests/auth.test.ts`, `tests/cache.test.ts`, `tests/integration/auth.integration.test.ts`, `tests/integration/listings.integration.test.ts`, `tests/integration/uploads.integration.test.ts`, `tests/integration/wishlist.integration.test.ts`, `tests/rateLimit.test.ts`, `tests/role-ui.test.ts`, `tests/utils.test.ts`, `tests/validators.test.ts`, no `*.test.*` / `*.spec.*` files under `app/` or `components/` |
| F-43 | Medium | E2E Confidence | The E2E suite is effectively one home-page smoke test and is skipped entirely unless `E2E_BASE_URL` is set. There is no automated end-to-end coverage for auth, browse, selling, messaging, admin, or appeal flows. | `e2e/smoke.spec.ts:3-10`, `package.json:10-12` |

## Pass 1 Triage

User triage on 2026-04-07:

- Deferred / accepted for now: `F-01`, `F-02`, `F-08`, `F-12`, `F-14`
- Active pass 1 issues to keep tracking: `F-03`, `F-04`, `F-05`, `F-06`, `F-07`, `F-09`, `F-10`, `F-11`, `F-13`, `F-15`, `F-16`, `F-17`, `F-18`

Important context from user:

- Documentation is outdated and should not be treated as authoritative.
- Code behavior should take precedence over docs when assessing the system.

## Pass 2 Findings

Runtime-flow issues identified while tracing page -> API -> model behavior:

- `F-19` authenticated ban appeal flow is wired to non-existent routes.
- `F-20` appeals UI expects auth payload fields that `/api/auth/me` does not return.
- `F-21` public listing pages render reviews, but reviews GET is auth-only.
- `F-22` review list sends `productId`, but the backend ignores it.
- `F-23` similar-item favorite control on listing detail is a no-op.
- `F-24` listing-detail wishlist toggle can show false success on failed requests.
- `F-25` block-user mutations lack target validation.
- `F-26` recently-viewed POST accepts dangling product references.
- `F-27` wrong-credentials login no longer gives visible user feedback.
- `F-28` appeal-review admin detail panels can silently render empty chats/listings when their fetch path fails.

## Pass 3 Findings

Backend/platform issues identified while tracing shared server utilities, caching, middleware-adjacent behavior, and admin helpers:

- `F-29` listing-detail GET both mutates state and advertises shared public caching.
- `F-30` rate-limit cleanup exists but is never started, so limiter memory can grow over time.
- `F-31` the cookie debug endpoint defaults open in non-production when no debug secret is configured.
- `F-32` full-cache clear metrics are wrong because evictions are counted after the flush.
- `F-33` several ID-based routes return `500` on malformed path params because they skip ObjectId validation.

## Pass 4 Findings

Frontend/component issues identified while tracing shared UI, route-level pages, state handling, and responsive navigation:

- `F-34` shared product-card favorite clicks can navigate unexpectedly because the button does not prevent the parent link default.
- `F-35` browse list view has no path into listing detail.
- `F-36` admin `?tab=` return links do not work because the dashboard ignores the query param.
- `F-37` category options drift across sell, edit, browse, and homepage surfaces.
- `F-38` mobile navigation omits messaging even though desktop exposes it prominently.
- `F-39` the homepage “Try AI Search” CTA is a no-op.
- `F-40` the language toggle uses local state instead of the persisted app language store.

Pass 4 user triage on 2026-04-07:

- Deferred / accepted for now: `F-36`
- Active pass 4 issues to keep tracking: `F-34`, `F-35`, `F-37`, `F-38`, `F-39`, `F-40`

## Pass 5 Findings

Quality-risk issues identified while reviewing tests, tooling, and maintenance confidence:

- `F-41` the repo has no real lint step beyond TypeScript type-checking.
- `F-42` automated coverage misses most of the product areas where current bugs are clustering.
- `F-43` E2E coverage is a single optional smoke check and is skipped by default without environment setup.

## Pass 6 Findings

No new discrete issues were added in pass 6.

Final synthesis of the codebase:

- Primary data model:
  `User` is the center of auth, verification, banning, seller stats, and blocking.
  `Product` is the center of browse/sell/admin moderation, with wishlist, reviews, view history, and messages all hanging off it.
  `Message`, `Review`, `Report`, `BanAppeal`, `Wishlist`, `ViewHistory`, and `SavedSearch` are supporting workflow models.
- Main runtime architecture:
  Pages in `app/` are mostly thin client screens that call route handlers in `app/api/`.
  Shared behavior is concentrated in `lib/` for auth, middleware-adjacent helpers, caching, CSRF, validation, image handling, and UI role helpers.
  Cross-page UI is driven by a small set of shared components in `components/`, especially `Navbar`, `ProductCard`, feed/listing components, and AI-themed marketing widgets.
- Safest change points:
  Listing search/filter behavior should usually be changed in `app/api/listings/route.ts` plus `lib/utils.ts` mapping helpers.
  Auth/session behavior should usually be changed in `lib/auth.ts`, `middleware.ts`, and `/api/auth/*` together.
  Admin moderation behavior should usually be changed in `app/api/admin/*` plus the matching admin pages together.
  Product-card behavior should be treated as high-impact because it is reused across browse, homepage, favorites, profile, and admin-adjacent screens.
- Highest-friction areas for future work:
  Messaging, appeals, reviews, and admin detail screens are the most brittle because they combine client assumptions, optimistic UI, and sparse test coverage.
  Verification and AI-related features are the biggest trust-sensitive areas because the UI language is stronger than the actual implementation.
  Caching and self-fetch patterns need extra care because correctness can drift even when the app appears to work locally.

## Operating Mental Model

- The app is strongest in its basic marketplace CRUD foundation, auth flow, and route coverage.
- The largest risks are trust gaps: verification is not real verification, AI is mostly mock behavior, and admin/detail tooling contains brittle assumptions.
- The next-best improvement path is:
  1. Fix verification and PII handling.
  2. Fix messaging/review/admin data integrity issues.
  3. Remove or relabel mock AI behavior.
  4. Normalize delete semantics, configs, and admin detail fetch patterns.

## Resolution Update: 2026-04-07

Priority 1 fixes completed in code and verified with `npm run lint`, `npm test`, and `npm run build`.

| ID | Status | Resolution |
|---|---|---|
| F-04 | Resolved | Message creation now validates the referenced listing exists, is active, and belongs to one of the conversation participants before allowing `productId` attachment or `lastInquiry` mutation. |
| F-06 | Resolved | Admin bulk delete now soft-deletes listings by setting `status: 'deleted'` and a future `expiresAt`, matching the rest of moderation behavior. |
| F-19 | Resolved | Added authenticated user appeal history and submission routes at `/api/users/ban-appeals` and `/api/users/ban-appeals/submit`. |
| F-21 | Resolved | Reviews `GET` is now public while review creation remains auth-protected. |
| F-29 | Resolved | Listing-detail responses now disable shared caching with `Cache-Control: private, no-store` and `Vary: Cookie`. |

Additional verification added:

- `tests/integration/priority1-fixes.integration.test.ts` covers all five priority 1 fixes end to end.

Priority 2 fixes completed in code and verified with `npm run lint`, `npm test`, and `npm run build`.

| ID | Status | Resolution |
|---|---|---|
| F-05 | Resolved | Admin user-listings now queries reviews using the real `seller` and `reviewer` fields, so recent review data matches the schema. |
| F-11 | Resolved | Admin sellers now derive sellers from `sellerVerified` or actual listing ownership, avoid the impossible `role: 'seller'` filter, return listing counts without N+1 queries, and support pagination parameters. |
| F-20 | Resolved | `/api/auth/me` now returns `bannedAt`, `bannedReason`, and `bannedBy`, matching what the appeals UI expects. |
| F-25 | Resolved | Block mutations now validate `userId` format and confirm the target user exists before updating `blockedUsers`. |
| F-28 | Resolved | Appeal review now fetches live appeal detail by ID, uses that result to load admin-only chats/listings, and surfaces fetch failures instead of silently rendering empty sections. |
| F-30 | Resolved | Rate-limit cleanup now initializes lazily on first limiter use, so expired buckets are actually cleaned over time. |
| F-33 | Resolved | Dynamic ID routes now return `400` for malformed IDs across listing detail and the affected admin detail endpoints instead of falling into `500`s. |

Additional verification added:

- `tests/integration/priority2-fixes.integration.test.ts` covers the priority 2 API and admin-flow fixes.
- `tests/rateLimit.test.ts` now verifies lazy cleanup behavior as well as request limiting.
