param()

# Use --git-common-dir to find main repo root (works from inside worktrees too)
$gitDir = git rev-parse --path-format=absolute --git-common-dir 2>$null
if (-not $gitDir) {
    Write-Error "Not in a git repository"
    exit 1
}
$repoRoot = ($gitDir -replace '[\\/]\.git$', '') -replace '/', '\'
$wtDir = Join-Path $repoRoot '.claude\worktrees'

$worktrees = @()
$raw = git worktree list --porcelain 2>$null

$current = @{}
foreach ($line in $raw) {
    if ($line -match '^worktree (.+)') {
        if ($current.Count -gt 0) {
            $worktrees += [PSCustomObject]$current
        }
        $current = @{ path = $Matches[1] -replace '/', '\' }
    }
    elseif ($line -match '^branch refs/heads/(.+)') {
        $current.branch = $Matches[1]
    }
    elseif ($line -match '^HEAD ([0-9a-f]+)') {
        $current.commit = $Matches[1]
    }
}
if ($current.Count -gt 0) {
    $worktrees += [PSCustomObject]$current
}

$results = @()
foreach ($wt in $worktrees) {
    if (-not $wt.path.StartsWith($wtDir)) { continue }

    $name = Split-Path $wt.path -Leaf
    $color = $null

    $settingsPath = Join-Path $wt.path '.vscode\settings.json'
    if (Test-Path $settingsPath) {
        try {
            $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
            $color = $settings.'workbench.colorCustomizations'.'titleBar.activeBackground'
        } catch {}
    }

    $results += @{
        name   = $name
        path   = $wt.path
        branch = $wt.branch
        commit = $wt.commit
        color  = $color
    }
}

$results | ConvertTo-Json -Compress
