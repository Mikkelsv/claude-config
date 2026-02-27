param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Branch
)

$gitDir = git rev-parse --path-format=absolute --git-common-dir 2>$null
if (-not $gitDir) {
    Write-Error "Not in a git repository"
    exit 1
}
$repoRoot = ($gitDir -replace '[\\/]\.git$', '') -replace '/', '\'
$wtPath = Join-Path $repoRoot ".claude\worktrees\$Name"

if (Test-Path $wtPath) {
    Write-Error "Worktree already exists at $wtPath"
    exit 1
}

$output = git worktree add $wtPath -b $Branch HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create worktree: $output"
    exit 1
}

$commit = git rev-parse --short HEAD 2>$null

@{
    path   = $wtPath
    branch = $Branch
    commit = $commit
} | ConvertTo-Json -Compress
