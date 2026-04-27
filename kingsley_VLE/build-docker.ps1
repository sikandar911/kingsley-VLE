# Build script for Kingsley VLE with versioning (Windows PowerShell)
# Usage: .\build-docker.ps1 -Version "1.0.1" (optional, defaults to 1.0.0)

param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

# Get build metadata
$BuildDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$VcsRef = git rev-parse --short HEAD 2>$null || "unknown"

Write-Host "Building Kingsley VLE with version: $Version" -ForegroundColor Yellow
Write-Host "Build Date: $BuildDate"
Write-Host "VCS Ref: $VcsRef"
Write-Host ""

# Build Backend
Write-Host "Building Backend..." -ForegroundColor Yellow
Set-Location server
docker build `
  --build-arg VERSION=$Version `
  --build-arg BUILD_DATE=$BuildDate `
  --build-arg VCS_REF=$VcsRef `
  -t kingsley-backend:$Version `
  -t kingsley-backend:latest `
  --no-cache .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Build Frontend
Write-Host "Building Frontend..." -ForegroundColor Yellow
Set-Location client
docker build `
  --build-arg VERSION=$Version `
  --build-arg BUILD_DATE=$BuildDate `
  --build-arg VCS_REF=$VcsRef `
  -t kingsley-frontend:$Version `
  -t kingsley-frontend:latest `
  --no-cache .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Built images:"
Write-Host "  - kingsley-backend:$Version"
Write-Host "  - kingsley-backend:latest"
Write-Host "  - kingsley-frontend:$Version"
Write-Host "  - kingsley-frontend:latest"
Write-Host ""
Write-Host "To start the containers, run:"
Write-Host "  docker-compose -f server/docker-compose.yml up -d"
Write-Host "  docker-compose -f client/docker-compose.prod.yml up -d"
