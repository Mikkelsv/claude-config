param(
    [Parameter(Mandatory)][string]$BranchName,
    [string]$BaseBranch = "main"
)

# Branch-from-main: stash dirty changes → pull base → create branch → pop stash.
# Designed for the case where the user has been hacking on main and wants the work on
# a feature branch, on top of the latest base, ready to merge later via Phase 2.
#
# Returns JSON: { ok, status, branch, baseBranch, pulled, stashed, conflictFiles, conflictCount, reason? }
# status ∈ ready (clean pop), pop-conflicts (user resolves), error.

# Verify on base
$current = git rev-parse --abbrev-ref HEAD 2>$null
if ($current -ne $BaseBranch) {
    @{ ok = $false; reason = "Not on $BaseBranch (current: $current)" } | ConvertTo-Json -Compress
    exit 1
}

# Branch must not already exist
git rev-parse --verify $BranchName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    @{ ok = $false; reason = "Branch '$BranchName' already exists" } | ConvertTo-Json -Compress
    exit 1
}

# Stash (-u to include untracked)
$stashOut = git stash push -u -m "rebase-on-main: branch from $BaseBranch" 2>&1
if ($LASTEXITCODE -ne 0) {
    @{ ok = $false; reason = "Stash failed: $stashOut" } | ConvertTo-Json -Compress
    exit 1
}
$stashed = -not ($stashOut -match 'No local changes')

# Pull base (fast-forward only — preserve correctness if remote has diverged)
$pullOut = git pull --ff-only origin $BaseBranch 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($stashed) { git stash pop 2>$null | Out-Null }
    @{ ok = $false; reason = "Pull failed: $pullOut. Stash restored to $BaseBranch."; pulled = $false } | ConvertTo-Json -Compress
    exit 1
}

# Create and check out branch
$branchOut = git checkout -b $BranchName 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($stashed) { git stash pop 2>$null | Out-Null }
    @{ ok = $false; reason = "Branch creation failed: $branchOut. Stash restored."; pulled = $true } | ConvertTo-Json -Compress
    exit 1
}

# Pop stash onto the new branch
$popConflicts = $false
if ($stashed) {
    $popOut = git stash pop 2>&1
    if ($LASTEXITCODE -ne 0) {
        # Conflicts on pop — leave the index in conflict state for the caller to resolve
        $popConflicts = $true
    }
}

$conflictFiles = @(git diff --name-only --diff-filter=U 2>$null)

@{
    ok            = $true
    status        = if ($popConflicts) { 'pop-conflicts' } else { 'ready' }
    branch        = $BranchName
    baseBranch    = $BaseBranch
    pulled        = $true
    stashed       = $stashed
    conflictFiles = $conflictFiles
    conflictCount = $conflictFiles.Count
} | ConvertTo-Json -Depth 4 -Compress
