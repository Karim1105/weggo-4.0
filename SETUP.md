# Weggo Setup Guide

## Requirements

- Node.js 20 or newer
- npm
- MongoDB running locally or a reachable MongoDB URI

## 1. Install dependencies

```bash
npm install
```

## 2. Create `.env.local`

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Optional:

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

Notes:

- `MONGODB_URI` and `JWT_SECRET` are required.
- `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` are recommended and remove production build warnings.
- `NEXT_PUBLIC_API_URL` is optional and mainly useful when server-side self-fetches need an explicit origin.
- SMTP must either be fully configured or fully unset.

## 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Verify local setup

Check these flows:

1. Register a user
2. Log in
3. Browse listings on `/browse`
4. Open a listing page
5. Open the AI chatbot
6. Visit `/sell`
7. Visit `/support`
8. Visit `/profile`

## 5. Build and test

```bash
npm run lint
npm test
npm run build
```

## Common setup issues

### `JWT_SECRET is required in production`

`next build` runs in production mode, so:

- the file must be named `.env.local`
- `JWT_SECRET` must be present in it

### `Recommended production environment variables missing: NEXT_PUBLIC_SITE_URL`

Add this to `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `SIGBUS` / bus error during build

That usually points to:

- a mounted/shared/external filesystem issue
- corrupted install/build artifacts
- a local Node/runtime problem

It is not a normal application-level Next.js error.

### `<img>` warnings during build

These are current lint warnings from `@next/next/no-img-element`.
They are warnings, not build blockers.

## Production notes

- The app uses JWT auth, not NextAuth.
- The app uses MongoDB/Mongoose, not Prisma.
- Uploads are local filesystem uploads by default.
- AI pricing is still simulated/mock.
- Support ticket attachments are stored locally too.

## Related docs

- [README.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/README.md)
- [LOCAL_SETUP.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/LOCAL_SETUP.md)
- [SETUP_BACKEND.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/SETUP_BACKEND.md)
- [DEPLOY_QUICK_REF.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/DEPLOY_QUICK_REF.md)
