param(
    [Parameter(Mandatory)][string]$Message
)

$repoRoot = "$env:USERPROFILE\claude-config"

Push-Location $repoRoot
try {
    $status = git status --porcelain 2>$null
    if (-not $status) {
        @{ committed = $false; reason = "nothing to commit" } | ConvertTo-Json -Compress
        exit 0
    }

    git add -A 2>$null

    # Auto-bump config version only when templates change (projects need re-sync).
    # Global rules, skills, and scripts are picked up automatically via junction.
    $trackedDirs = @("Claude/templates")
    $staged = git diff --cached --name-only 2>$null
    $meaningful = $staged | Where-Object { $f = $_; $trackedDirs | Where-Object { $f.StartsWith("$_/") } }
    if ($meaningful) {
        $versionFile = "$repoRoot\Claude\config-version.json"
        if (Test-Path $versionFile) {
            $vJson = Get-Content $versionFile -Raw | ConvertFrom-Json
            $parts = $vJson.version -split '\.'
            $parts[2] = [int]$parts[2] + 1
            $vJson.version = $parts -join '.'
            $vJson.lastUpdated = (Get-Date -Format "yyyy-MM-dd")
            $vJson | ConvertTo-Json -Depth 10 | Set-Content $versionFile -Encoding UTF8
            git add $versionFile 2>$null
        }
    }

    git commit -m "$Message`n`nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Commit failed"
        exit 1
    }

    git push 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Push failed"
        exit 1
    }

    $hash = git rev-parse --short HEAD 2>$null
    @{ committed = $true; pushed = $true; hash = $hash; message = $Message } | ConvertTo-Json -Compress
}
finally {
    Pop-Location
}
