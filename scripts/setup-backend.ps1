# StudyOS backend bootstrapper for Windows PowerShell
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$overlay = Join-Path $root 'backend-overlay'

if (-not (Get-Command composer -ErrorAction SilentlyContinue)) { throw 'Composer was not found. Install Composer and retry.' }
if (-not (Get-Command php -ErrorAction SilentlyContinue)) { throw 'PHP was not found on PATH. Install PHP 8.2+ and retry.' }

if (-not (Test-Path (Join-Path $backend 'composer.json'))) {
    composer create-project laravel/laravel $backend '^12.0'
    if ($LASTEXITCODE -ne 0) { throw 'Laravel project creation failed.' }
}

Push-Location $backend
try {
    if (-not (Test-Path 'routes/api.php')) {
        php artisan install:api
        if ($LASTEXITCODE -ne 0) { throw 'Laravel API/Sanctum installation failed.' }
    }
} finally { Pop-Location }

$copyMap = @(
    @{ Source = 'routes/api.php'; Destination = 'routes/api.php' },
    @{ Source = 'app/Http/Controllers/Api/AuthController.php'; Destination = 'app/Http/Controllers/Api/AuthController.php' },
    @{ Source = 'app/Http/Controllers/Api/StudyTaskController.php'; Destination = 'app/Http/Controllers/Api/StudyTaskController.php' },
    @{ Source = 'app/Http/Controllers/Api/FocusSessionController.php'; Destination = 'app/Http/Controllers/Api/FocusSessionController.php' },
    @{ Source = 'app/Http/Controllers/Api/StudySettingsController.php'; Destination = 'app/Http/Controllers/Api/StudySettingsController.php' },
    @{ Source = 'app/Models/StudyTask.php'; Destination = 'app/Models/StudyTask.php' },
    @{ Source = 'app/Models/FocusSession.php'; Destination = 'app/Models/FocusSession.php' },
    @{ Source = 'app/Models/StudySubject.php'; Destination = 'app/Models/StudySubject.php' },
    @{ Source = 'app/Http/Controllers/Api/StudySubjectController.php'; Destination = 'app/Http/Controllers/Api/StudySubjectController.php' },
    @{ Source = 'database/migrations/2026_10_29_000001_create_study_tasks_table.php'; Destination = 'database/migrations/2026_10_29_000001_create_study_tasks_table.php' },
    @{ Source = 'database/migrations/2026_10_30_000002_create_study_subjects_table.php'; Destination = 'database/migrations/2026_10_30_000002_create_study_subjects_table.php' },
    @{ Source = 'database/migrations/2026_10_30_041559_add_estimated_minutes_to_study_tasks_table.php'; Destination = 'database/migrations/2026_10_30_041559_add_estimated_minutes_to_study_tasks_table.php' },
    @{ Source = 'database/migrations/2026_10_31_000001_add_planning_fields_to_study_tasks.php'; Destination = 'database/migrations/2026_10_31_000001_add_planning_fields_to_study_tasks.php' },
    @{ Source = 'database/migrations/2026_10_31_000002_add_daily_goal_to_users_table.php'; Destination = 'database/migrations/2026_10_31_000002_add_daily_goal_to_users_table.php' },
    @{ Source = 'database/migrations/2026_10_31_000003_create_focus_sessions_table.php'; Destination = 'database/migrations/2026_10_31_000003_create_focus_sessions_table.php' },
    @{ Source = 'phpunit.xml'; Destination = 'phpunit.xml' }
)
$obsoleteEstimateMigration = Join-Path $backend 'database/migrations/2026_10_30_000003_add_estimated_minutes_to_study_tasks.php'
if (Test-Path -LiteralPath $obsoleteEstimateMigration) {
    Remove-Item -LiteralPath $obsoleteEstimateMigration
}
foreach ($item in $copyMap) {
    $target = Join-Path $backend $item.Destination
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item (Join-Path $overlay $item.Source) $target -Force
}

$testsSource = Join-Path $overlay 'tests/Feature'
$testsTarget = Join-Path $backend 'tests/Feature'
New-Item -ItemType Directory -Force -Path $testsTarget | Out-Null
Copy-Item (Join-Path $testsSource '*.php') $testsTarget -Force

$userPath = Join-Path $backend 'app/Models/User.php'
$userCode = [System.IO.File]::ReadAllText($userPath)
if ($userCode -notlike '*use Laravel\Sanctum\HasApiTokens;*') {
    $userCode = $userCode.Replace('namespace App\Models;', ('namespace App\Models;' + [Environment]::NewLine + [Environment]::NewLine + 'use Laravel\Sanctum\HasApiTokens;' + [Environment]::NewLine))
}
if ($userCode -notmatch 'use HasApiTokens') {
    $userCode = $userCode -replace 'use HasFactory,\s*Notifiable;', 'use HasApiTokens, HasFactory, Notifiable;'
}
if ($userCode -notmatch "'daily_goal_minutes'") {
    $userCode = [regex]::Replace(
        $userCode,
        "(?m)^(\s*'password',\s*)$",
        "`$1`r`n        'daily_goal_minutes',",
        1
    )
}
if ($userCode -notmatch "'daily_goal_minutes' => 'integer'") {
    $userCode = [regex]::Replace(
        $userCode,
        "(?m)^(\s*'password' => 'hashed',\s*)$",
        "`$1`r`n            'daily_goal_minutes' => 'integer',",
        1
    )
}
foreach ($relationship in @(
    @{
        Name = 'studyTasks'
        Body = @'
    public function studyTasks(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\StudyTask::class);
    }
'@
    },
    @{
        Name = 'studySubjects'
        Body = @'
    public function studySubjects(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\StudySubject::class);
    }
'@
    },
    @{
        Name = 'focusSessions'
        Body = @'
    public function focusSessions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\FocusSession::class);
    }
'@
    }
)) {
    if ($userCode -notmatch "function $($relationship.Name)\(") {
        $method = [Environment]::NewLine + $relationship.Body + [Environment]::NewLine
        $userCode = [regex]::Replace($userCode, '(?m)^}', ($method + '}'), 1)
    }
}
[System.IO.File]::WriteAllText($userPath, $userCode, [System.Text.UTF8Encoding]::new($false))

Write-Host ''
Write-Host 'StudyOS Laravel backend source installed.' -ForegroundColor Green
Write-Host 'Next: configure backend/.env for your MySQL database, then run:'
Write-Host '  cd backend'
Write-Host '  php artisan migrate'
Write-Host '  php artisan test'
Write-Host '  php artisan serve'
