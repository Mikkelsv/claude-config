# Inspect whether the current branch can be squashed onto a base.
# Returns JSON with `status` ∈ on-main, detached, dirty, none, single, ok.
# When status = ok, also returns: branch, commitCount, mergeBase, subjects[], log, stat.
#
# `-Base` defaults to 'main' (the original /squash use case). Pass a commit SHA
# or ref to squash from a different base (e.g., /implement's per-phase squash
# from the commit recorded at Phase 0).

param(
    [string]$Base = 'main'
)

$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $currentBranch -or $currentBranch -eq 'HEAD') {
    @{ status = 'detached' } | ConvertTo-Json -Compress
    exit 0
}
# Only block on-main when squashing onto main (the original safety net).
# When squashing onto a custom base, on-main is fine.
if ($Base -eq 'main' -and $currentBranch -eq 'main') {
    @{ status = 'on-main' } | ConvertTo-Json -Compress
    exit 0
}

$dirty = @(git status --porcelain | Where-Object { $_ })
if ($dirty.Count -gt 0) {
    @{ status = 'dirty'; files = $dirty } | ConvertTo-Json -Compress
    exit 0
}

$count = [int](git rev-list --count "$Base..HEAD" 2>$null)
if ($count -eq 0) {
    @{ status = 'none' } | ConvertTo-Json -Compress
    exit 0
}
if ($count -eq 1) {
    @{ status = 'single' } | ConvertTo-Json -Compress
    exit 0
}

$mergeBase = (git merge-base $Base HEAD 2>$null).Trim()
$subjects  = @(git log "$Base..HEAD" --reverse --format='%h %s' 2>$null)
$log       = (git log "$Base..HEAD" --reverse --format='%H%n%s%n%b%n---' 2>$null) -join "`n"
$stat      = (git diff "$Base..HEAD" --stat 2>$null) -join "`n"

@{
    status      = 'ok'
    branch      = $currentBranch
    commitCount = $count
    mergeBase   = $mergeBase
    subjects    = $subjects
    log         = $log
    stat        = $stat
} | ConvertTo-Json -Compress
