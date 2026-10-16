# Collapse all commits on the current branch since `-Base` (default 'main') into
# 1-3 grouped commits, one per entry in the groups file.
#
# -GroupsFile points at JSON: [ { "message": "...", "paths": ["a/b", "c"] }, ... ]
# Order matters: groups commit in array order. A path of "." claims every changed file
# (the single-commit case). Written to a file rather than passed
# inline because multi-line commit bodies do not survive shell quoting on Windows.
#
# Every changed path must be claimed by exactly one group. An unclaimed path aborts
# BEFORE any commit is made, so a mis-specified grouping never leaves the branch
# half-committed. Groups do not need to build or compile individually — history here
# is for communication, not bisection (branches merge to main as one commit).
#
# Optional -Push uses --force-with-lease.
# Returns JSON: { ok, commits: [{ message, hash, files }], pushed, reason? }.

param(
    [Parameter(Mandatory)][string]$GroupsFile,
    [string]$Base = 'main',
    [switch]$Push
)

function Fail($reason) {
    @{ ok = $false; reason = $reason } | ConvertTo-Json -Compress
    exit 1
}

if (-not (Test-Path $GroupsFile)) { Fail "Groups file not found: $GroupsFile" }

try {
    $groups = @(Get-Content $GroupsFile -Raw | ConvertFrom-Json)
} catch {
    Fail "Groups file is not valid JSON: $($_.Exception.Message)"
}

if ($groups.Count -lt 1) { Fail "Expected 1-3 groups; got none." }
if ($groups.Count -gt 3) { Fail "Expected at most 3 groups; got $($groups.Count)." }

foreach ($g in $groups) {
    if ([string]::IsNullOrWhiteSpace($g.message)) { Fail "A group is missing 'message'." }
    if (-not $g.paths -or @($g.paths).Count -eq 0) { Fail "Group '$($g.message)' has no 'paths'." }
}

$mergeBase = (git merge-base $Base HEAD 2>$null)
if (-not $mergeBase) { Fail "Failed to find merge-base with $Base" }
$mergeBase = $mergeBase.Trim()

# Enumerate what the branch actually changed, before touching the index.
$changed = @(git diff --name-only "$mergeBase..HEAD" 2>$null | Where-Object { $_ })
if ($changed.Count -eq 0) { Fail "No changes between $mergeBase and HEAD." }

# Coverage check up front: every changed file claimed by exactly one group.
# A path entry matches a file if it equals it or is a parent directory of it.
$claims = @{}
foreach ($g in $groups) {
    foreach ($p in @($g.paths)) {
        $prefix = $p.TrimEnd('/')
        $hits = if ($prefix -eq '.') { $changed } else { @($changed | Where-Object { $_ -eq $prefix -or $_.StartsWith("$prefix/") }) }
        foreach ($h in $hits) {
            if ($claims.ContainsKey($h)) {
                Fail "Path '$h' is claimed by two groups ('$($claims[$h])' and '$($g.message)'). Each file belongs to exactly one commit."
            }
            $claims[$h] = $g.message
        }
    }
}

$unclaimed = @($changed | Where-Object { -not $claims.ContainsKey($_) })
if ($unclaimed.Count -gt 0) {
    Fail "$($unclaimed.Count) changed file(s) claimed by no group: $($unclaimed -join ', '). Assign every path before squashing."
}

# A group matching nothing would die at `git add` — after the reset, leaving the branch
# rewound with no commits. Catch it here, while history is still intact.
foreach ($g in $groups) {
    if (-not ($claims.Values | Where-Object { $_ -eq $g.message })) {
        Fail "Group '$($g.message)' matched none of the branch's changed files. Its paths are wrong, or it belongs to a different branch."
    }
}

# Rewind to base keeping the working tree, then unstage so groups can be added selectively.
# A single group (already proven to claim every changed file) commits the soft-reset index
# as-is, so untracked files never get swept in by `git add -A`.
$singleGroup = $groups.Count -eq 1
$resetOut = git reset --soft $mergeBase 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git reset --soft failed: $resetOut" }
if (-not $singleGroup) {
    $resetOut = git reset 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "git reset (unstage) failed: $resetOut" }
}

$commits = @()
foreach ($g in $groups) {
    if (-not $singleGroup) {
        $paths = @($g.paths)
        $addOut = git add -A -- @paths 2>&1
        if ($LASTEXITCODE -ne 0) { Fail "git add failed for group '$($g.message)': $addOut" }
    }

    $staged = @(git diff --cached --name-only 2>$null | Where-Object { $_ })
    if ($staged.Count -eq 0) { Fail "Group '$($g.message)' staged nothing. Its paths matched no changes." }

    $tmpFile = [System.IO.Path]::GetTempFileName()
    try {
        # Explicit BOM-less UTF-8: PS 5.1 `Set-Content -Encoding UTF8` writes a BOM that prefixes the commit subject and breaks ^\[ tag parsers.
        [System.IO.File]::WriteAllText($tmpFile, $g.message, (New-Object System.Text.UTF8Encoding $false))
        $commitOut = git commit -F $tmpFile 2>&1
    } finally {
        Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    }
    if ($LASTEXITCODE -ne 0) { Fail "git commit failed for group '$($g.message)': $commitOut" }

    $commits += @{
        message = ($g.message -split "`n")[0]
        hash    = (git rev-parse HEAD 2>$null).Trim()
        files   = $staged.Count
    }
}

# The coverage check ran against the pre-reset diff, so anything left now is a bug here.
# Tracked paths only: untracked files were never part of the branch's commits, so they
# survive a squash untouched and must not be mistaken for an unassigned group path.
$leftover = @(git status --porcelain --untracked-files=no 2>$null | Where-Object { $_ })
if ($leftover.Count -gt 0) {
    @{ ok = $false; commits = $commits; pushed = $false
       reason = "Commits made but $($leftover.Count) path(s) remain uncommitted: $($leftover -join '; ')" } | ConvertTo-Json -Depth 4 -Compress
    exit 1
}

if ($Push) {
    $pushOut = git push --force-with-lease 2>&1
    if ($LASTEXITCODE -ne 0) {
        @{ ok = $true; commits = $commits; pushed = $false; reason = "Push failed: $pushOut" } | ConvertTo-Json -Depth 4 -Compress
        exit 0
    }
    @{ ok = $true; commits = $commits; pushed = $true } | ConvertTo-Json -Depth 4 -Compress
} else {
    @{ ok = $true; commits = $commits; pushed = $false } | ConvertTo-Json -Depth 4 -Compress
}
