#!/usr/bin/env bash
# setup-virtual-serial.sh
# Creates a virtual serial port pair using socat (Linux) or com0com (Windows).
# Use this for local development when you don't have K-Line hardware.
#
# Usage:
#   bash tools/scripts/setup-virtual-serial.sh
#   # Outputs: /dev/ttyV0 <-> /dev/ttyV1
#   # ECU listens on /dev/ttyV0
#   # Your test client connects to /dev/ttyV1

set -euo pipefail

VIRTUAL_ECU_PORT="${VIRTUAL_ECU_PORT:-/tmp/ttyV0}"
VIRTUAL_CLIENT_PORT="${VIRTUAL_CLIENT_PORT:-/tmp/ttyV1}"
BAUD="${ECU_BAUD_RATE:-10400}"
PIDFILE="/tmp/ecu-socat.pid"

# ── Prerequisite check ──────────────────────────────────────────────────────
if ! command -v socat &>/dev/null; then
  echo "❌ socat not found. Install it:"
  echo "   Ubuntu/Debian: sudo apt install socat"
  echo "   macOS:         brew install socat"
  exit 1
fi

# ── Kill existing socat ─────────────────────────────────────────────────────
if [[ -f "$PIDFILE" ]]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "🔄 Stopping existing virtual serial bridge (PID $OLD_PID)..."
    kill "$OLD_PID"
  fi
  rm -f "$PIDFILE"
fi

# ── Remove stale symlinks ───────────────────────────────────────────────────
rm -f "$VIRTUAL_ECU_PORT" "$VIRTUAL_CLIENT_PORT"

# ── Start socat ─────────────────────────────────────────────────────────────
echo "🚀 Creating virtual serial pair:"
echo "   ECU side:    $VIRTUAL_ECU_PORT"
echo "   Client side: $VIRTUAL_CLIENT_PORT"
echo "   Baud rate:   $BAUD"

socat \
  PTY,link="$VIRTUAL_ECU_PORT",raw,echo=0,b"$BAUD" \
  PTY,link="$VIRTUAL_CLIENT_PORT",raw,echo=0,b"$BAUD" &

SOCAT_PID=$!
echo $SOCAT_PID > "$PIDFILE"

sleep 0.5

if ! kill -0 "$SOCAT_PID" 2>/dev/null; then
  echo "❌ socat failed to start."
  exit 1
fi

echo ""
echo "✅ Virtual serial bridge running (PID: $SOCAT_PID)"
echo ""
echo "   Start ECU:    ECU_TRANSPORT=serial ECU_SERIAL_PORT=$VIRTUAL_ECU_PORT npm run ecu:start:serial"
echo "   Connect test: ECU_SERIAL_PORT=$VIRTUAL_CLIENT_PORT npm run test:integration"
echo ""
echo "   Stop bridge:  kill $SOCAT_PID  (or re-run this script)"
