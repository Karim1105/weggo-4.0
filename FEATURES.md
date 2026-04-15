# Weggo Features

This file describes the current product behavior in the codebase as of 2026-04-15.

## Authentication

- user registration
- login and logout
- JWT cookie-based auth
- forgot password and reset password flows
- auth-aware navbar, profile, and protected actions
- banned-user handling plus appeal submission flows

## Listings

- create listings
- edit listings
- soft-delete listings
- browse with search, category, subcategory, condition, location, and price filters
- sort by newest, oldest, price, and rating-related fields
- listing detail pages with seller info, reviews, and similar items
- boosted listing controls in admin

## Seller Verification

- selling is gated behind seller verification
- verification flow is wired into the UI
- current implementation stores submitted verification data and marks the user as seller-verified
- this is still not a full manual review or third-party verification system

## Favorites and Recently Viewed

- add/remove favorites
- favorites page
- recently viewed tracking for authenticated users

## Messaging

- conversations tied to listings
- conversation list page
- per-conversation pages with older-message loading
- unread count handling in navbar
- admin visibility into user chats
- user blocking flow

## Reviews

- public seller reviews on listing pages
- authenticated review submission
- seller-level review aggregation

## Appeals and Moderation

- public ban appeal submission for banned users who cannot log in
- authenticated appeal history and appeal submission for banned signed-in users
- admin appeal review pages
- admin user, seller, listing, report, ticket, and analytics screens
- admin ban/unban flows
- soft-delete based listing moderation

## Support Tickets

- user support inbox at `/support`
- ticket detail page with replies and attachment uploads
- ticket status lifecycle: `open`, `pending`, `resolved`, `closed`
- admin ticket inbox inside the admin dashboard
- cleanup of old closed tickets and their local attachments

## AI Features

### AI Chat

- UI widget in the bottom-right corner
- uses `/api/ai-chat`
- can answer platform questions and return listing-aware responses for supported queries

### AI Pricing

- pricing helper exists on the sell page
- current API behavior is simulated/mock
- it should be treated as a placeholder product flow rather than real market analysis

## Recommendations and Discovery

- personalized feed sections on the homepage
- nearby listings route
- trending listings route
- recommendations route
- category browsing and counts

## Localization

- English / Arabic language toggle
- RTL switching support
- language persistence through Zustand store
- translation coverage is partial, not complete

## Uploads

- listing images are stored locally and served through `/api/uploads/[...path]`
- ticket attachments are also stored locally
- the repo does not currently use Cloudinary or another hosted image provider

## Testing and Tooling

- `npm run lint` runs TypeScript checking plus ESLint
- `npm test` runs Vitest
- `npm run test:e2e` runs Playwright
- the repo has focused regression coverage for several high-priority fixes and newer messaging/ticket behaviors

## Known Non-Goals / Current Gaps

- no payment integration
- no real-time websocket chat
- no full manual seller verification workflow
- no real market-data-backed pricing engine yet
