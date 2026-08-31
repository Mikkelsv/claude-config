# One-time migration: promote ~/claude-config/ to be ~/.claude/ directly.
#
# Before: ~/claude-config/ is the git repo. ~/.claude/ is either a junction
#         -> ~/claude-config/, or a fresh runtime-only directory left behind by
#         a half-completed earlier run of this script.
# After:  ~/.claude/ IS the git repo. No ~/claude-config/, no junction.
#
# Run this from plain PowerShell, with every Claude Code session and the Claude
# desktop app closed. The script self-relocates to $env:TEMP and refuses to run
# while any claude process is alive, because a held file handle inside
# ~/claude-config/ is what breaks the rename half-way.
#
# Usage:
#   pwsh -File migrate-to-claude-root.ps1

$ErrorActionPreference = 'Stop'

$configRoot = "$env:USERPROFILE\claude-config"
$claudeDir = "$env:USERPROFILE\.claude"

# Self-relocate: running the script from inside the folder being renamed leaves
# pwsh holding a handle there, which is what made the earlier attempt fail
# after it had already removed the junction.
if ($PSScriptRoot -and $PSScriptRoot.StartsWith($configRoot, 'OrdinalIgnoreCase')) {
    $relocated = Join-Path $env:TEMP 'migrate-to-claude-root.ps1'
    Copy-Item $PSCommandPath $relocated -Force
    Write-Host "Relocated to $relocated so the rename is not blocked by this script's own handle." -ForegroundColor Yellow
    Write-Host ""
    & pwsh -NoProfile -File $relocated
    exit $LASTEXITCODE
}

Set-Location $env:USERPROFILE

Write-Host "Claude config migration: ~/claude-config/ -> ~/.claude/" -ForegroundColor Cyan
Write-Host ""

# Safety check 1: source must exist and be a git repo
if (-not (Test-Path "$configRoot\.git")) {
    if (Test-Path "$claudeDir\.git") {
        Write-Host "~/.claude/ is already the git repo and ~/claude-config/ is gone." -ForegroundColor Green
        Write-Host "Migration already complete. Nothing to do."
        exit 0
    }
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

# Safety check 4: nothing may hold a handle inside ~/claude-config/.
# This is the check whose absence caused the earlier half-migration.
$live = Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -match '^(claude|Claude)' }
if ($live) {
    Write-Error "Claude is still running. Close every Claude Code session and the desktop app first."
    $live | Select-Object Id, ProcessName, @{n = 'MB'; e = { [int]($_.WorkingSet64 / 1MB) } } | Format-Table | Out-String | Write-Host
    exit 1
}

# Safety check 5: classify ~/.claude/ and decide how to clear it.
$orphanDir = $null
if (Test-Path $claudeDir) {
    $item = Get-Item $claudeDir -Force
    $isJunction = [bool]($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)

    if ($isJunction) {
        Write-Host "~/.claude/ is a junction." -ForegroundColor Green
    }
    elseif (Test-Path "$claudeDir\.git") {
        Write-Error "~/.claude/ is a real git repo. Two repos present - resolve by hand, do not migrate."
        exit 1
    }
    else {
        # A real directory with no .git: the runtime-only shell Claude Code
        # recreates when the junction disappears. Safe to set aside, but only
        # after proving it holds no tracked config of its own.
        $configAssets = @('CLAUDE.md', 'settings.json', 'rules', 'commands', 'skills', 'agents', 'scripts', 'templates') |
            Where-Object { Test-Path (Join-Path $claudeDir $_) }
        if ($configAssets) {
            Write-Error "~/.claude/ is a real directory holding config assets: $($configAssets -join ', ')"
            Write-Host "Inspect it by hand. It is not the runtime-only shell this script knows how to move aside."
            exit 1
        }
        $orphanDir = "$env:USERPROFILE\.claude-orphan-runtime"
        if (Test-Path $orphanDir) {
            Write-Error "$orphanDir already exists. Move or delete it, then rerun."
            exit 1
        }
        Write-Host "~/.claude/ is a runtime-only directory (no .git, no config)." -ForegroundColor Yellow
        Write-Host "  Its session transcripts will be merged back in after the rename."
    }
}

# Confirm
Write-Host ""
Write-Host "About to:" -ForegroundColor Yellow
if ($orphanDir) {
    Write-Host "  1. Move the runtime-only ~/.claude/ aside to ~/.claude-orphan-runtime/"
}
else {
    Write-Host "  1. Remove the ~/.claude/ junction"
}
Write-Host "  2. Rename ~/claude-config/ -> ~/.claude/"
Write-Host "  3. Merge any orphaned session transcripts back into ~/.claude/projects/"
Write-Host "  4. Re-key this repo's own past sessions to its new path"
Write-Host ""
Write-Host "The git repo, its .git/ folder, and all history move along with the rename."
Write-Host "The GitHub remote stays the same."
Write-Host ""
$confirm = Read-Host "Proceed? (y/N)"
if ($confirm -ne 'y') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# Step 1: clear ~/.claude/
Write-Host ""
if ($orphanDir) {
    Write-Host "Step 1: Moving runtime-only ~/.claude/ aside..." -ForegroundColor Cyan
    Move-Item $claudeDir $orphanDir
}
elseif (Test-Path $claudeDir) {
    Write-Host "Step 1: Removing ~/.claude/ junction..." -ForegroundColor Cyan
    # rmdir removes only the link. Never use Remove-Item -Recurse -Force on a
    # junction: on some PowerShell versions it deletes the target's contents.
    cmd /c "rmdir `"$claudeDir`""
}
if (Test-Path $claudeDir) {
    Write-Error "Failed to clear $claudeDir"
    exit 1
}

# Step 2: Rename directory
Write-Host "Step 2: Renaming ~/claude-config/ -> ~/.claude/..." -ForegroundColor Cyan
Move-Item $configRoot $claudeDir

# Step 3: Merge orphaned transcripts back in.
if ($orphanDir -and (Test-Path "$orphanDir\projects")) {
    Write-Host "Step 3: Merging orphaned session transcripts..." -ForegroundColor Cyan
    # /E all subdirs, /XC /XN /XO never overwrite an existing file.
    robocopy "$orphanDir\projects" "$claudeDir\projects" /E /XC /XN /XO /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -ge 8) {
        Write-Warning "  robocopy reported errors (exit $LASTEXITCODE). Check $orphanDir\projects by hand."
    }
    else {
        Write-Host "  Merged. Originals kept at $orphanDir" -ForegroundColor Green
    }
    $global:LASTEXITCODE = 0
}

# Step 4: Re-key this repo's own sessions. Claude Code keys projects/ by cwd
# with ':', '\' and '.' each replaced by '-', so renaming the folder changes the
# key and would hide every past session held in this repo.
$oldKey = ($configRoot -replace '[:\\.]', '-')
$newKey = ($claudeDir -replace '[:\\.]', '-')
$oldKeyPath = Join-Path "$claudeDir\projects" $oldKey
$newKeyPath = Join-Path "$claudeDir\projects" $newKey
if (Test-Path $oldKeyPath) {
    Write-Host "Step 4: Re-keying own sessions ($oldKey -> $newKey)..." -ForegroundColor Cyan
    robocopy $oldKeyPath $newKeyPath /E /XC /XN /XO /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -ge 8) {
        Write-Warning "  robocopy reported errors (exit $LASTEXITCODE)."
    }
    else {
        Write-Host "  Copied. The old key is left in place as a fallback." -ForegroundColor Green
    }
    $global:LASTEXITCODE = 0
}

# Verify
Write-Host ""
Write-Host "Verification:" -ForegroundColor Cyan
$ok = $true
foreach ($probe in @('.git', 'CLAUDE.md', 'settings.json', 'rules', 'commands', 'scripts\audit-instructions.ps1')) {
    if (-not (Test-Path (Join-Path $claudeDir $probe))) {
        Write-Error "  $probe missing at ~/.claude/$probe"
        $ok = $false
    }
    else {
        Write-Host "  $probe present" -ForegroundColor Green
    }
}
if (Test-Path $configRoot) {
    Write-Error "  ~/claude-config/ still exists (should be gone)"
    $ok = $false
}
else {
    Write-Host "  ~/claude-config/ removed" -ForegroundColor Green
}

$transcripts = @(Get-ChildItem "$claudeDir\projects" -Recurse -Filter *.jsonl -ErrorAction SilentlyContinue).Count
Write-Host "  $transcripts session transcripts under ~/.claude/projects/" -ForegroundColor Green
if ($transcripts -lt 1) {
    Write-Error "  No transcripts found - investigate before starting Claude Code."
    $ok = $false
}

$remoteUrl = git -C $claudeDir remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "  Remote: $remoteUrl" -ForegroundColor Green
}
else {
    Write-Warning "  Could not read remote URL"
}

if ($ok) {
    Write-Host ""
    Write-Host "Migration complete!" -ForegroundColor Green
    Write-Host "You can now reopen Claude Code. Past sessions appear under /resume." -ForegroundColor Cyan
    Write-Host ""
    if ($orphanDir) {
        Write-Host "Once you have confirmed your sessions are back, delete the leftover:" -ForegroundColor Yellow
        Write-Host "  Remove-Item -Recurse -Force `"$orphanDir`"" -ForegroundColor Yellow
        Write-Host ""
    }
    Write-Host "If any VS Code workspaces, shortcuts, or scripts referenced ~/claude-config/," -ForegroundColor Yellow
    Write-Host "update them to ~/.claude/." -ForegroundColor Yellow
}
else {
    Write-Error "Migration had issues. Investigate above errors."
    exit 1
}
