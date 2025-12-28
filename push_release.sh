#!/bin/sh

git branch -D release
git checkout -b release
yarn build

rm .gitignore
mv .gitignore.release .gitignore

git add .
git commit -m "release"
git push -f origin release
git checkout main
