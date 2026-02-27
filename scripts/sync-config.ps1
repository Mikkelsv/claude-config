param(
    [Parameter(Mandatory)][string]$Message
)

$ErrorActionPreference = 'Stop'
$repoRoot = "$env:USERPROFILE\.claude"

Push-Location $repoRoot
try {
    $status = git status --porcelain 2>&1
    if (-not $status) {
        @{ committed = $false; reason = "nothing to commit" } | ConvertTo-Json -Compress
        exit 0
    }

    $ErrorActionPreference = 'Continue'
    git add -A 2>$null
    $ErrorActionPreference = 'Stop'

    $commitOutput = git commit -m "$Message`n`nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Commit failed: $commitOutput"
        exit 1
    }

    $pushOutput = git push 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Push failed: $pushOutput"
        exit 1
    }

    $hash = git rev-parse --short HEAD
    @{ committed = $true; pushed = $true; hash = $hash; message = $Message } | ConvertTo-Json -Compress
}
finally {
    Pop-Location
}
