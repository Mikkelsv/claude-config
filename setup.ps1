# Claude Config Setup
# Initializes ~/.claude/ as a git repo linked to the claude-config GitHub repo.
#
# Usage:
#   irm https://raw.githubusercontent.com/Mikkelsv/claude-config/main/setup.ps1 | iex
#   -- or --
#   powershell -File setup.ps1

param(
    [string]$RepoUrl = "https://github.com/Mikkelsv/claude-config.git"
)

$claudeDir = Join-Path $env:USERPROFILE ".claude"

if (-not (Test-Path $claudeDir)) {
    Write-Host "Creating $claudeDir..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $claudeDir | Out-Null
}

# Initialize git repo if not already one
$gitDir = Join-Path $claudeDir ".git"
if (-not (Test-Path $gitDir)) {
    Write-Host "Initializing git repo in $claudeDir..." -ForegroundColor Cyan
    git -C $claudeDir init
    git -C $claudeDir remote add origin $RepoUrl
} else {
    Write-Host "$claudeDir is already a git repo." -ForegroundColor Green
    # Ensure remote is set
    $remote = git -C $claudeDir remote get-url origin 2>$null
    if (-not $remote) {
        git -C $claudeDir remote add origin $RepoUrl
    }
}

# Pull latest
Write-Host "Pulling latest config..." -ForegroundColor Cyan
git -C $claudeDir pull origin main

# Set up settings.json from template if it doesn't exist
$settingsPath = Join-Path $claudeDir "settings.json"
$templatePath = Join-Path $claudeDir "settings.template.json"

if (-not (Test-Path $settingsPath) -and (Test-Path $templatePath)) {
    Write-Host "Creating settings.json from template..." -ForegroundColor Cyan
    $content = Get-Content $templatePath -Raw
    $content = $content -replace '<USERPROFILE>', ($env:USERPROFILE -replace '\\', '/')
    Set-Content $settingsPath $content -Encoding UTF8
    Write-Host "Created $settingsPath — review and customize as needed." -ForegroundColor Yellow
} elseif (Test-Path $settingsPath) {
    Write-Host "settings.json already exists, skipping template." -ForegroundColor Green
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "  Repo: $claudeDir" -ForegroundColor Cyan
Write-Host "  Remote: $RepoUrl" -ForegroundColor Cyan
Write-Host "  Settings: $settingsPath" -ForegroundColor Cyan
