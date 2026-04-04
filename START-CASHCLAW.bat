@echo off
title CashClaw Dashboard
color 0A
echo.
echo  ====================================
echo     CASHCLAW - AI Agent Dashboard
echo  ====================================
echo.
echo  Starting services...
echo.

cd /d "%~dp0"

REM Start the dashboard server
start "CashClaw Server" cmd /k "node bin/cashclaw.js dashboard"

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Open browser
start http://localhost:3847

echo  Dashboard should be open at: http://localhost:3847
echo.
echo  Press any key to exit...
pause > nul
