@echo off
setlocal
title Halalan 2025 - Local Server
cd /d "%~dp0"

python -c "import http.server" >nul 2>&1
if errorlevel 1 (
    echo Python is required. Install Python and add it to PATH, then try again.
    pause
    exit /b 1
)

echo Starting Halalan 2025 at http://localhost:8085
echo Keep this window open. Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:8085"
python -m http.server 8085 --bind 127.0.0.1

if errorlevel 1 (
    echo.
    echo The server could not start. Port 8085 may already be in use.
    pause
    exit /b 1
)
endlocal
