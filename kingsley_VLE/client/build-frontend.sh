#!/bin/bash

# Kingsley VLE Frontend Production Build & Deploy Script
# Usage: ./build-frontend.sh [version]
# Example: ./build-frontend.sh latest

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=${1:-latest}
IMAGE_NAME="kingsley-vle-frontend"
FULL_IMAGE="$IMAGE_NAME:$VERSION"
FRONTEND_URL="https://classroom.kingsleyinstitute.com"
BACKEND_API_URL="https://vle.kingsleyinstitute.com/api"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

if ! command -v docker >/dev/null 2>&1; then
	echo "docker is required but was not found in PATH."
	exit 1
fi

if [ ! -f ".env.production" ]; then
	echo "Missing .env.production in $SCRIPT_DIR"
	exit 1
fi

if ! grep -q '^VITE_API_URL=https://vle\.kingsleyinstitute\.com/api$' .env.production; then
	echo "Warning: .env.production does not match the expected production API URL."
	echo "Expected: VITE_API_URL=$BACKEND_API_URL"
fi

echo "Building Kingsley VLE Frontend"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend API:   $BACKEND_API_URL"
echo "Image:         $FULL_IMAGE"

echo "Building Docker image..."
docker build \
	--build-arg BUILD_DATE="$BUILD_DATE" \
	--build-arg VCS_REF="$VCS_REF" \
	--build-arg VERSION="$VERSION" \
	--build-arg VITE_API_URL="$BACKEND_API_URL" \
	-t "$FULL_IMAGE" \
	.

echo "Done: $FULL_IMAGE"
echo "Run locally: docker run -d -p 3000:80 $FULL_IMAGE"
