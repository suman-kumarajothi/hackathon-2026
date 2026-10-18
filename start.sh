#!/usr/bin/env bash
# =============================================================================
# CMS IoT Management Platform — Unified Startup Script
# =============================================================================
# Launches:
#   1. Backend Service (Port 8080 - REST API & Healthchecks)
#   2. Frontend Application (Port 3000 - React 18 / Vite 5)
#   3. Cloudflare Quick Tunnel (Public HTTPS URL pointing strictly to Port 3000)
#
# Security:
#   - Only Port 3000 (Frontend & Vite Proxy) is exposed to the public tunnel.
#   - Backend (Port 8080) and Redis (Port 6379) are NEVER exposed directly.
#   - Handles SIGINT (Ctrl+C), SIGTERM, and EXIT cleanly with process termination.
# =============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# ANSI Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "====================================================================="
echo "   CMS IoT Management Platform — Unified Startup & Cloudflare Tunnel"
echo "====================================================================="
echo -e "${NC}"

# 1. Environment Configuration
if [ ! -f "$REPO_ROOT/.env" ] && [ -f "$REPO_ROOT/.env.example" ]; then
  echo -e "${YELLOW}[!] .env not found. Initializing from .env.example...${NC}"
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
fi

if [ -f "$REPO_ROOT/.env" ]; then
  export $(grep -v '^#' "$REPO_ROOT/.env" | xargs -0 2>/dev/null) || true
fi

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
LOG_DIR="$REPO_ROOT/.logs"
mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
TUNNEL_LOG="$LOG_DIR/cloudflared.log"

# 2. Cleanup Function
cleanup() {
  echo ""
  echo -e "${YELLOW}[!] Shutting down all CMS services cleanly...${NC}"

  if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "  - Stopping Cloudflare Tunnel (PID: $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi

  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "  - Stopping Frontend Vite dev server (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "  - Stopping Backend API service (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  # Free lingering listeners if any
  lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
  lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true

  echo -e "${GREEN}[✔] All services stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup INT TERM EXIT

# 3. Kill lingering processes on ports 3000 & 8080
echo -e "${CYAN}[1/4] Checking ports ${FRONTEND_PORT} and ${BACKEND_PORT}...${NC}"
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true

# 4. Start Backend Service
echo -e "${CYAN}[2/4] Starting Backend REST API on port ${BACKEND_PORT}...${NC}"
SERVER_PORT=$BACKEND_PORT HOST=127.0.0.1 node "$REPO_ROOT/backend/server.js" > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# Wait for backend health
BACKEND_READY=false
for i in {1..30}; do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/actuator/health" >/dev/null 2>&1; then
    BACKEND_READY=true
    break
  fi
  sleep 0.5
done

if [ "$BACKEND_READY" = true ]; then
  echo -e "${GREEN}[✔] Backend service is UP on http://127.0.0.1:${BACKEND_PORT}${NC}"
else
  echo -e "${RED}[✘] Backend failed to start. Check $BACKEND_LOG${NC}"
  cat "$BACKEND_LOG"
  exit 1
fi

# 5. Start Frontend Dev Server
echo -e "${CYAN}[3/4] Starting Frontend (Vite) on port ${FRONTEND_PORT}...${NC}"
cd "$REPO_ROOT/frontend"
VITE_BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd "$REPO_ROOT"

# Wait for frontend ready
FRONTEND_READY=false
for i in {1..30}; do
  if curl -sf "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null 2>&1; then
    FRONTEND_READY=true
    break
  fi
  sleep 0.5
done

if [ "$FRONTEND_READY" = true ]; then
  echo -e "${GREEN}[✔] Frontend application is UP on http://127.0.0.1:${FRONTEND_PORT}${NC}"
else
  echo -e "${RED}[✘] Frontend failed to start. Check $FRONTEND_LOG${NC}"
  cat "$FRONTEND_LOG"
  exit 1
fi

# 6. Verify cloudflared installation & Launch Quick Tunnel
echo -e "${CYAN}[4/4] Establishing Cloudflare Quick Tunnel to port ${FRONTEND_PORT}...${NC}"
if ! command -v cloudflared &> /dev/null; then
  echo -e "${YELLOW}[!] cloudflared not found in PATH. Checking Homebrew...${NC}"
  if command -v brew &> /dev/null; then
    echo "  - Installing cloudflared via Homebrew..."
    brew install cloudflared
  else
    echo -e "${RED}[✘] Homebrew not found. Please install cloudflared manually.${NC}"
    exit 1
  fi
fi

# Launch Quick Tunnel pointing strictly to frontend port (Vite reverse-proxies /api to backend)
cloudflared tunnel --url "http://127.0.0.1:${FRONTEND_PORT}" --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Extract Public Tunnel URL from cloudflared logs
PUBLIC_TUNNEL_URL=""
for i in {1..40}; do
  if grep -E "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$TUNNEL_LOG" >/dev/null 2>&1; then
    PUBLIC_TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$TUNNEL_LOG" | head -n 1)
    break
  fi
  sleep 0.5
done

if [ -z "$PUBLIC_TUNNEL_URL" ]; then
  echo -e "${RED}[✘] Failed to obtain Cloudflare Quick Tunnel URL. Recent logs:${NC}"
  cat "$TUNNEL_LOG"
  exit 1
fi

# 7. Success Banner & Instructions
echo ""
echo -e "${GREEN}${BOLD}====================================================================="
echo "   🚀 CMS IoT Platform is Live & Connected via Cloudflare Tunnel!"
echo "=====================================================================${NC}"
echo ""
echo -e "  ${BOLD}Public HTTPS URL:${NC}      ${CYAN}${BOLD}${PUBLIC_TUNNEL_URL}${NC}"
echo -e "  ${BOLD}Local Frontend:${NC}        http://localhost:${FRONTEND_PORT}"
echo -e "  ${BOLD}Local Backend API:${NC}     http://localhost:${BACKEND_PORT}"
echo -e "  ${BOLD}Backend Health:${NC}        http://localhost:${BACKEND_PORT}/actuator/health"
echo ""
echo -e "${BOLD}Single Public Origin Architecture:${NC}"
echo -e "  • Web Application:     ${CYAN}${PUBLIC_TUNNEL_URL}/${NC}"
echo -e "  • Proxied API:         ${CYAN}${PUBLIC_TUNNEL_URL}/api/v1/schedules${NC}"
echo -e "  • Proxied Health:      ${CYAN}${PUBLIC_TUNNEL_URL}/actuator/health${NC}"
echo ""
echo -e "${BOLD}Security Architecture:${NC}"
echo -e "  • Only Port ${FRONTEND_PORT} is exposed to the Cloudflare Tunnel."
echo -e "  • Port ${BACKEND_PORT} (Backend) & Port 6379 (Redis) are NOT exposed directly."
echo -e "  • Vite proxies /api/* requests internally to 127.0.0.1:${BACKEND_PORT}."
echo ""
echo -e "${BOLD}Mobile & Remote Testing Instructions:${NC}"
echo -e "  1. Open ${CYAN}${PUBLIC_TUNNEL_URL}${NC} on any mobile or desktop browser."
echo -e "  2. Initial Admin: username ${BOLD}admin${NC} / password ${BOLD}admin123${NC} (Prompts for first-login password change)."
echo -e "  3. Operator Demo: username ${BOLD}operator${NC} / password ${BOLD}operator123${NC}."
echo -e "  4. Use bottom-anchored Settings (gear icon) to manage Users (Admin) or switch Light/Dark/System theme."
echo ""
echo -e "${YELLOW}Press [Ctrl+C] at any time to shut down all processes cleanly.${NC}"
echo ""

# Wait on background processes
wait
