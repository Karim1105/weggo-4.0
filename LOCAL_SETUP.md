# Local Setup

## 1. Make sure MongoDB is running

Example local URI:

```env
mongodb://localhost:27017/weggo
```

## 2. Create `.env.local`

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
SEED_ADMIN_SECRET=
SEED_FEATURED_SECRET=
```

## 3. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Quick local smoke test

1. Register a user
2. Browse listings
3. Open the chatbot
4. Try the sell page
5. Visit profile and favorites
6. Open `/support` and verify the ticket UI loads

## 5. Admin access

There is no separate `/api/admin/login` route.

To test admin locally:

1. Register a normal user
2. Change that user document in MongoDB to `role: "admin"`
3. Log in with that user
4. Open `/admin`

You can also use the admin seed route if you configure `SEED_ADMIN_SECRET`.

## Troubleshooting

Mongo connection errors:

- check that MongoDB is running
- check `MONGODB_URI` in `.env.local`

Build says `JWT_SECRET is required in production`:

- check that the file name is `.env.local`
- check that `JWT_SECRET` is present

Images not showing:

- uploads are stored under `public/uploads`
- they are served through `/api/uploads/[...path]`

Support attachment files not showing:

- ticket attachments also resolve through the uploads serving route
- confirm the file path stored in Mongo points to a real local file
