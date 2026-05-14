# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-bookworm-slim
ARG BUILD_MONGODB_URI=mongodb://localhost:27017/weggo
ARG BUILD_JWT_SECRET=docker-build-secret
ARG BUILD_NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG BUILD_NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG BUILD_NEXT_PUBLIC_API_URL=http://localhost:3000
ARG BUILD_ELASTICSEARCH_NODE_URL=http://localhost:9200

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG BUILD_MONGODB_URI
ARG BUILD_JWT_SECRET
ARG BUILD_NEXT_PUBLIC_SITE_URL
ARG BUILD_NEXT_PUBLIC_APP_URL
ARG BUILD_NEXT_PUBLIC_API_URL
ARG BUILD_ELASTICSEARCH_NODE_URL
ENV MONGODB_URI=$BUILD_MONGODB_URI
ENV JWT_SECRET=$BUILD_JWT_SECRET
ENV NEXT_PUBLIC_SITE_URL=$BUILD_NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$BUILD_NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$BUILD_NEXT_PUBLIC_API_URL
ENV ELASTICSEARCH_NODE_URL=$BUILD_ELASTICSEARCH_NODE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
