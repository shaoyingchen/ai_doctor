#!/bin/bash

echo "========================================"
echo "AI Doctor Unified Python Backend"
echo "========================================"

if ! command -v python3 &> /dev/null; then
  echo "Error: Python 3 is required."
  exit 1
fi

cd "$(dirname "$0")"

echo ""
echo "Installing dependencies..."
pip3 install -r requirements.txt

echo ""
echo "Starting unified backend on http://localhost:8000"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
