#!/bin/sh

git checkout main
git branch -D release
git fetch
git checkout release

# Kill Nuxt port nếu đang chạy
PID=$(lsof -t -iTCP:3000 -sTCP:LISTEN)
[ -n "$PID" ] && kill $PID

# Start Nuxt via PM2
pm2 start ecosystem.config.cjs --update-env
