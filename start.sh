#!/bin/bash

nohup python manage.py runserver 0.0.0.0:8000 > backend.log 2>&1 &
nohup npm run dev -- -p 3000 > frontend.log 2>&1 &

echo "Backend e Frontend iniciados"