# StudyOS — one-command full project setup (Windows PowerShell)
# Runs: prerequisite checks -> frontend install -> backend generation
#       -> MySQL .env config -> migrations -> tests -> start servers -> open browser
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'
$backendSetup = Join-Path $root 'scripts/setup-backend.ps1'

Write-Host '=== StudyOS full project setup ===' -ForegroundColor Cyan

# ----------------------------------------------------------------------
# 1. Prerequisite checks
# ----------------------------------------------------------------------
function Test-Cmd($name) {
    return (Get-Command $name -ErrorAction SilentlyContinue) -ne $null
}

Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow
$missing = @()
if (-not (Test-Cmd node))  { $missing += 'Node.js (node)'  }
if (-not (Test-Cmd npm))   { $missing += 'npm'           }
if (-not (Test-Cmd php))   { $missing += 'PHP (php)'     }
if (-not (Test-Cmd composer)) { $missing += 'Composer (composer)' }

if ($missing.Count -gt 0) {
    throw "Missing prerequisites: $($missing -join ', '). Install them and retry."
}

Write-Host "  Node.js : $(node -v)" -ForegroundColor Green
Write-Host "  npm     : $(npm -v)"  -ForegroundColor Green
Write-Host "  PHP     : $(php -v | Select-Object -First 1)" -ForegroundColor Green
Write-Host "  Composer: $(composer --version | Select-Object -First 1)" -ForegroundColor Green

# ----------------------------------------------------------------------
# 2. Frontend setup
# ----------------------------------------------------------------------
Write-Host "`n[2/6] Setting up frontend..." -ForegroundColor Yellow
Push-Location $frontend
try {
    if (-not (Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
        Write-Host "  Created frontend/.env from .env.example" -ForegroundColor Green
    } else {
        Write-Host "  frontend/.env already exists, skipping" -ForegroundColor Gray
    }

    if (-not (Test-Path 'node_modules')) {
        npm install
        if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
        Write-Host "  npm install complete" -ForegroundColor Green
    } else {
        Write-Host "  node_modules already exists, skipping npm install" -ForegroundColor Gray
    }
} finally { Pop-Location }

# ----------------------------------------------------------------------
# 3. Backend generation (Laravel skeleton + overlay from backend-overlay/)
# ----------------------------------------------------------------------
Write-Host "`n[3/6] Generating Laravel backend..." -ForegroundColor Yellow
Set-ExecutionPolicy -Scope Process Bypass -ErrorAction SilentlyContinue
& $backendSetup
if ($LASTEXITCODE -ne 0) { throw 'Backend setup script (setup-backend.ps1) failed.' }

# ----------------------------------------------------------------------
# 4. Configure backend/.env for MySQL database 'studyos'
# ----------------------------------------------------------------------
Write-Host "`n[4/6] Configuring backend/.env for MySQL..." -ForegroundColor Yellow
$envPath = Join-Path $backend '.env'
$envContent = Get-Content $envPath -Raw

# Switch SQLite default to MySQL and point database name at studyos
$envContent = $envContent -replace 'DB_CONNECTION=sqlite', 'DB_CONNECTION=mysql'
$envContent = $envContent -replace '# DB_DATABASE=laravel', 'DB_DATABASE=studyos'

[System.IO.File]::WriteAllText($envPath, $envContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  backend/.env updated for MySQL database 'studyos'" -ForegroundColor Green

Write-Host "  IMPORTANT: open backend/.env and set DB_USERNAME / DB_PASSWORD for your MySQL server." -ForegroundColor Yellow
Write-Host "  Make sure MySQL/MariaDB is running and a database named 'studyos' exists." -ForegroundColor Yellow

# ----------------------------------------------------------------------
# 5. Migrations + tests
# ----------------------------------------------------------------------
Write-Host "`n[5/6] Running migrations and test suite..." -ForegroundColor Yellow
Push-Location $backend
try {
    php artisan migrate
    if ($LASTEXITCODE -ne 0) {
        throw "php artisan migrate failed. Verify DB credentials in backend/.env and that MySQL is running."
    }
    Write-Host "  Migrations complete" -ForegroundColor Green

    php artisan test
    if ($LASTEXITCODE -ne 0) { throw 'php artisan test failed.' }
    Write-Host "  Test suite passed" -ForegroundColor Green
} finally { Pop-Location }

# ----------------------------------------------------------------------
# 6. Start dev servers and open browser
# ----------------------------------------------------------------------
Write-Host "`n[6/6] Starting dev servers..." -ForegroundColor Yellow
Start-Process php -ArgumentList 'artisan serve' -WorkingDirectory $backend -WindowStyle Hidden
Start-Process npm   -ArgumentList 'run dev'     -WorkingDirectory $frontend -WindowStyle Hidden

Write-Host "`n=== Setup complete! ===" -ForegroundColor Green
Write-Host "Backend API : http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Frontend    : http://localhost:5173" -ForegroundColor Cyan
Write-Host "Opening frontend in your default browser..." -ForegroundColor Cyan
Start-Process 'http://localhost:5173'