#!/bin/sh

git checkout main
git branch -D release
git fetch
git checkout release

lsof -t -i:3000 | xargs -r kill
pm2 start ecosystem.config.cjs
