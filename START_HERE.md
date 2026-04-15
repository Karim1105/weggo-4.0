# Start Here

If you only read one file first, read [README.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/README.md).

## Fast path

1. Install dependencies with `npm install`
2. Create `.env.local`
3. Run `npm run dev`
4. Open `http://localhost:3000`

Minimum `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Which doc to read next

- New to the repo:
  [QUICKSTART.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/QUICKSTART.md)
- Need full setup:
  [SETUP.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/SETUP.md)
- Need local/dev setup only:
  [LOCAL_SETUP.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/LOCAL_SETUP.md)
- Need backend/API overview:
  [SETUP_BACKEND.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/SETUP_BACKEND.md)
- Need feature map:
  [FEATURES.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/FEATURES.md)
- Need system shape:
  [ARCHITECTURE.md](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/ARCHITECTURE.md)

## Current implementation notes

- AI chat is wired to the API and returns marketplace-aware responses for supported queries.
- AI pricing is still mock/simulated.
- Seller verification gates the sell flow but is not a full manual review system.
- Admin, messaging, reviews, wishlist, appeals, recently viewed, and support-ticket flows all exist in the current codebase.
