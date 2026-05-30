#!/bin/bash

nohup python -m uvicorn platform.asgi:application --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
nohup npm run dev -- -p 3000 > frontend.log 2>&1 &

echo "Backend e Frontend iniciados"
