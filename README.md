# Calibre Sync UI

Angular 20 frontend application for **Calibre Sync API** - handles synchronization operations and library management.

## Purpose

This UI is designed to run on the **Windows PC** alongside the Calibre Sync API to provide:

- **Sync Management**: Trigger and monitor library synchronization operations
- **Comparison Tools**: Compare library contents with replicas
- **Status Monitoring**: Real-time sync status and progress tracking
- **File Details**: View detailed sync results including added/updated/deleted files

## Features

- 🔄 **Real-time Sync Status**: Live updates during sync operations
- 📊 **Detailed Progress**: File-by-file sync progress with categorized results
- 🔍 **Library Comparison**: Compare main library with replica locations
- ⚡ **Background Operations**: Non-blocking sync operations with status polling
- 🎯 **Focused Interface**: Clean, sync-focused UI without distractions

## Configuration

### Environment

- **Development**: `http://localhost:8001/api/v1` (Calibre Sync API)
- **Production**: Update `src/environments/environment.prod.ts` with production URL

### Port

- **Development**: `4201` (different from ebook-management-ui on 4200)
- **Production**: Configure as needed

## Architecture

This UI connects to the **Calibre Sync API** running on port 8001:

```
[Windows PC]
├── Calibre Library
├── Calibre Sync API (Port 8001)
└── Calibre Sync UI (Port 4201) ← This app
```

## Development

### Prerequisites

- Node.js 18+
- Angular CLI 20+

### Setup

```bash
npm install
npm start  # Runs on http://localhost:4201
```

### Build

```bash
npm run build:prod
```

## Usage

1. **Access Interface**: Navigate to `http://localhost:4201`
2. **Trigger Sync**: Use the sync button to start synchronization
3. **Monitor Progress**: Watch real-time status updates
4. **Review Results**: Expand file details to see specific changes
5. **Compare Libraries**: Use comparison tools to analyze differences

## Related Applications

- **Calibre Sync API**: Backend API handling sync operations (port 8001)
- **Ebook Management UI**: Read-only book browser running on server (port 4200)

This is the **write/sync interface** while the Ebook Management UI is the **read-only interface**.