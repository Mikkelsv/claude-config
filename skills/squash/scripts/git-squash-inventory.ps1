# Inspect whether the current branch can be squashed onto main.
# Returns JSON with `status` ∈ on-main, detached, dirty, none, single, ok.
# When status = ok, also returns: branch, commitCount, mergeBase, subjects[], log, stat.

$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $currentBranch -or $currentBranch -eq 'HEAD') {
    @{ status = 'detached' } | ConvertTo-Json -Compress
    exit 0
}
if ($currentBranch -eq 'main') {
    @{ status = 'on-main' } | ConvertTo-Json -Compress
    exit 0
}

$dirty = @(git status --porcelain | Where-Object { $_ })
if ($dirty.Count -gt 0) {
    @{ status = 'dirty'; files = $dirty } | ConvertTo-Json -Compress
    exit 0
}

$count = [int](git rev-list --count main..HEAD 2>$null)
if ($count -eq 0) {
    @{ status = 'none' } | ConvertTo-Json -Compress
    exit 0
}
if ($count -eq 1) {
    @{ status = 'single' } | ConvertTo-Json -Compress
    exit 0
}

$mergeBase = (git merge-base main HEAD 2>$null).Trim()
$subjects  = @(git log main..HEAD --reverse --format='%h %s' 2>$null)
$log       = (git log main..HEAD --reverse --format='%H%n%s%n%b%n---' 2>$null) -join "`n"
$stat      = (git diff main..HEAD --stat 2>$null) -join "`n"

@{
    status      = 'ok'
    branch      = $currentBranch
    commitCount = $count
    mergeBase   = $mergeBase
    subjects    = $subjects
    log         = $log
    stat        = $stat
} | ConvertTo-Json -Compress
