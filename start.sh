#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"
VENV_DIR="$SERVER_DIR/venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Setting up Python virtualenv..."
    # --system-site-packages: picamera2 ships as an apt package (python3-picamera2)
    # built against the system libcamera, not something pip can install.
    python3 -m venv --system-site-packages "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -q -r "$SERVER_DIR/requirements.txt"
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
    echo "Installing client dependencies..."
    (cd "$CLIENT_DIR" && npm install)
fi

pids=()

cleanup() {
    echo "Stopping..."
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait
}
trap cleanup EXIT INT TERM

(cd "$SERVER_DIR" && exec "$VENV_DIR/bin/python3" run_server.py) &
pids+=($!)

(cd "$SERVER_DIR" && exec "$VENV_DIR/bin/python3" run_camera_server.py) &
pids+=($!)

(cd "$CLIENT_DIR" && exec npm start) &
pids+=($!)

wait
