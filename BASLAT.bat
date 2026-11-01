@echo off
chcp 65001 >nul
title ATELIER NOIR - VIP Berber Randevu Sistemi
echo ========================================================
echo   ATELIER NOIR - VIP Berber Randevu Sistemi Baslatiliyor
echo   Adres: http://localhost:3000
echo   Admin: http://localhost:3000/admin
echo ========================================================
echo.

set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
cd /d "%~dp0"

start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"
call npm.cmd run dev
pause
