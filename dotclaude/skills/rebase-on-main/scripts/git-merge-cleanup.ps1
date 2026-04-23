param(
    [Parameter(Mandatory)][string]$Branch
)

$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null

# Must be on the feature branch or main
if ($currentBranch -ne "main") {
    $output = git checkout main 2>&1
    if ($LASTEXITCODE -ne 0) {
        @{
            merged = $false
            reason = "Failed to checkout main: $output"
        } | ConvertTo-Json -Compress
        exit 1
    }
}

# Fast-forward merge only
$output = git merge --ff-only $Branch 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($currentBranch -ne "main") { git checkout $currentBranch 2>$null }
    @{
        merged = $false
        reason = "Not a fast-forward merge: $output"
    } | ConvertTo-Json -Compress
    exit 1
}

# Push main
$output = git push 2>&1
if ($LASTEXITCODE -ne 0) {
    @{
        merged = $true
        pushed = $false
        reason = "Merge succeeded but push failed: $output"
    } | ConvertTo-Json -Compress
    exit 1
}

# Delete feature branch locally
git branch -d $Branch 2>$null
$localDeleted = $LASTEXITCODE -eq 0

# Delete feature branch from remote (if it exists)
$remoteDeleted = $false
$remoteRef = git ls-remote --heads origin $Branch 2>$null
if ($remoteRef) {
    git push origin --delete $Branch 2>$null
    $remoteDeleted = $LASTEXITCODE -eq 0
}

# Check for associated worktree
$scriptsDir = "$env:USERPROFILE\claude-config\Claude\scripts"
$getWorktrees = Join-Path $scriptsDir 'get-worktrees.ps1'
$removeWorktree = Join-Path $scriptsDir 'remove-worktree.ps1'

$worktreeRemoved = $false
$worktreeName = $null

if ((Test-Path $getWorktrees) -and (Test-Path $removeWorktree)) {
    $wtJson = & $getWorktrees 2>$null
    if ($wtJson) {
        $worktrees = $wtJson | ConvertFrom-Json
        foreach ($wt in $worktrees) {
            if ($wt.branch -eq $Branch) {
                $worktreeName = $wt.name
                & $removeWorktree -Name $wt.name 2>$null | Out-Null
                $worktreeRemoved = $true
                break
            }
        }
    }
}

@{
    merged          = $true
    pushed          = $true
    branch          = $Branch
    localDeleted    = [bool]$localDeleted
    remoteDeleted   = [bool]$remoteDeleted
    worktreeRemoved = [bool]$worktreeRemoved
    worktreeName    = $worktreeName
} | ConvertTo-Json -Compress
