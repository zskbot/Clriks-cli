#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")/.." || exit 1

PROMPT="$*"

if [ -z "$PROMPT" ]; then
    echo "Usage:"
    echo "./scripts/design-request.sh \"KIO AI dashboard\""
    exit 1
fi

curl -fsS \
    -X POST \
    http://127.0.0.1:8789/design/generate \
    -H 'Content-Type: application/json' \
    -d "$(python -c 'import json,sys; print(json.dumps({"prompt":" ".join(sys.argv[1:]),"format":"svg"}))' "$@")"

echo
