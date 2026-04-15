# Weggo Quick Start

## 1. Install

```bash
npm install
```

## 2. Create `.env.local`

Use this minimum local config:

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If you need a template, copy from [/.env.example](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/.env.example).

## 3. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Try these flows

1. Register a user.
2. Browse listings on `/browse`.
3. Open a listing and try favorites, reviews, and seller messaging.
4. Open the AI chatbot and ask something like `Show me phones`.
5. Go to `/sell` and try the pricing helper.
6. Visit `/support` and create a support ticket.
7. Visit `/profile` to see your account shortcuts.

## What is real right now

- The AI chatbot is connected to `/api/ai-chat`.
- The pricing flow is still mock/simulated.
- Selling is gated behind seller verification.
- Messaging, reviews, appeals, favorites, support tickets, and admin flows are implemented.
- Arabic toggle and RTL switching exist, but translation coverage is still incomplete.

## Common commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:e2e
```

## Common issues

Missing `JWT_SECRET` during build:

- make sure the file is named `.env.local`
- make sure `JWT_SECRET` is actually set inside it

Warnings about `NEXT_PUBLIC_SITE_URL`:

- add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`
- add `NEXT_PUBLIC_APP_URL=http://localhost:3000` too if you want the env warnings gone completely

Warnings about `<img>`:

- these are current lint warnings in the repo, not fatal build errors

Bus error / `SIGBUS` during build:

- this is usually an environment or filesystem issue, especially on mounted/shared drives

## Read next

- [README.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/README.md)
- [SETUP.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/SETUP.md)
- [FEATURES.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/FEATURES.md)
