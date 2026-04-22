#!/bin/bash

echo "========================================"
echo "AI Doctor Unified Python Backend"
echo "========================================"

cd "$(dirname "$0")"
pip3 install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
