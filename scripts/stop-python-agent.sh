#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")/.." || exit 1

if [ -f ".clriks-python-agent.pid" ]; then
    PID="$(cat .clriks-python-agent.pid 2>/dev/null || true)"

    if [ -n "$PID" ]; then
        kill "$PID" 2>/dev/null || true
    fi

    rm -f ".clriks-python-agent.pid"
fi

pkill -f "python/design_engine.py" 2>/dev/null || true

echo "CLRICKS PYTHON AGENT STOPPED"
