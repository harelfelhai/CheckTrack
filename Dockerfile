# CheckTrack — container image for Google Cloud Run.
# Built in the cloud by Cloud Build (no local Docker needed).
# Bundles Chromium so Puppeteer can render the signed-check PDF.

# ---- deps: install node_modules ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: produce the standalone Next.js server ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime with Chromium ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
# pdf.ts reads this; the apt 'chromium' package installs here.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium + Hebrew-capable fonts for PDF rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-noto-core \
      fonts-liberation \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user.
RUN groupadd --system nodejs && useradd --system --gid nodejs --create-home nextjs

# Standalone output: server.js + traced node_modules, static assets, public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
