#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")/.." || exit 1

PID_FILE=".clriks-python-agent.pid"
LOG_FILE="data/clriks-python-agent.log"

mkdir -p data

if [ -f "$PID_FILE" ]; then
    PID="$(cat "$PID_FILE" 2>/dev/null || true)"

    if [ -n "$PID" ] &&
       kill -0 "$PID" 2>/dev/null; then
        echo "PYTHON AGENT ALREADY RUNNING"
        echo "PID=$PID"
        exit 0
    fi

    rm -f "$PID_FILE"
fi

pkill -f "python/design_engine.py" 2>/dev/null || true

nohup python python/design_engine.py \
    > "$LOG_FILE" 2>&1 &

PID=$!

echo "$PID" > "$PID_FILE"

sleep 1

if kill -0 "$PID" 2>/dev/null; then
    echo "CLRICKS PYTHON AGENT ONLINE"
    echo "PID=$PID"
    echo "URL=http://127.0.0.1:8789"
    echo "LOG=$LOG_FILE"
else
    echo "PYTHON AGENT FAILED"
    cat "$LOG_FILE"
    exit 1
fi
