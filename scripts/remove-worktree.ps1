param(
    [Parameter(Mandatory)][string]$Name,
    [switch]$DeleteBranch
)

$gitDir = git rev-parse --path-format=absolute --git-common-dir 2>$null
if (-not $gitDir) {
    Write-Error "Not in a git repository"
    exit 1
}
$repoRoot = ($gitDir -replace '[\\/]\.git$', '') -replace '/', '\'
$wtPath = Join-Path $repoRoot ".claude\worktrees\$Name"

if (-not (Test-Path $wtPath)) {
    Write-Error "Worktree not found at $wtPath"
    exit 1
}

# Read branch name before removal
$branch = $null
$raw = git worktree list --porcelain 2>$null
$wtPathNorm = $wtPath -replace '\\', '/'
$foundWt = $false
foreach ($line in $raw) {
    if ($line -match "^worktree (.+)") {
        $foundWt = ($Matches[1] -replace '\\', '/') -eq $wtPathNorm
    }
    elseif ($foundWt -and $line -match '^branch refs/heads/(.+)') {
        $branch = $Matches[1]
        break
    }
}

# Remove worktree
$output = git worktree remove $wtPath 2>&1
if ($LASTEXITCODE -ne 0) {
    $output = git worktree remove --force $wtPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to remove worktree: $output"
        exit 1
    }
}

$branchDeleted = $false
if ($DeleteBranch -and $branch) {
    git branch -d $branch 2>$null
    if ($LASTEXITCODE -eq 0) {
        $branchDeleted = $true
    } else {
        git branch -D $branch 2>$null
        $branchDeleted = ($LASTEXITCODE -eq 0)
    }
}

@{
    removed       = $wtPath
    branch        = $branch
    branchDeleted = $branchDeleted
} | ConvertTo-Json -Compress
