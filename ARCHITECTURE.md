# Weggo Architecture

## High-Level Stack

- Next.js 16 App Router
- React 19
- TypeScript
- MongoDB with Mongoose
- JWT cookie-based authentication
- Tailwind CSS + Framer Motion
- Zustand for persisted client state

## Application Shape

### Frontend

The UI mainly lives in:

- `app/` for route-level pages and layouts
- `components/` for shared UI
- `features/` for newer domain-specific modules like admin and tickets

Important route groups:

- public pages: home, browse, listing detail, contact, terms, privacy
- auth pages: login, register, forgot password, reset password
- account pages: profile, favorites, messages, support
- seller pages: sell, seller guidelines, upload ID
- appeals pages: appeal history and appeal review
- admin pages: dashboard plus detail pages

### Backend

The backend is implemented as Next.js route handlers under `app/api/`.

Main API domains:

- auth
- listings
- messages
- reviews
- wishlist
- recently viewed
- saved searches
- support tickets
- appeals
- admin moderation

### Data Layer

Primary Mongoose models:

- `User`
- `Product`
- `Message`
- `Review`
- `Report`
- `BanAppeal`
- `Ticket`
- `TicketMessage`
- `ViewHistory`
- `SavedSearch`
- `Wishlist`

## Auth Model

- JWT tokens are generated in `lib/auth.ts`
- tokens are stored in cookies
- admin access is role-based through the normal user model
- production requires `JWT_SECRET`
- protected routes and CSRF/security headers are enforced in `proxy.ts`

## Listings Flow

The listing system centers on `Product`:

- create/edit/delete listing routes
- browse filters and sorting
- browse totals and cursor-based load-more behavior
- browse cursor sorting normalizes boosted state for older listings so pagination stays stable across legacy rows
- listing detail fetch
- review and message integration
- favorites, recently viewed, nearby, trending, and recommendations
- admin visibility and boost controls

Seller posting is gated by `sellerVerified`.

Category and subcategory handling is centralized through `lib/taxonomy.ts`, and listing create/update paths now validate subcategories against the selected category.

## Messaging Flow

- conversations are keyed by `conversationId`
- the messages API is split into route, validator, repository, mapper, and service layers
- conversation list and conversation detail both support pagination
- the conversation UI loads latest messages first and can fetch older history upward

## Support Ticket Flow

- users create tickets through `/api/tickets`
- ticket messages are stored separately in `TicketMessage`
- admins manage the queue through `/api/admin/tickets`
- closed-ticket retention cleanup runs in the background and also removes attachment files from disk

## Caching and Runtime Helpers

Shared runtime helpers live in `lib/`:

- `lib/cache.ts`
- `lib/rateLimit.ts`
- `lib/env.ts`
- `lib/db.ts`
- `lib/validators.ts`
- `lib/csrf.ts`

Current implementation notes:

- cache is in-memory
- uploads are local filesystem uploads
- env validation warns on recommended public URLs in production
- marketplace discovery invalidation now clears listing caches, recommendation caches, seller-facing cache slices, and category counts together when listing state changes

## AI Surfaces

### AI Chat

- UI: `components/AIChatbot.tsx`
- API: `app/api/ai-chat/route.ts`
- purpose: marketplace guidance and supported listing-aware responses

### AI Pricing

- UI: sell-page pricing helper surfaces
- API: `app/api/pricing/route.ts`
- current state: simulated/mock analysis, not live external market data

### Discovery / Recommendations

- homepage discovery UI: `components/PersonalizedFeed.tsx`
- recommendations API: `app/api/recommendations/route.ts`
- current state: recommendations blend wishlist categories, recent browsing categories/subcategories, and location when available
- fallback behavior is explicit: signed-out or low-signal users are shown fresh marketplace picks instead of silent pseudo-personalization

## Admin Surface

The admin dashboard is modularized and currently includes:

- overview
- users
- reports
- appeals
- tickets
- listings
- categories
- activity

Admin data is served through `/api/admin/*`.

## Testing

- unit/integration tests: `tests/`
- Playwright E2E: `e2e/`

Current quality gates:

- `npm run lint`
- `npm test`
- `npm run build`

## Known Boundaries

- no payments
- no websocket/live chat layer
- no hosted media backend by default
- no full manual seller verification pipeline yet
