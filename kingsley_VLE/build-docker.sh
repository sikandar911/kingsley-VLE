#!/bin/bash
# Build script for Kingsley VLE with versioning

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load version from .env.build or use default
VERSION=${VERSION:-1.0.0}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo -e "${YELLOW}Building Kingsley VLE with version: $VERSION${NC}"
echo "Build Date: $BUILD_DATE"
echo "VCS Ref: $VCS_REF"
echo ""

# Build Backend
echo -e "${YELLOW}Building Backend...${NC}"
cd server
docker build \
  --build-arg VERSION=$VERSION \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VCS_REF=$VCS_REF \
  -t kingsley-backend:$VERSION \
  -t kingsley-backend:latest \
  --no-cache .
cd ..

# Build Frontend
echo -e "${YELLOW}Building Frontend...${NC}"
cd client
docker build \
  --build-arg VERSION=$VERSION \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VCS_REF=$VCS_REF \
  -t kingsley-frontend:$VERSION \
  -t kingsley-frontend:latest \
  --no-cache .
cd ..

echo -e "${GREEN}Build completed successfully!${NC}"
echo ""
echo "Built images:"
echo "  - kingsley-backend:$VERSION"
echo "  - kingsley-backend:latest"
echo "  - kingsley-frontend:$VERSION"
echo "  - kingsley-frontend:latest"
echo ""
echo "To start the containers, run:"
echo "  docker-compose -f server/docker-compose.yml up -d"
echo "  docker-compose -f client/docker-compose.prod.yml up -d"
