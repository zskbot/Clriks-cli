# Clriks Python Design Engine

Python worker for Clriks-cli.

## Architecture

Frontend
→ Node.js
→ Python Design Engine
→ SVG / HTML
→ future AI / graphics workers

## API

GET /health

POST /design/generate

Example:

{
  "prompt": "KIO AI dashboard",
  "format": "svg"
}

Formats:

- svg
- html

The service binds only to 127.0.0.1.
