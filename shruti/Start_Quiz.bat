@echo off
title Shruti Quiz Launcher
cd /d "c:\Users\RANIT DUTTA\OneDrive\Documents\shruti"

echo Starting Shruti Quiz Server...
powershell -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Hidden node -ArgumentList 'server.js' }"

timeout /t 2 /nobreak >nul

echo Opening Quiz in browser...
start http://localhost:3000
exit
