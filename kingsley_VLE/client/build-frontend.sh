#!/bin/bash

# Kingsley VLE Frontend Build & Deploy Script
# Usage: ./build-frontend.sh [version]
# Example: ./build-frontend.sh latest

set -e

VERSION=${1:-latest}
IMAGE_NAME="kingsley-vle-frontend"
FULL_IMAGE="$IMAGE_NAME:$VERSION"

echo "Building Kingsley VLE Frontend"
echo "Image: $FULL_IMAGE"

echo "Installing dependencies..."
npm ci --legacy-peer-deps

echo "Building app..."
npm run build

echo "Building Docker image..."
docker build -t "$FULL_IMAGE" .

echo "Done: $FULL_IMAGE"
echo "Run locally: docker run -d -p 3000:80 $FULL_IMAGE"
