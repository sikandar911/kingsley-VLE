FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (required by Prisma)
RUN apk add --no-cache openssl python3 make g++

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

# Start server (migrations are handled in deploy.sh)
CMD ["npm", "start"]
