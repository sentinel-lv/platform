#!/usr/bin/env bash
# ==============================================================================
# Closed-Circuit (SIH 2026 / Sentinel-LV) Server Runner
# Starts the Backend (FastAPI + Simulator + WebSocket) and Frontend (Vite + React)
# ==============================================================================

set -eo pipefail

# Safely resolve script directory without stripping potential trailing newlines
_D_RAW="$(dirname -- "${BASH_SOURCE[0]}"; printf "X")"
_D_RAW="${_D_RAW%X}"
_D="${_D_RAW%$'\n'}"
_PWD_RAW="$(cd -- "$_D" && pwd; printf "X")"
_PWD_RAW="${_PWD_RAW%X}"
SCRIPT_DIR="${_PWD_RAW%$'\n'}"
unset _D_RAW _D _PWD_RAW

cd "$SCRIPT_DIR"

# Configuration
BACKEND_PORT=8015
FRONTEND_PORT=5173
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="$SCRIPT_DIR/logs"
PID_DIR="$SCRIPT_DIR/.pids"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Modes
MODE_RUN_BACKEND=true
MODE_RUN_FRONTEND=true
MODE_DAEMON=false
MODE_FORCE=false
USE_RELOAD="--reload"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "======================================================================"
    echo "       CLOSED-CIRCUIT // SENTINEL-LV — FULL STACK RUNNER             "
    echo "       Smart India Hackathon 2026 · Open Innovation · Disaster Mgmt  "
    echo "======================================================================"
    echo -e "${NC}"
}

usage() {
    print_banner
    echo -e "${BOLD}Usage:${NC} ./start.sh [options]"
    echo ""
    echo -e "${BOLD}Options:${NC}"
    echo "  -h, --help           Show this help message and exit"
    echo "  -d, --background     Run servers in background (daemon mode)"
    echo "  -f, --force          Kill any existing process on ports $BACKEND_PORT and $FRONTEND_PORT"
    echo "  --stop               Stop all running servers"
    echo "  --status             Display status of all servers"
    echo "  --backend-only       Run only the backend (+ simulator) server"
    echo "  --frontend-only      Run only the frontend dashboard"
    echo "  --no-reload          Disable Uvicorn auto-reload"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo "  ./start.sh                 # Start all servers in foreground with live logs"
    echo "  ./start.sh -f              # Force kill old instances and start"
    echo "  ./start.sh -d              # Start in background"
    echo "  ./start.sh --stop          # Stop all running instances"
    echo "  ./start.sh --status        # Check server health"
    echo ""
    exit 0
}

is_port_in_use() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti :"$port" >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln | grep -q ":$port "
    else
        fuser "$port/tcp" >/dev/null 2>&1
    fi
}

get_port_pids() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti :"$port" 2>/dev/null || true
    elif command -v fuser >/dev/null 2>&1; then
        fuser "$port/tcp" 2>/dev/null || true
    fi
}

kill_port() {
    local port="$1"
    local pids
    pids=$(get_port_pids "$port")
    if [ -n "$pids" ]; then
        log_warn "Terminating process(es) on port $port: $pids"
        for p in $pids; do
            pkill -P "$p" 2>/dev/null || true
            kill -TERM "$p" 2>/dev/null || true
        done
        sleep 0.5
        # Force kill if still lingering
        pids=$(get_port_pids "$port")
        if [ -n "$pids" ]; then
            for p in $pids; do
                kill -9 "$p" 2>/dev/null || true
            done
        fi
    fi
}

kill_pid_file() {
    local file="$1"
    local name="$2"
    if [ -f "$file" ]; then
        local pid
        pid=$(cat "$file" 2>/dev/null || true)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping $name (PID: $pid)..."
            pkill -P "$pid" 2>/dev/null || true
            kill -TERM "$pid" 2>/dev/null || true
            sleep 0.5
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$file"
    fi
}

cmd_stop() {
    print_banner
    log_info "Stopping Sentinel-LV servers..."
    kill_pid_file "$BACKEND_PID_FILE" "Backend server"
    kill_pid_file "$FRONTEND_PID_FILE" "Frontend server"

    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"

    log_success "All servers stopped."
    exit 0
}

cmd_status() {
    print_banner
    echo -e "${BOLD}Server Status Check:${NC}"
    echo "--------------------------------------------------"

    # Backend
    echo -n "Backend (Port $BACKEND_PORT): "
    if is_port_in_use "$BACKEND_PORT"; then
        local health
        health=$(curl -s --connect-timeout 2 "http://127.0.0.1:$BACKEND_PORT/healthz" 2>/dev/null || true)
        if [[ "$health" == *"ok"* ]]; then
            echo -e "${GREEN}${BOLD}RUNNING & HEALTHY${NC} (healthz: $health)"
        else
            echo -e "${YELLOW}${BOLD}PORT OPEN${NC} (healthz not responding ok)"
        fi
    else
        echo -e "${RED}STOPPED${NC}"
    fi

    # Frontend
    echo -n "Frontend (Port $FRONTEND_PORT): "
    if is_port_in_use "$FRONTEND_PORT"; then
        echo -e "${GREEN}${BOLD}RUNNING${NC}"
    else
        echo -e "${RED}STOPPED${NC}"
    fi

    echo "--------------------------------------------------"
    exit 0
}

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        -d|--background|--daemon)
            MODE_DAEMON=true
            shift
            ;;
        -f|--force)
            MODE_FORCE=true
            shift
            ;;
        --stop)
            cmd_stop
            ;;
        --status)
            cmd_status
            ;;
        --backend-only)
            MODE_RUN_BACKEND=true
            MODE_RUN_FRONTEND=false
            shift
            ;;
        --frontend-only)
            MODE_RUN_BACKEND=false
            MODE_RUN_FRONTEND=true
            shift
            ;;
        --no-reload)
            USE_RELOAD=""
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Prerequisite Checks
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Python check
    PYTHON_CMD=""
    if [ -f "$BACKEND_DIR/.venv/bin/python3" ]; then
        PYTHON_CMD="$BACKEND_DIR/.venv/bin/python3"
        log_info "Using virtualenv Python: $PYTHON_CMD"
    elif [ -f "$SCRIPT_DIR/.venv/bin/python3" ]; then
        PYTHON_CMD="$SCRIPT_DIR/.venv/bin/python3"
        log_info "Using root virtualenv Python: $PYTHON_CMD"
    elif command -v python3 >/dev/null 2>&1; then
        PYTHON_CMD="python3"
    else
        log_error "python3 is not installed or not in PATH."
        exit 1
    fi

    # Test Python dependencies
    if ! "$PYTHON_CMD" -c "import fastapi, uvicorn, pydantic, websockets" >/dev/null 2>&1; then
        log_error "Missing required Python packages for backend."
        log_info "Please install them via: pip install -r backend/requirements.txt"
        exit 1
    fi

    # Node check
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed or not in PATH."
        exit 1
    fi

    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm is not installed or not in PATH."
        exit 1
    fi

    # Frontend node_modules check
    if [ "$MODE_RUN_FRONTEND" = true ]; then
        if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
            log_warn "frontend/node_modules missing. Running 'npm install'..."
            (cd "$FRONTEND_DIR" && npm install)
        fi

        # Frontend .env check
        if [ ! -f "$FRONTEND_DIR/.env" ] && [ -f "$FRONTEND_DIR/.env.example" ]; then
            log_info "Creating frontend/.env from frontend/.env.example"
            cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
        fi
    fi

    # Directory preparation
    mkdir -p "$LOG_DIR" "$PID_DIR"
}

# Clean port allocation check
check_ports() {
    if [ "$MODE_RUN_BACKEND" = true ]; then
        if is_port_in_use "$BACKEND_PORT"; then
            if [ "$MODE_FORCE" = true ]; then
                kill_port "$BACKEND_PORT"
            else
                log_error "Port $BACKEND_PORT is already in use."
                log_info "Run with '--force' to kill existing processes, or run './start.sh --stop'"
                exit 1
            fi
        fi
    fi

    if [ "$MODE_RUN_FRONTEND" = true ]; then
        if is_port_in_use "$FRONTEND_PORT"; then
            if [ "$MODE_FORCE" = true ]; then
                kill_port "$FRONTEND_PORT"
            else
                log_error "Port $FRONTEND_PORT is already in use."
                log_info "Run with '--force' to kill existing processes, or run './start.sh --stop'"
                exit 1
            fi
        fi
    fi
}

BACKEND_PID=""
FRONTEND_PID=""
TAIL_PID=""

cleanup() {
    echo ""
    log_info "Shutting down servers cleanly..."
    trap - SIGINT SIGTERM EXIT

    if [ -n "$TAIL_PID" ]; then
        kill "$TAIL_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        pkill -P "$FRONTEND_PID" 2>/dev/null || true
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [ -n "$BACKEND_PID" ]; then
        pkill -P "$BACKEND_PID" 2>/dev/null || true
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi

    sleep 0.5
    kill_port "$FRONTEND_PORT"
    kill_port "$BACKEND_PORT"

    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
    log_success "All servers stopped."
    exit 0
}

# Main Execution
print_banner
check_prerequisites
check_ports

echo ""
log_info "Starting Sentinel-LV services..."

# Start Backend
if [ "$MODE_RUN_BACKEND" = true ]; then
    log_info "Launching Backend + Virtual Feeder Simulator on port $BACKEND_PORT..."
    (
        cd "$BACKEND_DIR"
        exec nohup "$PYTHON_CMD" -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" $USE_RELOAD > "$LOG_DIR/backend.log" 2>&1
    ) &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
    if [ "$MODE_DAEMON" = true ]; then
        disown "$BACKEND_PID" 2>/dev/null || true
    fi

    # Wait for backend healthcheck
    echo -n "Waiting for backend readiness "
    READY=false
    for i in {1..30}; do
        if curl -s "http://127.0.0.1:$BACKEND_PORT/healthz" 2>/dev/null | grep -q "ok"; then
            READY=true
            break
        fi
        echo -n "."
        sleep 0.3
    done
    echo ""

    if [ "$READY" = true ]; then
        log_success "Backend is ready! (healthz: OK)"
    else
        log_error "Backend failed to start within timeout. Check logs at: $LOG_DIR/backend.log"
        tail -n 20 "$LOG_DIR/backend.log"
        cleanup
        exit 1
    fi
fi

# Start Frontend
if [ "$MODE_RUN_FRONTEND" = true ]; then
    log_info "Launching Frontend Vite dev server on port $FRONTEND_PORT..."
    (
        cd "$FRONTEND_DIR"
        exec nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1
    ) &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
    if [ "$MODE_DAEMON" = true ]; then
        disown "$FRONTEND_PID" 2>/dev/null || true
    fi

    # Quick wait for Vite
    sleep 1
    if is_port_in_use "$FRONTEND_PORT"; then
        log_success "Frontend is ready!"
    fi
fi

echo ""
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}                SENTINEL-LV SERVICES ARE ONLINE!                     ${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
if [ "$MODE_RUN_FRONTEND" = true ]; then
    echo -e "  ${BOLD}🌐 Frontend Dashboard:${NC}    ${CYAN}${BOLD}http://localhost:$FRONTEND_PORT${NC}"
fi
if [ "$MODE_RUN_BACKEND" = true ]; then
    echo -e "  ${BOLD}⚙️  Backend API:${NC}           ${CYAN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "  ${BOLD}📚 Swagger Docs:${NC}          ${CYAN}http://localhost:$BACKEND_PORT/docs${NC}"
    echo -e "  ${BOLD}⚡ WebSocket Stream:${NC}      ${CYAN}ws://localhost:$BACKEND_PORT/stream${NC}"
    echo -e "  ${BOLD}🩺 Health Check:${NC}          ${CYAN}http://localhost:$BACKEND_PORT/healthz${NC}"
fi
echo -e "  ${BOLD}📁 Log Files:${NC}             $LOG_DIR/"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo ""

if [ "$MODE_DAEMON" = true ]; then
    log_success "Servers are running in background."
    log_info "To view live logs: tail -f logs/backend.log logs/frontend.log"
    log_info "To check status:   ./start.sh --status"
    log_info "To stop servers:   ./start.sh --stop"
    exit 0
fi

log_info "Streaming logs (Press ${BOLD}Ctrl+C${NC} to stop all servers)..."
echo ""

trap cleanup SIGINT SIGTERM EXIT

tail -n 0 -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" &
TAIL_PID=$!

wait "$TAIL_PID" 2>/dev/null || cleanup
