# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Install required packages for entrypoint script
RUN apk add --no-cache tzdata wget

# Copy built application
COPY --from=build /app/dist/calibre-sync-ui /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment variables with defaults
ENV API_URL=http://localhost:8001/api/v1
ENV PUID=1000
ENV PGID=1000
ENV TZ=UTC

# Expose port 80
EXPOSE 80

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]