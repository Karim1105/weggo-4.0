# Deploy Weggo to a DigitalOcean Droplet

## Prerequisites

- Ubuntu 22.04 droplet
- Node.js 20+
- MongoDB available locally on the server or via an external URI
- a domain if you want public HTTPS access

## 1. Install system packages

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
```

Install MongoDB if you are hosting it on the same box, or use MongoDB Atlas and skip the local install.

## 2. Clone the repo

```bash
cd /var/www
git clone https://github.com/Karim1105/weggo-4.0.git weggo
cd weggo
```

## 3. Create `.env.production`

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com
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

## 4. Install and build

```bash
npm install
npm run build
```

## 5. Start with PM2

```bash
pm2 start npm --name "weggo" -- start
pm2 save
pm2 startup
```

Run the extra command PM2 prints after `pm2 startup`.

## 6. Put nginx in front

Example server block:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 7. SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 8. Updating the app later

```bash
cd /var/www/weggo
git pull origin main
npm install
npm run build
pm2 restart weggo
```

## Troubleshooting

`JWT_SECRET is required in production`:

- verify `.env.production` exists
- verify PM2 or your shell actually loads it

Warnings about `NEXT_PUBLIC_SITE_URL`:

- set both `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL`

Bus errors / `SIGBUS` during build:

- usually environment/filesystem issues, not app logic

## Current product notes

- AI pricing remains simulated/mock
- uploads are local filesystem uploads by default
- support ticket attachments are also local filesystem uploads
- seller verification is still lightweight rather than a full manual review pipeline
