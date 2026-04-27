# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Vite app with production env
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Build arguments for versioning
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# Labels for metadata
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
  org.opencontainers.image.source="https://github.com/kingsley-vle" \
  org.opencontainers.image.revision="${VCS_REF}" \
  org.opencontainers.image.version="${VERSION}" \
  org.opencontainers.image.title="Kingsley VLE Frontend" \
  org.opencontainers.image.description="Frontend service for Kingsley Virtual Learning Environment"

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
