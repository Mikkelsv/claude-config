param(
    [Parameter(Mandatory)][string]$Branch
)

$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null

# Must be on main to merge
if ($currentBranch -ne "main") {
    # Switch to main
    $output = git checkout main 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to checkout main: $output"
        exit 1
    }
}

# Fast-forward merge only
$output = git merge --ff-only $Branch 2>&1
if ($LASTEXITCODE -ne 0) {
    # Switch back if we changed
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
    Write-Error "Merge succeeded but push failed: $output"
    exit 1
}

# Rename branch to merged/
$mergedBranch = "merged/$Branch"
$output = git branch -m $Branch $mergedBranch 2>&1
if ($LASTEXITCODE -ne 0) {
    @{
        merged  = $true
        pushed  = $true
        renamed = $false
        reason  = "Branch rename failed: $output"
    } | ConvertTo-Json -Compress
    exit 0
}

# Update remote: delete old ref, push new one
git push origin ":refs/heads/$Branch" "refs/heads/${mergedBranch}:refs/heads/${mergedBranch}" 2>$null
git push -u origin $mergedBranch 2>$null

# Check for associated worktree
$scriptsDir = $PSScriptRoot
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
    renamed         = $true
    originalBranch  = $Branch
    mergedBranch    = $mergedBranch
    worktreeRemoved = [bool]$worktreeRemoved
    worktreeName    = $worktreeName
} | ConvertTo-Json -Compress
