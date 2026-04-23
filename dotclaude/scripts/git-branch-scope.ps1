param(
    [string]$BaseBranch = "main"
)

$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $currentBranch) {
    Write-Error "Not in a git repository"
    exit 1
}

# Try to find merge-base
$mergeBase = git merge-base HEAD $BaseBranch 2>$null
$hasMergeBase = ($LASTEXITCODE -eq 0) -and $mergeBase

$isAheadOfBase = $false
if ($hasMergeBase) {
    $head = git rev-parse HEAD 2>$null
    $isAheadOfBase = $head -ne $mergeBase
}

$base = $null
$commits = @()
$files = @()

if ($hasMergeBase -and $isAheadOfBase) {
    $base = $mergeBase.Substring(0, 7)

    # Get commit log
    $logLines = git log --oneline "$mergeBase..HEAD" 2>$null
    if ($logLines) {
        $commits = @($logLines)
    }

    # Get modified files
    $diffFiles = git diff --name-only "$mergeBase..HEAD" 2>$null
    if ($diffFiles) {
        $files = @($diffFiles)
    }
} else {
    # Fallback: last 10 commits
    $base = (git rev-parse --short "HEAD~10" 2>$null)
    if (-not $base) {
        # Repo has fewer than 10 commits, use root
        $base = (git rev-list --max-parents=0 HEAD 2>$null).Substring(0, 7)
    }

    $logLines = git log --oneline -10 HEAD 2>$null
    if ($logLines) {
        $commits = @($logLines)
    }

    $diffFiles = git diff --name-only "$base..HEAD" 2>$null
    if ($diffFiles) {
        $files = @($diffFiles)
    }
}

@{
    branch       = $currentBranch
    base         = $base
    hasMergeBase = [bool]$hasMergeBase
    isAhead      = [bool]$isAheadOfBase
    commitCount  = $commits.Count
    commits      = $commits
    files        = $files
} | ConvertTo-Json -Depth 4 -Compress
