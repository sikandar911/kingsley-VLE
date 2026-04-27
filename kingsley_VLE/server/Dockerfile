FROM node:20-alpine

# Build arguments for versioning
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# Labels for metadata
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.source="https://github.com/kingsley-vle" \
    org.opencontainers.image.revision="${VCS_REF}" \
    org.opencontainers.image.version="${VERSION}" \
    org.opencontainers.image.title="Kingsley VLE Backend" \
    org.opencontainers.image.description="Backend API service for Kingsley Virtual Learning Environment"

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server (migrations are handled in deploy.sh)
CMD ["npm", "start"]
