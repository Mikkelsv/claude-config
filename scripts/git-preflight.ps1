param()

$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) {
    Write-Error "Not in a git repository"
    exit 1
}

$isMain = $branch -eq "main"

# Count staged changes
$staged = @(git diff --cached --name-only 2>$null)
# Count unstaged changes
$unstaged = @(git diff --name-only 2>$null)
# Count untracked files
$untracked = @(git ls-files --others --exclude-standard 2>$null)

$hasChanges = ($staged.Count + $unstaged.Count + $untracked.Count) -gt 0

@{
    branch    = $branch
    isMain    = [bool]$isMain
    hasChanges = [bool]$hasChanges
    staged    = $staged.Count
    unstaged  = $unstaged.Count
    untracked = $untracked.Count
} | ConvertTo-Json -Compress
