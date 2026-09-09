# Ultra-lightweight single-container build for CasaOS
FROM node:20-alpine AS base

# Install only runtime essentials (~minimal footprint)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Build ---
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production runner (<50MB overhead target) ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Memory limit hint for CasaOS
ENV NODE_OPTIONS="--max-old-space-size=128"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Download directory mount point
RUN mkdir -p /DATA/Downloads/Movies && chown nextjs:nodejs /DATA/Downloads/Movies

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DOWNLOAD_PATH=/DATA/Downloads/Movies

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
