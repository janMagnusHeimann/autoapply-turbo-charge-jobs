# Multi-stage build for AutoApply
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY job-crawler/package*.json ./job-crawler/

# Install dependencies
RUN npm ci --only=production && \
    cd job-crawler && npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/job-crawler/node_modules ./job-crawler/node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Build job crawler
RUN cd job-crawler && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/job-crawler/dist ./job-crawler/dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/job-crawler/package*.json ./job-crawler/

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/job-crawler/node_modules ./job-crawler/node_modules

# Copy necessary files
COPY --from=builder /app/supabase ./supabase
COPY --from=builder /app/scripts ./scripts

USER nextjs

EXPOSE 3000
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/health-check.js || exit 1

CMD ["npm", "start"]