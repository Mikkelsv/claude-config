param()

# Version-bump prep: stages all changes and bumps config version if templates changed.
# Does NOT commit or push — caller handles that (e.g. via /commit).

$repoRoot = "$env:USERPROFILE\claude-config"

Push-Location $repoRoot
try {
    $status = git status --porcelain 2>$null
    if (-not $status) {
        @{ hasChanges = $false; reason = "nothing to commit" } | ConvertTo-Json -Compress
        exit 0
    }

    git add -A 2>$null

    # Auto-bump config version only when templates change (projects need re-sync).
    # Global rules, skills, and scripts are picked up automatically — no bump needed.
    $trackedDirs = @("dotclaude/templates")
    $staged = git diff --cached --name-only 2>$null
    $meaningful = $staged | Where-Object { $f = $_; $trackedDirs | Where-Object { $f.StartsWith("$_/") } }
    $bumped = $false
    $newVersion = $null
    if ($meaningful) {
        $versionFile = "$repoRoot\dotclaude\config-version.json"
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
