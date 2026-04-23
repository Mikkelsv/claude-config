param()

$gitDir = git rev-parse --path-format=absolute --git-dir 2>$null
$gitCommonDir = git rev-parse --path-format=absolute --git-common-dir 2>$null

if (-not $gitDir) {
    Write-Error "Not in a git repository"
    exit 1
}

# Normalize paths
$gitDir = $gitDir -replace '/', '\'
$gitCommonDir = $gitCommonDir -replace '/', '\'

# If git-dir != git-common-dir, we're in a linked worktree
$isWorktree = $gitDir -ne $gitCommonDir
$mainRepoRoot = ($gitCommonDir -replace '[\\/]\.git$', '')
$branch = git rev-parse --abbrev-ref HEAD 2>$null

@{
    isWorktree = [bool]$isWorktree
    mainRepoRoot = $mainRepoRoot
    branch = $branch
} | ConvertTo-Json -Compress
