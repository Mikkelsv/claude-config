param(
    [string]$RepoPath,
    [string]$BaseBranch = "main",
    [switch]$StatOnly
)

if ($RepoPath) {
    Set-Location $RepoPath
}

$null = git rev-parse --git-dir 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not in a git repository"
    exit 1
}

# Check for uncommitted changes
$unstagedStat = git diff --stat 2>$null
$stagedStat = git diff --cached --stat 2>$null

$hasUnstaged = [bool]$unstagedStat
$hasStaged = [bool]$stagedStat

if ($hasUnstaged -or $hasStaged) {
    Write-Output "MODE: uncommitted"
    Write-Output ""

    if ($hasStaged) {
        Write-Output "=== STAGED (stat) ==="
        Write-Output $stagedStat
        Write-Output ""
    }
    if ($hasUnstaged) {
        Write-Output "=== UNSTAGED (stat) ==="
        Write-Output $unstagedStat
        Write-Output ""
    }

    if (-not $StatOnly) {
        if ($hasStaged) {
            Write-Output "=== STAGED (diff) ==="
            git diff --cached
            Write-Output ""
        }
        if ($hasUnstaged) {
            Write-Output "=== UNSTAGED (diff) ==="
            git diff
            Write-Output ""
        }
    }
    exit 0
}

# No uncommitted changes — fall back to branch scope
$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
$mergeBase = git merge-base HEAD $BaseBranch 2>$null
$hasMergeBase = ($LASTEXITCODE -eq 0) -and $mergeBase

$base = $null
if ($hasMergeBase) {
    $head = git rev-parse HEAD 2>$null
    if ($head -ne $mergeBase) {
        $base = $mergeBase.Substring(0, 7)
    }
}

if (-not $base) {
    # On main with no uncommitted changes — nothing to review
    Write-Output "MODE: none"
    exit 0
}

$commitLog = git log --oneline "$mergeBase..HEAD" 2>$null
$branchStat = git diff --stat "$mergeBase..HEAD" 2>$null

Write-Output "MODE: branch"
Write-Output "BRANCH: $currentBranch"
Write-Output "BASE: $base"
Write-Output ""

if ($commitLog) {
    Write-Output "=== COMMITS ==="
    Write-Output $commitLog
    Write-Output ""
}
if ($branchStat) {
    Write-Output "=== BRANCH (stat) ==="
    Write-Output $branchStat
    Write-Output ""
}

if (-not $StatOnly) {
    Write-Output "=== BRANCH (diff) ==="
    git diff "$mergeBase..HEAD"
    Write-Output ""
}
