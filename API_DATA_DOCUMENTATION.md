# API Data Documentation

This is the current high-level API data map for the repo as of 2026-04-16.

For exact contracts, use the route handlers in `app/api/` as the source of truth.

## Auth

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/auth/upload-id`
- `/api/auth/ban-appeal`

Typical data returned:

- minimal auth success payloads
- user/account state from `/api/auth/me`
- ban flags and appeal-related state where relevant

## Listings

- `/api/listings`
- `/api/listings/[id]`
- `/api/listings/nearby`
- `/api/listings/trending`
- `/api/recommendations`
- `/api/categories/counts`

Common patterns:

- list routes trim images for card/list contexts
- detail routes return richer listing data
- detail fetches integrate seller, review, and message-entry context
- browse list responses can return total counts plus cursor pagination metadata
- cursor pagination normalizes boosted-state sort values so older listings without explicit `isBoosted` data still paginate correctly
- recommendation responses include both recommendations and the strategy/signals used to explain whether the feed is truly personalized or in fallback mode
- category counts are cached but now tied into marketplace-discovery cache invalidation when listing state changes

## Messages

- `/api/messages`

Current shape:

- conversation list mode
- conversation detail mode
- unread counts and marked-read counts
- listing-linked message sending

## Reviews

- `/api/reviews`

Current shape:

- public seller review listing for supported listing pages
- authenticated review submission

## User activity

- `/api/wishlist`
- `/api/recently-viewed`
- `/api/saved-searches`
- `/api/blocks`

## Appeals

- `/api/auth/ban-appeal`
- `/api/users/ban-appeals`
- `/api/users/ban-appeals/submit`
- `/api/admin/ban-appeals`
- `/api/admin/ban-appeals/[id]`

## Support tickets

- `/api/tickets`
- `/api/tickets/[id]`
- `/api/tickets/[id]/reply`
- `/api/tickets/[id]/status`
- `/api/admin/tickets`
- `/api/admin/tickets/[id]`
- `/api/admin/tickets/[id]/reply`
- `/api/admin/tickets/[id]/status`

## Admin

- `/api/admin/analytics`
- `/api/admin/users`
- `/api/admin/users/[id]/chats`
- `/api/admin/users/[id]/listings`
- `/api/admin/sellers`
- `/api/admin/sellers/[id]/listings`
- `/api/admin/reports`
- `/api/admin/listings/[id]`
- `/api/admin/listings/[id]/boost`
- `/api/admin/listings/bulk-delete`
- `/api/admin/ban-user`
- `/api/admin/unban-user`
- `/api/admin/view-mode`

## Notes

- API contracts have changed over time, especially around listings, messages, and admin flows.
- Prefer current route code over older analysis docs when there is any conflict.
