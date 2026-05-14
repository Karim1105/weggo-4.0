# Docker Deployment

## What "multi-platform" means here

Ubuntu vs Arch Linux does not change the container image format. The important compatibility target is CPU architecture:

- `linux/amd64`
- `linux/arm64`

The app Dockerfile in this repo is set up for multi-arch builds so the same image can run on either Linux distro as long as the host architecture is supported.

## Local single-arch build

Build the app image for your current machine:

```bash
docker build -t weggo:local .
```

If you need explicit build-time values:

```bash
docker build \
  --build-arg BUILD_JWT_SECRET=replace-with-a-build-secret \
  --build-arg BUILD_NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  --build-arg BUILD_NEXT_PUBLIC_APP_URL=https://your-domain.com \
  --build-arg BUILD_NEXT_PUBLIC_API_URL=https://your-domain.com \
  -t weggo:local \
  .
```

Run it:

```bash
docker run --rm -p 3000:3000 --env-file .env.local weggo:local
```

## Multi-arch build with buildx

Create and select a buildx builder once:

```bash
docker buildx create --name weggo-builder --use
docker buildx inspect --bootstrap
```

Build for both common Linux server architectures and push to a registry:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/weggo:latest \
  --push \
  .
```

If you want a versioned tag too:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/weggo:latest \
  -t your-registry/weggo:v1 \
  --push \
  .
```

## Runtime requirements

Provide the same app environment variables you already use outside Docker, for example:

```env
MONGODB_URI=mongodb://host-or-service:27017/weggo
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com
ELASTICSEARCH_NODE_URL=http://host-or-service:9200
```

## Notes

- The Dockerfile uses Next.js standalone output for a smaller runtime image.
- The image is Linux multi-arch, not distro-specific.
- Local uploads are still filesystem-based, so mount persistent storage if you keep using local uploads in production.
