# Backend Setup Guide

This file documents the current backend shape and setup.

## Stack

- MongoDB + Mongoose
- JWT authentication
- Next.js App Router route handlers
- local file uploads
- in-memory cache and rate limiting helpers

## Minimum environment

Create `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional backend-related variables:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SEED_ADMIN_SECRET=
SEED_FEATURED_SECRET=
SEED_SELLER_EMAIL=
SEED_SELLER_PASSWORD=
SEED_SELLER_NAME=
DEBUG_COOKIES_SECRET=
DEBUG=
```

## Main models

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

## Main API areas

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/upload-id`
- `POST /api/auth/ban-appeal`

### Listings and marketplace

- `GET /api/listings`
- `POST /api/listings`
- `GET /api/listings/[id]`
- `PUT /api/listings/[id]`
- `DELETE /api/listings/[id]`
- `GET /api/listings/nearby`
- `GET /api/listings/trending`
- `GET /api/recommendations`
- `GET /api/categories/counts`

Notes:

- `/api/listings` browse responses can include total counts and cursor metadata for the structured browse page.
- browse cursor pagination normalizes boosted-state values so legacy listings without explicit `isBoosted` data do not break load-more behavior.
- `/api/recommendations` may return true preference-based results or an explicit fallback state depending on available signals.
- `/api/categories/counts` is part of homepage discovery and is invalidated alongside marketplace discovery caches when listings change.

### User activity

- `GET/POST/DELETE /api/wishlist`
- `GET/POST /api/recently-viewed`
- `GET/POST /api/reviews`
- `GET/POST /api/messages`
- `GET/POST/DELETE /api/saved-searches`
- `POST /api/blocks`

### Support tickets

- `GET/POST /api/tickets`
- `GET /api/tickets/[id]`
- `POST /api/tickets/[id]/reply`
- `PATCH /api/tickets/[id]/status`

### Appeals

- `GET /api/users/ban-appeals`
- `POST /api/users/ban-appeals/submit`
- `POST /api/auth/ban-appeal`

### Admin

- analytics
- users
- sellers
- listings
- reports
- ban appeals
- tickets
- ban/unban
- seed helpers
- admin view mode

Admin access is role-based through the normal auth system. There is no separate admin login route.

## Current backend reality

- JWT is required for production builds/runs.
- The app uses Mongoose, not Prisma.
- The app uses JWT auth, not NextAuth.
- Seller verification is currently lightweight and not a full manual review pipeline.
- AI pricing is still simulated/mock.
- Support ticket attachments are stored on the local filesystem.

## Useful commands

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Backend troubleshooting

Missing `JWT_SECRET` on build:

- `next build` evaluates the app in production mode
- set `JWT_SECRET` in `.env.local`

Mongo connection problems:

- verify `MONGODB_URI`
- verify MongoDB is reachable

Uploads:

- listing images and ticket attachments are stored locally
- they are served through `/api/uploads/[...path]`
