#!/bin/sh

git checkout main
git branch -D release
git fetch
git checkout release

kill $(lsof -t -i:3000)
pm2 start
