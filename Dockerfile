# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js faculty portal.
# Non-standalone on purpose: knex loads the mysql2 driver via a dynamic require,
# which Next's standalone file-tracing can miss — so we ship the full prod
# node_modules to guarantee the DB driver is present at runtime.

# ---- build-time deps (incl. dev) ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build the app (no DB needed: build runs in local/mock mode) ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV FACULTY_DATA_MODE=local
RUN npm run build

# ---- production-only deps (smaller runtime node_modules) ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app
# Patch base-OS packages (the node:22-alpine base is flagged for OS CVEs); this
# is the stage that actually ships, so upgrade here.
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=prod-deps            /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next   ./.next
COPY --from=builder              /app/public        ./public
COPY --from=builder              /app/package.json  ./package.json
COPY --from=builder              /app/next.config.mjs ./next.config.mjs

# run as the unprivileged user that ships with the node image
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
