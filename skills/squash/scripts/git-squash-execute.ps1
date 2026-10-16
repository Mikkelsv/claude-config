# Squash all commits on the current branch since `-Base` (default 'main') into
# one commit with the given message.
# Optional -Push uses --force-with-lease.
# Returns JSON: { ok, commit, pushed, reason? }.

param(
    [Parameter(Mandatory)][string]$Message,
    [string]$Base = 'main',
    [switch]$Push
)

$mergeBase = (git merge-base $Base HEAD 2>$null)
if (-not $mergeBase) {
    @{ ok = $false; reason = "Failed to find merge-base with $Base" } | ConvertTo-Json -Compress
    exit 1
}
$mergeBase = $mergeBase.Trim()

$resetOut = git reset --soft $mergeBase 2>&1
if ($LASTEXITCODE -ne 0) {
    @{ ok = $false; reason = "git reset --soft failed: $resetOut" } | ConvertTo-Json -Compress
    exit 1
}

# Use a temp file for the message to avoid shell-escaping issues with multi-line bodies.
$tmpFile = [System.IO.Path]::GetTempFileName()
try {
    # Explicit BOM-less UTF-8: PS 5.1 `Set-Content -Encoding UTF8` writes a BOM that prefixes the commit subject and breaks ^\[ tag parsers.
    [System.IO.File]::WriteAllText($tmpFile, $Message, (New-Object System.Text.UTF8Encoding $false))
    $commitOut = git commit -F $tmpFile 2>&1
} finally {
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -ne 0) {
    @{ ok = $false; reason = "git commit failed: $commitOut" } | ConvertTo-Json -Compress
    exit 1
}

$hash = (git rev-parse HEAD 2>$null).Trim()

if ($Push) {
    $pushOut = git push --force-with-lease 2>&1
    if ($LASTEXITCODE -ne 0) {
        @{ ok = $true; commit = $hash; pushed = $false; reason = "Push failed: $pushOut" } | ConvertTo-Json -Compress
        exit 0
    }
    @{ ok = $true; commit = $hash; pushed = $true } | ConvertTo-Json -Compress
} else {
    @{ ok = $true; commit = $hash; pushed = $false } | ConvertTo-Json -Compress
}
