@echo off
rem Emiri: generate today's fortune pages and publish them (alternative to GitHub Actions).
rem Register this file in Windows Task Scheduler to run every day at 0:05.
rem Requires Node.js 22+ and Git. Keep this file in tools\daily of the repository.
cd /d "%~dp0\..\.."
node tools\daily\generate.mjs || exit /b 1
call npm test || exit /b 1
call npm run check || exit /b 1
git add unsei index.html
git diff --cached --quiet && exit /b 0
git commit -m "Update daily fortune (unsei)"
git push
