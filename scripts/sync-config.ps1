param(
    [Parameter(Mandatory)][string]$Message
)

$repoRoot = "$env:USERPROFILE\.claude"

Push-Location $repoRoot
try {
    $status = git status --porcelain 2>$null
    if (-not $status) {
        @{ committed = $false; reason = "nothing to commit" } | ConvertTo-Json -Compress
        exit 0
    }

    git add -A 2>$null
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
