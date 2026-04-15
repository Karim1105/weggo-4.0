# Weggo

Weggo is a second-hand marketplace for Egypt built with Next.js, React, TypeScript, and MongoDB.

## Current Product Surface

The current codebase includes:

- JWT cookie-based auth
- listing creation, editing, browsing, and seller messaging
- wishlist, recently viewed, reviews, and saved searches
- seller verification gating for posting
- ban appeals and admin moderation flows
- support tickets for users plus an admin support inbox
- an AI chat assistant wired through `/api/ai-chat`
- a pricing helper that still uses mock/simulated logic

## Product Reality Notes

- Seller verification is integrated into the product flow, but it is still a lightweight self-attestation flow rather than a full manual or third-party verification system.
- The AI chatbot is a real wired feature in the sense that the UI calls the API and can return marketplace-aware responses.
- The AI pricing flow exists in the UI and API, but it is still simulated and should not be treated as real market analysis.
- Uploads are local filesystem uploads served through `/api/uploads/[...path]`.
- Support ticket attachments are also stored locally.
- Payments are not implemented.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- MongoDB with Mongoose
- Tailwind CSS
- Framer Motion
- Zustand
- React Hook Form
- Vitest
- Playwright

## Main Repo Areas

- `app/`: pages, layouts, and API route handlers
- `components/`: shared UI pieces
- `features/`: newer feature-specific frontend modules
- `lib/`: auth, env, cache, DB, validation, uploads, helpers
- `models/`: Mongoose models
- `services/`: client API helpers
- `tests/`: unit and integration tests
- `e2e/`: Playwright specs
- `docs/`: audits and supporting reference docs

## Main User Flows

- register, log in, log out, forgot/reset password
- browse listings with filters, categories, and search
- open listing detail, reviews, similar listings, and contact seller
- favorite listings and track recently viewed history
- create, edit, and manage listings
- complete seller verification before posting
- send listing-linked messages
- submit and track ban appeals
- open support tickets and reply to them
- use the admin dashboard for users, reports, appeals, tickets, listings, categories, and activity

## Environment Variables

Create `.env.local` in the project root.

Minimum local setup:

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Recommended / optional variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
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

Notes:

- `MONGODB_URI` and `JWT_SECRET` are required.
- `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` are recommended in production and remove environment warnings.
- SMTP must be configured as a full set or left fully unset.
- A copyable template lives in [/.env.example](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/.env.example).

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:integration
npm run test:e2e
```

`npm run lint` currently runs both TypeScript checking and ESLint.

## Build Notes

Current expected behavior:

- `JWT_SECRET` must be present for `npm run build`.
- Missing `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL` currently causes warnings, not a hard build failure.
- The repo still emits `@next/next/no-img-element` warnings because several UI surfaces still use raw `<img>` tags.
- If you see `SIGBUS` / bus errors during build on a mounted or shared drive, that is usually an environment/filesystem problem rather than an application logic error.

## Testing

The repo currently includes:

- unit tests
- integration tests for auth, listings, wishlist, uploads, messages, tickets, and regression fixes
- Playwright coverage for key browse/login flows

Run:

```bash
npm test
npm run test:e2e
```

## Related Docs

- [START_HERE.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/START_HERE.md)
- [QUICKSTART.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/QUICKSTART.md)
- [SETUP.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/SETUP.md)
- [LOCAL_SETUP.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/LOCAL_SETUP.md)
- [SETUP_BACKEND.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/SETUP_BACKEND.md)
- [FEATURES.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/FEATURES.md)
- [ARCHITECTURE.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/ARCHITECTURE.md)
- [BAN_APPEAL_SYSTEM.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/BAN_APPEAL_SYSTEM.md)
- [docs/CODEBASE_FAMILIARIZATION_AUDIT.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/docs/CODEBASE_FAMILIARIZATION_AUDIT.md)
