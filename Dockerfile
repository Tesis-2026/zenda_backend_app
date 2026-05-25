# syntax=docker/dockerfile:1.6

# ─────────────────────────────────────────────────────────────────────
# Builder stage — installs all deps (incl. dev), runs prisma generate,
# compiles TypeScript to dist/.
# ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Native build deps for bcrypt + OpenSSL for Prisma engines
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────────────
# Runtime stage — slim image with only production deps + compiled output.
# ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Required at runtime by Prisma query engine
RUN apk add --no-cache openssl wget

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Run as non-root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

# Healthcheck targets /api/health. NOTE: currently trivial (ARCH-30);
# B31 will make it actually ping the DB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
