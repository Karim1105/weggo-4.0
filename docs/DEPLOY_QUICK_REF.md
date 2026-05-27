# Deployment Quick Reference

## Required production environment

Use `.env.production` or platform environment variables:

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Optional:

```env
NEXT_PUBLIC_API_URL=https://your-domain.com
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

- `JWT_SECRET` is required in production.
- Missing `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` currently causes warnings, not a build failure.
- SMTP must be fully configured or fully unset.

## Standard deploy flow

```bash
npm install
npm run build
npm start
```

## PM2 example

```bash
pm2 start npm --name "weggo" -- start
pm2 save
pm2 startup
```

## Update flow

```bash
git pull origin main
npm install
npm run build
pm2 restart weggo
```

## Production checks

```bash
npm run lint
npm test
npm run build
```

## Current product caveats

- AI pricing is still mock/simulated.
- Uploads are local filesystem uploads by default.
- Support ticket attachments are also local filesystem uploads.
- Seller verification is not yet a full manual review workflow.
