@echo off
title OilTrack - Supabase Keep-Alive
cd /d "%~dp0\.."
echo =======================================================
echo   OilTrack: Supabase Auto-KeepAlive Ping
echo =======================================================
node scripts\keep_supabase_alive.mjs
echo.
pause
