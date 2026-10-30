@echo off
:: StudyOS - one-click project launcher
:: Starts the Laravel backend (php artisan serve), the Vite frontend
:: (npm run dev), then opens the app in the default browser.
setlocal enabledelayedexpansion

:: Resolve repository root (this file lives in scripts/)
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ========================================
echo   StudyOS - Starting Project
echo ========================================
echo.

:: Prerequisite checks
where php >nul 2>&1
if errorlevel 1 (
    echo ERROR: PHP not found in PATH. Install PHP 8.2+ and retry.
    pause
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found in PATH. Install Node.js 20+ and retry.
    pause
    exit /b 1
)

:: 1. Start Laravel backend
echo [1/3] Starting Laravel backend (php artisan serve) ...
cd /d "%ROOT%\backend"
start "" php artisan serve
cd /d "%ROOT%"

:: 2. Start frontend dev server
echo [2/3] Starting frontend dev server (npm run dev) ...
cd /d "%ROOT%\frontend"
start "" cmd /c "npm run dev"
cd /d "%ROOT%"

:: 3. Wait for servers to boot, then open browser
echo [3/3] Waiting for servers to start...
timeout /t 6 /nobreak >nul

echo.
echo Opening http://localhost:5173 in your default browser...
start "" "http://localhost:5173"

echo.
echo StudyOS is running:
echo   Backend API : http://127.0.0.1:8000
echo   Frontend    : http://localhost:5173
echo.
echo Keep these command windows open while developing.
pause