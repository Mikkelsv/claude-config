param()

# Version-bump prep: stages all changes and bumps config version if templates changed.
# Does NOT commit or push — caller handles that (e.g. via /commit).

$repoRoot = "$env:USERPROFILE\.claude"

Push-Location $repoRoot
try {
    $status = git status --porcelain 2>$null
    if (-not $status) {
        @{ hasChanges = $false; reason = "nothing to commit" } | ConvertTo-Json -Compress
        exit 0
    }

    git add -A 2>$null

    # Auto-bump config version when changes might affect projects:
    # - templates/ → projects re-scaffold via /claude-sync
    # - rules/, skills/, commands/ → projects with duplicated/mirrored copies need to know to re-pull
    # The bump is a SIGNAL. Whether project action is required is decided by the changelog
    # entry (only added when manual re-copy is actually needed; see rules/config-version.md).
    $trackedDirs = @("templates", "rules", "skills", "commands")
    $staged = git diff --cached --name-only 2>$null
    $meaningful = $staged | Where-Object { $f = $_; $trackedDirs | Where-Object { $f.StartsWith("$_/") } }
    $bumped = $false
    $newVersion = $null
    if ($meaningful) {
        $versionFile = "$repoRoot\config-version.json"
        if (Test-Path $versionFile) {
            $vJson = Get-Content $versionFile -Raw | ConvertFrom-Json
            $parts = $vJson.version -split '\.'
            $parts[2] = [int]$parts[2] + 1
            $vJson.version = $parts -join '.'
            $vJson.lastUpdated = (Get-Date -Format "yyyy-MM-dd")
            $vJson | ConvertTo-Json -Depth 10 | Set-Content $versionFile -Encoding UTF8
            git add $versionFile 2>$null
            $bumped = $true
            $newVersion = $vJson.version
        }
    }

    @{
        hasChanges  = $true
        staged      = @($staged)
        versionBump = $bumped
        newVersion  = $newVersion
    } | ConvertTo-Json -Compress
}
finally {
    Pop-Location
}
