#!/bin/bash
# dev-both.sh — Start both IPC and TaskLine for integrated testing
# Usage: ./dev-both.sh
#
# IPC:       http://localhost:5173 (Vite) + http://localhost:3001 (API)
# TaskLine:  http://localhost:3000

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IPC_DIR="$SCRIPT_DIR"
TASKLINE_DIR="$(dirname "$SCRIPT_DIR")/dashboard-taskline"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check TaskLine exists
if [ ! -d "$TASKLINE_DIR" ]; then
    echo -e "${RED}ERROR: TaskLine not found at $TASKLINE_DIR${NC}"
    echo "Expected: ../dashboard-taskline relative to this project"
    exit 1
fi

# Kill any existing processes on our ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
kill $(lsof -ti :3000) 2>/dev/null || true
kill $(lsof -ti :3001) 2>/dev/null || true
kill $(lsof -ti :5173) 2>/dev/null || true

# Small delay for port release
sleep 1

echo -e "${GREEN}Starting TaskLine (port 3000)...${NC}"
cd "$TASKLINE_DIR"
npm run dev &
TL_PID=$!

echo -e "${GREEN}Starting IPC (ports 3001 + 5173)...${NC}"
cd "$IPC_DIR"
npm run dev &
IPC_PID=$!

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Both apps running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  📊 IPC:       ${GREEN}http://localhost:5173${NC}"
echo -e "  📋 TaskLine:  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both"
echo ""

# Trap SIGINT/SIGTERM to kill both
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $TL_PID 2>/dev/null || true
    kill $IPC_PID 2>/dev/null || true
    wait $TL_PID 2>/dev/null || true
    wait $IPC_PID 2>/dev/null || true
    echo -e "${GREEN}Done.${NC}"
}
trap cleanup SIGINT SIGTERM

# Wait for either to exit
wait
