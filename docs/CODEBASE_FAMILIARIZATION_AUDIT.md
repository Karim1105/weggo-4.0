# Weggo Codebase Familiarization Audit

This file now acts as the current audit summary and history note for the familiarization work done on the repo.

## Status As Of 2026-04-16

The multi-pass familiarization and cleanup work is complete.

### Fixed during the audit/fix passes

- all Priority 1 issues
- all Priority 2 issues
- all Priority 3 issues
- all Priority 4 issues
- the later pulled issues around:
  - admin listing visibility/status corruption
  - banned-user SSR conversation access
  - appeal-review chat shortcut compatibility
  - moderator-role UI drift
  - forced-JPEG sell upload regression
  - ticket attachment cleanup
- the later discovery/browse fixes around:
  - stale homepage category counts
  - browse URL/state jitter
  - misleading loaded-count vs total-count behavior
  - load-more failure on legacy listings due to cursor pagination over missing `isBoosted` values
  - category/subcategory taxonomy drift
  - weak recommendation fallback messaging
  - brittle homepage carousel/discovery interactions

### Deferred / accepted for now

- seller verification is still lightweight
- national ID data is still stored in plaintext
- AI pricing is still mock/simulated
- some self-fetch/runtime patterns were accepted for now
- the ban-appeal enumeration-safe public response contract was accepted as-is
- admin should still default to the dashboard overview rather than honoring old tab-return links

### Still known but non-blocking

- the repo still emits `@next/next/no-img-element` warnings
- builds may warn when `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` are not set

## Mental Model Summary

### Main domain centers

- `User`
- `Product`
- `Message`
- `Review`
- `Report`
- `BanAppeal`
- `Ticket`
- `TicketMessage`
- `Wishlist`
- `ViewHistory`
- `SavedSearch`

### Highest-change areas

- browse/listings
- homepage discovery / recommendations
- messaging
- admin dashboard modules
- appeals
- support tickets
- seller verification / sell flow

### Safest change boundaries

- auth/session logic: `lib/auth.ts`, `proxy.ts`, `/api/auth/*`
- listings behavior: `/api/listings*`, `lib/api/listings/*`, listing detail/sell/edit pages
- admin behavior: `/api/admin/*` plus `features/admin/*`
- tickets: `/api/tickets*`, `/api/admin/tickets*`, `features/tickets/*`

## Historical Note

This file originally contained a pass-by-pass issue register with IDs like `F-01`, `F-02`, and so on.
That history was useful during the cleanup campaign, but the raw original list is no longer the best current-state documentation because many of those items were fixed afterward.

If you need the present-day code truth, prefer:

- [README.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/README.md)
- [FEATURES.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/FEATURES.md)
- [ARCHITECTURE.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/ARCHITECTURE.md)

Use this file mainly as the “what we audited and what happened” summary.
