# Kingsley VLE Production Deployment Guide

## Overview

- **Frontend (React/Vite)**: Deployed to `https://classroom.kingsleyinstitute.com`
- **Backend (Express.js)**: Running at `https://vle.kingsleyinstitute.com/api`
- **Database**: PostgreSQL at `62.169.25.212:5433`

---

## Frontend Deployment

### Environment Setup

**File**: `client/.env.production`

```env
VITE_API_URL=/api
```

`VITE_API_URL` is now only a fallback. In production, the frontend first requests `/api/config`, and nginx proxies that request to the backend runtime config endpoint.

### Runtime Config Flow

1. Browser loads the frontend bundle.
2. Frontend requests `/api/config` from the same origin.
3. Frontend nginx proxies `/api/config` to `${BACKEND_ORIGIN}/api/config`.
4. Backend returns public runtime config:
   - `apiUrl`: backend API base URL
5. Frontend configures Axios with that `apiUrl` before rendering the app.

If `/api/config` is unavailable, the frontend falls back to `VITE_API_URL`, which should remain `/api` for local/dev-style proxying.

### Build and Push Docker Image

#### Step 1: Build the Docker Image

```bash
cd client

# Build the image
docker build -t kingsley-vle-frontend:latest .

# Or with a version tag
docker build -t kingsley-vle-frontend:1.0.0 .
```

#### Step 2: Push to Registry

```bash
# If using Docker Hub
docker tag kingsley-vle-frontend:latest yourrepo/kingsley-vle-frontend:latest
docker push yourrepo/kingsley-vle-frontend:latest

# If using Azure Container Registry (ACR)
az acr build --registry <your-acr-name> --image kingsley-vle-frontend:latest .

# If using GitHub Container Registry
docker tag kingsley-vle-frontend:latest ghcr.io/yourorg/kingsley-vle-frontend:latest
docker push ghcr.io/yourorg/kingsley-vle-frontend:latest
```

#### Step 3: Deploy Container

**Via Docker CLI:**
```bash
docker run -d \
  --name kingsley-frontend \
  -p 3000:3000 \
  --restart unless-stopped \
  kingsley-vle-frontend:latest
```

**Via Docker Compose:**
```bash
docker-compose -f docker-compose.prod.yml up -d frontend
```

Set the backend origin for the frontend container at deploy time:

```bash
export BACKEND_ORIGIN=https://vle.kingsleyinstitute.com
docker-compose -f docker-compose.prod.yml up -d frontend
```

**Via Kubernetes:**
```bash
kubectl apply -f k8s-frontend-deployment.yaml
```

---

## Backend Integration

The backend is already running at:
- **API URL**: `https://vle.kingsleyinstitute.com/api`
- **Health Check**: `GET https://vle.kingsleyinstitute.com/api/health`

It should also expose:
- **Runtime Config**: `GET https://vle.kingsleyinstitute.com/api/config`

### CORS Configuration

Backend already configured for frontend domain:
```
Access-Control-Allow-Origin: https://classroom.kingsleyinstitute.com
```

### Backend Runtime Config Endpoint

Backend now serves a public runtime config payload from `/api/config`:

```json
{
   "apiUrl": "https://vle.kingsleyinstitute.com/api"
}
```

Do not place secrets in this endpoint. It is intended only for public browser-safe config.

---

## Nginx Configuration Details

**File**: `client/nginx.conf.template`

### Key Features:

1. **Runtime Config Proxy** - `/api/config` is proxied to the backend using `BACKEND_ORIGIN`
   ```nginx
   location = /api/config {
       proxy_pass ${BACKEND_ORIGIN}/api/config;
   }
   ```

2. **SPA Routing** - All unmatched routes redirect to `index.html`
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

3. **Static Asset Caching** - Long-lived cache for JS/CSS/Images
   ```nginx
   location ~* \.(js|css|png|jpg)$ {
       expires 1y;
   }
   ```

4. **Health Check** - Container orchestration can verify status
   ```
   http://localhost:3000/
   ```

---

## Docker Image Details

### Frontend Dockerfile Build Process

**Stage 1: Build**
- Uses `node:20-alpine` for small image size
- Installs dependencies: `npm ci`
- Builds optimized bundle: `npm run build`
- Output: `/app/dist` directory

**Stage 2: Production**
- Uses `nginx:1.25-alpine` (lightweight)
- Copies built app to Nginx serving directory
- Exposes port `3000`
- Includes health check

### Image Size
- Expected: ~80-100MB (optimized)

### Build Time
- Expected: 3-5 minutes (depends on npm cache)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Test locally: `npm run build && npm run preview`
- [ ] Verify `.env.production` keeps `VITE_API_URL=/api`
- [ ] Verify `BACKEND_ORIGIN` is set for the frontend container
- [ ] Check backend is accessible: `curl https://vle.kingsleyinstitute.com/api/health`
- [ ] Check backend runtime config: `curl https://vle.kingsleyinstitute.com/api/config`
- [ ] Review Nginx configuration for your domain

### Deployment
- [ ] Build Docker image
- [ ] Push to container registry
- [ ] Update docker-compose or deployment manifests
- [ ] Deploy to production server/cluster
- [ ] Verify frontend loads at `https://classroom.kingsleyinstitute.com`

### Post-Deployment
- [ ] Test frontend functionality (login, navigation)
- [ ] Check API integration (network requests in DevTools)
- [ ] Verify static assets load (CSS, JS, images)
- [ ] Monitor container logs: `docker logs kingsley-frontend`

---

## Troubleshooting

### 404 Errors on Page Refresh
**Problem**: Routes like `/teacher/courses` return 404  
**Solution**: Already configured in `nginx.conf` - verify SPA routing is enabled

### API Connection Timeout
**Problem**: Frontend can't reach backend API  
**Solution**: 
- Check `GET /api/config` from the frontend domain
- Verify `BACKEND_ORIGIN` is set correctly for the frontend container
- Verify backend is running at `https://vle.kingsleyinstitute.com`
- Check security group/firewall rules

### CSS/JS Not Loading
**Problem**: Unstyled page or missing functionality  
**Solution**:
- Check browser DevTools > Network tab
- Verify Nginx serving correct MIME types
- Check Nginx `mime.types` configuration

### Container Won't Start
**Problem**: Docker fails to start  
**Solution**:
```bash
# Check logs
docker logs kingsley-frontend

# Verify image exists
docker images | grep kingsley

# Check port availability
netstat -an | grep 3000
```

---

## Performance Optimization

### Caching Strategy
```
Static Assets (JS/CSS/images):    Cache 1 year
HTML files:                        No cache
API Requests:                      Controlled by backend headers
```

### Compression
- Gzip enabled for text-based files
- Recommended for production

### Build Optimization
```bash
# Analyze bundle size (in client directory)
npm run build -- --analyze
```

---

## SSL/TLS Setup

### If Using Self-Hosted Nginx
Use Let's Encrypt with Certbot:
```bash
certbot certonly --webroot -w /usr/share/nginx/html \
  -d classroom.kingsleyinstitute.com
```

### Behind a Reverse Proxy (Recommended)
- Use CloudFlare, AWS ALB, or nginx reverse proxy
- Let it handle SSL/TLS
- Nginx services HTTP internally (port 3000)

---

## Monitoring

### Container Health
```bash
# Check container status
docker ps --filter "name=kingsley-frontend"

# View logs
docker logs -f kingsley-frontend

# Check resource usage
docker stats kingsley-frontend
```

### Application Monitoring
- Set up error tracking (e.g., Sentry)
- Monitor API response times
- Track frontend performance (Core Web Vitals)

---

## Rollback Procedure

```bash
# Stop current container
docker stop kingsley-frontend

# Start previous version
docker run -d --name kingsley-frontend-old \
  -p 3000:3000 \
  kingsley-vle-frontend:previous-version

# Remove failed version
docker rm kingsley-frontend
```

---

## Additional Resources

- [Vite Production Build Guide](https://vitejs.dev/guide/build.html)
- [Nginx SPA Configuration](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [React Router Production Guide](https://reactrouter.com/en/main/guides/deferred-fetch-data)
