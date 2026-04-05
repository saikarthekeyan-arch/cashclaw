@echo off
title CashClaw - AI Agent
color 0A
echo.
echo  ====================================
echo     CASHCLAW - AI Agent
echo  ====================================
echo.
echo  Starting services...
echo.

cd /d "%~dp0"

REM Start the dashboard server
start "CashClaw Dashboard" cmd /k "node bin/cashclaw.js dashboard"

REM Start job polling
start "CashClaw Poll" cmd /k "node bin/cashclaw.js hyrve poll"

REM Start heartbeat
start "CashClaw Heartbeat" cmd /k "node hyrve-heartbeat.js"

REM Start job notifier
start "CashClaw Notifier" cmd /k "node job-notifier.js"

REM Start Toku Agency monitor
start "Toku Monitor" cmd /k "node toku-monitor.js"

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Open browser
start http://localhost:3847

echo.
echo  All services running!
echo  - Dashboard: http://localhost:3847
echo  - HYRVE: Monitoring for jobs
echo  - Toku: Monitoring for jobs
echo  - Windows notifications on new jobs
echo.
echo  Press any key to exit...
pause > nul
