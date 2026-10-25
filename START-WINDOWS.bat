@echo off
title Z^&Z Luxury Bridals — local server
cd /d "%~dp0"
echo ==========================================
echo   Z^&Z  Luxury Bridals - starting up...
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js not found.
  echo     Install it once from https://nodejs.org  ^(choose LTS^) and run this file again.
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo [1/2] First run - installing the two small packages used by the site...
  call npm install --no-audit --no-fund
  echo.
)

echo [2/2] Starting the website...
start "" http://localhost:3000
node server.js

echo.
echo Server stopped. Press any key to close.
pause >nul
