# =============================================================================
# Frontend Dockerfile — Multi-Stage Build
# =============================================================================
# Stage 1: Build React application with Node 18
# Stage 2: Serve static assets via Nginx 1.25
#
# Build args:
#   VITE_API_BASE_URL — API base path (default: /api, proxied by Nginx)
#
# Usage:
#   docker build -t hackathon-frontend .
#   docker run -p 3000:3000 hackathon-frontend
# =============================================================================

# --- Stage 1: Build ---
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:1.25-alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config and built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Install curl for healthcheck
RUN apk add --no-cache curl

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
