# Calibre Sync UI

Modern Angular 20 frontend for the **Calibre Sync API** - provides a clean interface for managing Calibre library synchronization operations.

## Overview

This UI provides a focused interface for managing Calibre library synchronization. It connects to the Calibre Sync API to offer real-time sync monitoring, progress tracking, and library comparison tools. Designed for users who need to manage sync operations between their main Calibre library and replica locations.

## Features

- 🔄 **Real-time Sync Management**: Start, stop, and monitor sync operations with live updates
- 📊 **Detailed Progress Tracking**: File-by-file sync progress with categorized results
- 🔍 **Library Comparison**: Compare main library with replica locations to identify differences
- ⚡ **Non-blocking Operations**: Background sync operations with status polling
- 📈 **Sync History**: View historical sync operations and results
- 🎯 **Clean Interface**: Focused, distraction-free UI designed for sync management
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🌙 **Modern UI**: Built with Angular Material for consistent user experience

## Quick Start

### Docker (Recommended)

```bash
# Using docker-compose
docker-compose up -d

# Or using Docker directly
docker build -t calibre-sync-ui .
docker run -p 4201:80 \
  -e API_URL=http://localhost:8001/api/v1 \
  calibre-sync-ui
```

### Development

```bash
npm install
npm start  # Runs on http://localhost:4201
```

## Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `API_URL` | Calibre Sync API base URL | `http://localhost:8001/api/v1` | `http://sync-api:8001/api/v1` |
| `PUID` | User ID for file permissions | `1000` | `1000` |
| `PGID` | Group ID for file permissions | `1000` | `1000` |
| `TZ` | Timezone | `UTC` | `America/New_York` |

### Docker Compose Example

```yaml
version: '3.8'
services:
  calibre-sync-ui:
    image: calibre-sync-ui:latest
    container_name: calibre-sync-ui
    ports:
      - "4201:80"
    environment:
      - API_URL=http://calibre-sync-api:8001/api/v1
      - PUID=1000
      - PGID=1000
      - TZ=UTC
    restart: unless-stopped
    depends_on:
      - calibre-sync-api
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Web    │    │ Calibre Sync UI │    │ Calibre Sync API│
│    Browser      │───▶│   (Angular)     │───▶│   (FastAPI)     │
│                 │    │   Port 4201     │    │   Port 8001     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                               ┌─────────────────┐
                                               │ Calibre Library │
                                               │   + Replicas    │
                                               └─────────────────┘
```

## Development

### Prerequisites

- Node.js 20+
- Angular CLI 20+
- Docker (optional)

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build:prod

# Run tests
npm test

# Lint code
npm run lint
```

### Docker Development

```bash
# Build Docker image
docker build -t calibre-sync-ui:dev .

# Run development container
docker run -p 4201:80 \
  -e API_URL=http://host.docker.internal:8001/api/v1 \
  calibre-sync-ui:dev
```

## Usage

### Basic Operations

1. **Access Interface**: Navigate to `http://localhost:4201`
2. **Start Sync**: Click the sync button to begin synchronization
3. **Monitor Progress**: Watch real-time status updates and file-level progress
4. **Review Results**: Expand sections to see detailed sync results
5. **View History**: Check previous sync operations and their outcomes

### Sync Management

- **Trigger Sync**: Start manual synchronization operations
- **Stop Sync**: Cancel running sync operations if needed
- **Progress Monitoring**: Real-time updates showing:
  - Files added, updated, deleted
  - Current operation status
  - Estimated completion time
  - Error reporting

### Library Comparison

- **Compare Libraries**: Analyze differences between main library and replicas
- **Difference Analysis**: View detailed reports of:
  - Missing files in replicas
  - Outdated files needing updates
  - Extra files in replicas
  - Metadata discrepancies

## Deployment

### Production Deployment

```bash
# Build production image
docker build -t calibre-sync-ui:latest .

# Deploy with environment variables
docker run -d \
  --name calibre-sync-ui \
  -p 80:80 \
  -e API_URL=https://your-sync-api.com/api/v1 \
  calibre-sync-ui:latest
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name sync.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:4201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support for real-time updates
    location /ws {
        proxy_pass http://localhost:4201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Windows Deployment

For Windows systems running Calibre:

```powershell
# Using Docker Desktop
docker-compose up -d

# Or build and run manually
docker build -t calibre-sync-ui .
docker run -p 4201:80 -e API_URL=http://host.docker.internal:8001/api/v1 calibre-sync-ui
```

## API Integration

This UI integrates with the [Calibre Sync API](../calibre-sync-api/) endpoints:

- `POST /api/v1/sync/trigger` - Start synchronization
- `GET /api/v1/sync/status` - Get sync status and progress
- `POST /api/v1/sync/stop` - Stop running sync
- `GET /api/v1/sync/history` - Get sync operation history
- `GET /api/v1/comparison/compare` - Compare libraries
- `GET /api/v1/system/info` - Get system information

## Docker Configuration

### Environment Variable Support

The Docker image supports runtime configuration through environment variables. The entrypoint script automatically replaces API URLs in the built Angular files.

### Multi-Stage Build

The Dockerfile uses a multi-stage build:
1. **Build Stage**: Compiles Angular application with Node.js
2. **Production Stage**: Serves compiled files with Nginx

### Health Checks

Built-in health checks ensure the service is running properly:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Troubleshooting

### Common Issues

**API Connection Failed**
```bash
# Check API URL configuration
docker logs calibre-sync-ui

# Verify API is accessible
curl http://your-api-url/health
```

**Build Failures**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Permission Issues**
```bash
# Fix file permissions (if needed)
docker exec calibre-sync-ui chown -R nginx:nginx /usr/share/nginx/html
```

**Network Connectivity**
```bash
# Test API connectivity from container
docker exec calibre-sync-ui wget -qO- http://sync-api:8001/health
```

### Debug Mode

For development, enable Angular debug mode:

```bash
# Set development environment
ng serve --configuration=development

# Or in Docker
docker run -p 4201:80 \
  -e NODE_ENV=development \
  -e API_URL=http://localhost:8001/api/v1 \
  calibre-sync-ui:dev
```

## Related Projects

- **[Calibre Sync API](../calibre-sync-api/)**: FastAPI backend for sync operations
- **[Ebook Management UI](../ebook-management-ui/)**: Angular UI for book browsing
- **[Ebook Management API](../ebook-management-api/)**: FastAPI backend for read-only access
- **[Library Browser App](../library-browser-app/)**: Android client application

## Performance Optimization

### Production Builds

The production build includes:
- AOT compilation for better performance
- Tree shaking to reduce bundle size
- Minification and compression
- Service worker for caching (if enabled)

### Nginx Configuration

Optimized Nginx configuration includes:
- Gzip compression
- Static file caching
- Efficient routing
- WebSocket support for real-time updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Ensure build passes and tests run
5. Submit a pull request

## License

This project is part of the Ebook Management System suite.

---

**Perfect for**: Calibre users who need a clean, modern interface for managing library synchronization operations across multiple locations.