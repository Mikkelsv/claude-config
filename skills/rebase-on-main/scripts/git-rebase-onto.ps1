param(
    [string]$BaseBranch = "main"
)

# --- Preflight ---

$gitDir = git rev-parse --path-format=absolute --git-dir 2>$null
if (-not $gitDir) {
    Write-Error "Not in a git repository"
    exit 1
}

# Worktree detection
$gitCommonDir = git rev-parse --path-format=absolute --git-common-dir 2>$null
$gitDir = $gitDir -replace '/', '\'
$gitCommonDir = $gitCommonDir -replace '/', '\'
$isWorktree = $gitDir -ne $gitCommonDir

if ($isWorktree) {
    $mainRepoRoot = ($gitCommonDir -replace '[\\/]\.git$', '')
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    @{
        status       = "worktree"
        mainRepoRoot = $mainRepoRoot
        branch       = $branch
    } | ConvertTo-Json -Compress
    exit 1
}

# Branch check
$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
if ($currentBranch -eq $BaseBranch) {
    @{
        status = "error"
        reason = "Already on $BaseBranch — cannot rebase onto itself"
        branch = $currentBranch
    } | ConvertTo-Json -Compress
    exit 1
}

# Uncommitted changes
$staged = @(git diff --cached --name-only 2>$null)
$unstaged = @(git diff --name-only 2>$null)
$untracked = @(git ls-files --others --exclude-standard 2>$null)
$dirtyFiles = @($staged + $unstaged + $untracked) | Select-Object -Unique

if ($dirtyFiles.Count -gt 0) {
    @{
        status     = "dirty"
        branch     = $currentBranch
        dirtyFiles = $dirtyFiles
        staged     = $staged.Count
        unstaged   = $unstaged.Count
        untracked  = $untracked.Count
    } | ConvertTo-Json -Depth 4 -Compress
    exit 1
}

# --- Rebase ---

# Fetch and update local base branch
$fetchOutput = git fetch origin "${BaseBranch}:${BaseBranch}" 2>&1
if ($LASTEXITCODE -ne 0) {
    # Maybe local main is checked out elsewhere (worktree) — fetch only
    git fetch origin $BaseBranch 2>$null
    git branch -f $BaseBranch "origin/$BaseBranch" 2>$null
}

# Count commits before rebase for reporting
$mergeBase = git merge-base HEAD $BaseBranch 2>$null
$commitsAhead = 0
$commitsBehind = 0
if ($mergeBase) {
    $ahead = @(git rev-list "$mergeBase..HEAD" 2>$null)
    $behind = @(git rev-list "$mergeBase..$BaseBranch" 2>$null)
    $commitsAhead = $ahead.Count
    $commitsBehind = $behind.Count
}

if ($commitsBehind -eq 0) {
    @{
        status        = "up-to-date"
        branch        = $currentBranch
        baseBranch    = $BaseBranch
        commitsAhead  = $commitsAhead
        commitsBehind = 0
    } | ConvertTo-Json -Compress
    exit 0
}

# Attempt rebase
$rebaseOutput = git rebase $BaseBranch 2>&1
$rebaseExit = $LASTEXITCODE

if ($rebaseExit -eq 0) {
    @{
        status        = "success"
        branch        = $currentBranch
        baseBranch    = $BaseBranch
        commitsAhead  = $commitsAhead
        commitsBehind = $commitsBehind
    } | ConvertTo-Json -Compress
    exit 0
}

# Check for conflicts
$conflictFiles = @(git diff --name-only --diff-filter=U 2>$null)

@{
    status        = "conflicts"
    branch        = $currentBranch
    baseBranch    = $BaseBranch
    commitsAhead  = $commitsAhead
    commitsBehind = $commitsBehind
    conflictFiles = $conflictFiles
    conflictCount = $conflictFiles.Count
    rebaseOutput  = "$rebaseOutput"
} | ConvertTo-Json -Depth 4 -Compress
exit 1
