# Migration script: Move from ~/.claude/ git repo to ~/Documents/Code/claude-config/ with junction
#
# PREREQUISITES:
# 1. Close ALL Claude Code sessions
# 2. The new repo structure must already exist at ~/Documents/Code/claude-config/
#    (created by the plan implementation)
#
# This script:
# 1. Copies settings.json and auto-managed directories from ~/.claude/ to dotclaude/
# 2. Renames ~/.claude/ to ~/.claude-backup/
# 3. Creates the main junction: ~/.claude/ -> dotclaude/
# 4. Creates inner junctions: dotclaude/scripts/ -> Claude/scripts/, dotclaude/templates/ -> Claude/templates/
# 5. Initializes git, installs pre-commit hook, makes initial commit, sets remote

$ErrorActionPreference = 'Stop'

$configRoot = "$env:USERPROFILE\Documents\Code\claude-config"
$dotclaude = "$configRoot\dotclaude"
$oldClaude = "$env:USERPROFILE\.claude"
$backup = "$env:USERPROFILE\.claude-backup"

# Verify new structure exists
if (-not (Test-Path "$dotclaude\CLAUDE.md")) {
    Write-Error "New structure not found at $dotclaude. Run the plan implementation first."
    exit 1
}

# Verify old .claude exists and is not a junction
$item = Get-Item $oldClaude -ErrorAction SilentlyContinue
if (-not $item) {
    Write-Error "~/.claude/ not found. Nothing to migrate."
    exit 1
}
if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    Write-Error "~/.claude/ is already a junction/symlink. Migration may have already run."
    exit 1
}

Write-Host "=== Step 1: Copy machine-specific files ===" -ForegroundColor Cyan

# Copy settings.json (machine-specific, gitignored)
if (Test-Path "$oldClaude\settings.json") {
    Copy-Item "$oldClaude\settings.json" "$dotclaude\settings.json" -Force
    Write-Host "  Copied settings.json"
}

# Copy auto-managed directories and files
$autoManaged = @(
    'backups', 'cache', 'chrome', 'debug', 'file-history', 'ide',
    'paste-cache', 'plans', 'plugins', 'projects', 'sessions',
    'shell-snapshots', 'tasks', 'telemetry', 'todos', 'scheduled-tasks'
)
foreach ($dir in $autoManaged) {
    $src = Join-Path $oldClaude $dir
    $dst = Join-Path $dotclaude $dir
    if (Test-Path $src) {
        if (-not (Test-Path $dst)) {
            Copy-Item $src $dst -Recurse -Force
            Write-Host "  Copied $dir/"
        } else {
            Write-Host "  Skipped $dir/ (already exists)"
        }
    }
}

# Copy individual auto-managed files
$autoFiles = @('.credentials.json', 'history.jsonl', 'stats-cache.json', 'mcp-needs-auth-cache.json', 'policy-limits.json')
foreach ($file in $autoFiles) {
    $src = Join-Path $oldClaude $file
    $dst = Join-Path $dotclaude $file
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  Copied $file"
    }
}

Write-Host ""
Write-Host "=== Step 2: Rename ~/.claude/ to ~/.claude-backup/ ===" -ForegroundColor Cyan
Rename-Item $oldClaude $backup
Write-Host "  Renamed to $backup"

Write-Host ""
Write-Host "=== Step 3: Create main junction ===" -ForegroundColor Cyan
cmd /c "mklink /J `"$env:USERPROFILE\.claude`" `"$dotclaude`""

# Verify
if (-not (Test-Path "$env:USERPROFILE\.claude\CLAUDE.md")) {
    Write-Error "Junction verification failed! CLAUDE.md not accessible through junction."
    Write-Host "Restoring backup..." -ForegroundColor Red
    Remove-Item "$env:USERPROFILE\.claude" -Force -ErrorAction SilentlyContinue
    Rename-Item $backup $oldClaude
    exit 1
}
Write-Host "  Junction verified"

Write-Host ""
Write-Host "=== Step 4: Create inner junctions (backward-compat shims) ===" -ForegroundColor Cyan
cmd /c "mklink /J `"$dotclaude\scripts`" `"$configRoot\Claude\scripts`""
cmd /c "mklink /J `"$dotclaude\templates`" `"$configRoot\Claude\templates`""

# Verify
if (-not (Test-Path "$env:USERPROFILE\.claude\scripts\notify.ps1")) {
    Write-Warning "Inner junction for scripts/ may not be working. Check manually."
} else {
    Write-Host "  scripts/ junction verified"
}
if (-not (Test-Path "$env:USERPROFILE\.claude\templates\skills\build\SKILL.md")) {
    Write-Warning "Inner junction for templates/ may not be working. Check manually."
} else {
    Write-Host "  templates/ junction verified"
}

Write-Host ""
Write-Host "=== Step 5: Initialize git repo ===" -ForegroundColor Cyan
Push-Location $configRoot
try {
    git init
    git add -A
    git commit -m "Initial commit: junction-based config restructure with versioning"

    # Install pre-commit hook
    if (Test-Path "$configRoot\hooks\pre-commit") {
        Copy-Item "$configRoot\hooks\pre-commit" "$configRoot\.git\hooks\pre-commit" -Force
        Write-Host "  Pre-commit hook installed"
    }

    # Set remote
    git remote add origin https://github.com/Mikkelsv/claude-config.git
    Write-Host "  Remote set to origin"
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Step 6: Update settings.json permissions ===" -ForegroundColor Cyan
# The existing Edit(**/Documents/**) and Write(**/Documents/**) patterns already cover
# ~/Documents/Code/claude-config/, so no permission changes needed.
Write-Host "  Existing permissions already cover ~/Documents/Code/ paths"

Write-Host ""
Write-Host "=== Migration complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open a new Claude Code session and verify rules load"
Write-Host "  2. Test /claude-push and /claude-pull"
Write-Host "  3. Test /rebase-on-main (just preflight)"
Write-Host "  4. Once confident, delete ~/.claude-backup/"
Write-Host "  5. Force-push to update the remote: git -C ~/Documents/Code/claude-config push --force"
Write-Host ""
