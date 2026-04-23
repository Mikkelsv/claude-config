# One-time migration: promote ~/claude-config/ to be ~/.claude/ directly.
#
# Before: ~/claude-config/ is the git repo. ~/.claude/ is a junction -> ~/claude-config/.
# After:  ~/.claude/ IS the git repo. No ~/claude-config/, no junction.
#
# Run this from plain PowerShell (NOT inside a Claude Code session).
# Close all Claude Code sessions before running.
#
# Usage:
#   powershell -File migrate-to-claude-root.ps1

$ErrorActionPreference = 'Stop'

$configRoot = "$env:USERPROFILE\claude-config"
$claudeDir = "$env:USERPROFILE\.claude"

Write-Host "Claude config migration: ~/claude-config/ -> ~/.claude/" -ForegroundColor Cyan
Write-Host ""

# Safety check 1: source must exist and be a git repo
if (-not (Test-Path "$configRoot\.git")) {
    Write-Error "~/claude-config/ is not a git repo. Nothing to migrate."
    exit 1
}

# Safety check 2: working tree must be clean
$status = git -C $configRoot status --porcelain
if ($status) {
    Write-Error "Working tree is not clean. Commit or stash changes in ~/claude-config/ first."
    Write-Host $status
    exit 1
}

# Safety check 3: must be on main (or at least pushed)
$branch = git -C $configRoot branch --show-current
Write-Host "Current branch: $branch" -ForegroundColor Green
$unpushed = git -C $configRoot log "@{u}.." --oneline 2>$null
if ($unpushed) {
    Write-Warning "Unpushed commits detected on $branch. Push before migrating so you have a remote safety net:"
    Write-Host $unpushed
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne 'y') { exit 1 }
}

# Safety check 4: ~/.claude/ must be a junction (or not exist)
if (Test-Path $claudeDir) {
    $item = Get-Item $claudeDir -Force
    if (-not ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        Write-Error "~/.claude/ exists but is NOT a junction. Back it up and remove it before running migrate."
        exit 1
    }
    Write-Host "~/.claude/ is a junction (expected)." -ForegroundColor Green
}

# Confirm
Write-Host ""
Write-Host "About to:" -ForegroundColor Yellow
Write-Host "  1. Remove the ~/.claude/ junction"
Write-Host "  2. Rename ~/claude-config/ -> ~/.claude/"
Write-Host ""
Write-Host "The git repo, its .git/ folder, and all history move along with the rename."
Write-Host "The GitHub remote stays the same."
Write-Host ""
$confirm = Read-Host "Proceed? (y/N)"
if ($confirm -ne 'y') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# Step 1: Remove junction
Write-Host ""
Write-Host "Step 1: Removing ~/.claude/ junction..." -ForegroundColor Cyan
cmd /c "rmdir `"$claudeDir`""
if (Test-Path $claudeDir) {
    Write-Error "Failed to remove junction at $claudeDir"
    exit 1
}

# Step 2: Rename directory
Write-Host "Step 2: Renaming ~/claude-config/ -> ~/.claude/..." -ForegroundColor Cyan
Move-Item $configRoot $claudeDir

# Verify
Write-Host ""
Write-Host "Verification:" -ForegroundColor Cyan
$ok = $true
if (-not (Test-Path "$claudeDir\.git")) {
    Write-Error "  .git/ folder missing at ~/.claude/.git"
    $ok = $false
} else {
    Write-Host "  .git/ folder present" -ForegroundColor Green
}
if (-not (Test-Path "$claudeDir\CLAUDE.md")) {
    Write-Error "  CLAUDE.md missing at ~/.claude/CLAUDE.md"
    $ok = $false
} else {
    Write-Host "  CLAUDE.md present" -ForegroundColor Green
}
if (Test-Path $configRoot) {
    Write-Error "  ~/claude-config/ still exists (should be gone)"
    $ok = $false
} else {
    Write-Host "  ~/claude-config/ removed" -ForegroundColor Green
}

$remoteUrl = git -C $claudeDir remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "  Remote: $remoteUrl" -ForegroundColor Green
} else {
    Write-Warning "  Could not read remote URL"
}

if ($ok) {
    Write-Host ""
    Write-Host "Migration complete!" -ForegroundColor Green
    Write-Host "You can now reopen Claude Code." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If any VS Code workspaces, shortcuts, or scripts referenced ~/claude-config/," -ForegroundColor Yellow
    Write-Host "update them to ~/.claude/." -ForegroundColor Yellow
} else {
    Write-Error "Migration had issues. Investigate above errors."
    exit 1
}
