param(
    [string]$RepoPath,
    [string]$BaseBranch = "main",
    [switch]$StatOnly,
    # auto: uncommitted changes if any, else the branch diff. branch: always merge-base..HEAD,
    # noting any uncommitted/untracked files instead of diffing them.
    [ValidateSet('auto', 'branch')]
    [string]$Scope = 'auto'
)

if ($RepoPath) {
    Set-Location $RepoPath
}

$null = git rev-parse --git-dir 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not in a git repository"
    exit 1
}

# Branch scope never diffs the working tree; it lists what was left out instead.
function Write-UncommittedNote {
    if ($Scope -ne 'branch') { return }
    $uncommitted = @(git status --porcelain 2>$null | Where-Object { $_ })
    if ($uncommitted.Count -gt 0) {
        Write-Output "=== UNCOMMITTED (not in branch diff) ==="
        Write-Output $uncommitted
        Write-Output ""
    }
}

# Check for uncommitted changes
$unstagedStat = git diff --stat 2>$null
$stagedStat = git diff --cached --stat 2>$null

$hasUnstaged = [bool]$unstagedStat
$hasStaged = [bool]$stagedStat

if ($Scope -eq 'auto' -and ($hasUnstaged -or $hasStaged)) {
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

# Branch scope: requested explicitly, or auto with a clean tree
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
    # No commits ahead of base (and, in auto scope, no uncommitted changes) — nothing to review
    Write-Output "MODE: none"
    Write-UncommittedNote
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

Write-UncommittedNote
