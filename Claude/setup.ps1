# Claude Config Setup (Junction-based)
# Clones the config repo to ~/Documents/Code/claude-config/ and creates junctions
# so Claude Code finds everything at ~/.claude/.
#
# Usage:
#   powershell -File setup.ps1
#
# Prerequisites: git must be installed and on PATH.

param(
    [string]$RepoUrl = "https://github.com/Mikkelsv/claude-config.git"
)

$ErrorActionPreference = 'Stop'

$configRoot = "$env:USERPROFILE\Documents\Code\claude-config"
$dotclaude = "$configRoot\dotclaude"
$claudeDir = "$env:USERPROFILE\.claude"

# Check if already set up
if (Test-Path $claudeDir) {
    $item = Get-Item $claudeDir
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        Write-Host "~/.claude/ is already a junction. Setup appears complete." -ForegroundColor Green
        Write-Host "To re-run, remove the junction first: cmd /c rmdir `"$claudeDir`"" -ForegroundColor Yellow
        exit 0
    } else {
        Write-Error "~/.claude/ exists and is not a junction. Back it up and remove it before running setup."
        exit 1
    }
}

# Clone the repo
if (-not (Test-Path "$configRoot\.git")) {
    Write-Host "Cloning config repo to $configRoot..." -ForegroundColor Cyan
    git clone $RepoUrl $configRoot
} else {
    Write-Host "Config repo already exists at $configRoot. Pulling latest..." -ForegroundColor Green
    git -C $configRoot pull origin main
}

# Verify structure
if (-not (Test-Path "$dotclaude\CLAUDE.md")) {
    Write-Error "Expected dotclaude/CLAUDE.md not found. Repo structure may be incorrect."
    exit 1
}

# Create main junction: ~/.claude/ -> dotclaude/
Write-Host "Creating junction: ~/.claude/ -> dotclaude/..." -ForegroundColor Cyan
cmd /c "mklink /J `"$claudeDir`" `"$dotclaude`""

if (-not (Test-Path "$claudeDir\CLAUDE.md")) {
    Write-Error "Junction verification failed!"
    exit 1
}

# Create inner junctions for backward compat
Write-Host "Creating inner junctions..." -ForegroundColor Cyan
if (-not (Test-Path "$dotclaude\scripts")) {
    cmd /c "mklink /J `"$dotclaude\scripts`" `"$configRoot\Claude\scripts`""
}
if (-not (Test-Path "$dotclaude\templates")) {
    cmd /c "mklink /J `"$dotclaude\templates`" `"$configRoot\Claude\templates`""
}

# Install pre-commit hook
$hookSrc = "$configRoot\hooks\pre-commit"
$hookDst = "$configRoot\.git\hooks\pre-commit"
if ((Test-Path $hookSrc) -and -not (Test-Path $hookDst)) {
    Copy-Item $hookSrc $hookDst -Force
    Write-Host "Pre-commit hook installed." -ForegroundColor Cyan
}

# Set up settings.json from template
$settingsPath = "$dotclaude\settings.json"
$templatePath = "$dotclaude\settings.template.json"

if (-not (Test-Path $settingsPath) -and (Test-Path $templatePath)) {
    Write-Host "Creating settings.json from template..." -ForegroundColor Cyan
    $content = Get-Content $templatePath -Raw
    $content = $content -replace '<USERPROFILE>', ($env:USERPROFILE -replace '\\', '/')
    Set-Content $settingsPath $content -Encoding UTF8
    Write-Host "Created settings.json — review and customize as needed." -ForegroundColor Yellow
} elseif (Test-Path $settingsPath) {
    Write-Host "settings.json already exists, skipping template." -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "  Config repo: $configRoot" -ForegroundColor Cyan
Write-Host "  Junction: ~/.claude/ -> dotclaude/" -ForegroundColor Cyan
Write-Host "  Remote: $RepoUrl" -ForegroundColor Cyan
