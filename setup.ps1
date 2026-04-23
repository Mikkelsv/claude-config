# Claude Config Setup
# Clones the config repo directly into ~/.claude/ so Claude Code finds it immediately.
#
# Usage:
#   powershell -File setup.ps1
#
# Prerequisites: git must be installed and on PATH.

param(
    [string]$RepoUrl = "https://github.com/Mikkelsv/claude-config.git"
)

$ErrorActionPreference = 'Stop'

$claudeDir = "$env:USERPROFILE\.claude"

# Check if already set up
if (Test-Path $claudeDir) {
    if (Test-Path "$claudeDir\.git") {
        Write-Host "~/.claude/ is already a git repo. Pulling latest..." -ForegroundColor Green
        git -C $claudeDir pull
    } else {
        Write-Error "~/.claude/ exists but is not a git repo. Back it up and remove it before running setup."
        exit 1
    }
} else {
    Write-Host "Cloning config repo to $claudeDir..." -ForegroundColor Cyan
    git clone $RepoUrl $claudeDir
}

# Verify structure
if (-not (Test-Path "$claudeDir\CLAUDE.md")) {
    Write-Error "Expected CLAUDE.md not found at ~/.claude/. Repo structure may be incorrect."
    exit 1
}

# Set up settings.json from template
$settingsPath = "$claudeDir\settings.json"
$templatePath = "$claudeDir\settings.template.json"

if (-not (Test-Path $settingsPath) -and (Test-Path $templatePath)) {
    Write-Host "Creating settings.json from template..." -ForegroundColor Cyan
    $content = Get-Content $templatePath -Raw
    $content = $content -replace '<USERPROFILE>', ($env:USERPROFILE -replace '\\', '/')
    Set-Content $settingsPath $content -Encoding UTF8
    Write-Host "Created settings.json — review and customize as needed." -ForegroundColor Yellow
} elseif (Test-Path $settingsPath) {
    Write-Host "settings.json already exists, skipping template." -ForegroundColor Green
}

# Register toast notification AppID so the Stop hook can show banners.
# Idempotent — safe to re-run.
$toastSetup = "$claudeDir\scripts\register-toast-appid.ps1"
if (Test-Path $toastSetup) {
    Write-Host "Registering toast notification AppID..." -ForegroundColor Cyan
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $toastSetup
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "  Config repo: $claudeDir" -ForegroundColor Cyan
Write-Host "  Remote: $RepoUrl" -ForegroundColor Cyan
