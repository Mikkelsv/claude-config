# Squash all commits on the current branch since main into one with the given message.
# Optional -Push uses --force-with-lease.
# Returns JSON: { ok, commit, pushed, reason? }.

param(
    [Parameter(Mandatory)][string]$Message,
    [switch]$Push
)

$mergeBase = (git merge-base main HEAD 2>$null).Trim()
if (-not $mergeBase) {
    @{ ok = $false; reason = 'Failed to find merge-base with main' } | ConvertTo-Json -Compress
    exit 1
}

$resetOut = git reset --soft $mergeBase 2>&1
if ($LASTEXITCODE -ne 0) {
    @{ ok = $false; reason = "git reset --soft failed: $resetOut" } | ConvertTo-Json -Compress
    exit 1
}

# Use a temp file for the message to avoid shell-escaping issues with multi-line bodies.
$tmpFile = [System.IO.Path]::GetTempFileName()
try {
    Set-Content -Path $tmpFile -Value $Message -Encoding UTF8 -NoNewline
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
