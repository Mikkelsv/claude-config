$repoRoot = "$env:USERPROFILE\.claude"

Push-Location $repoRoot
try {
    $before = git rev-parse --short HEAD 2>$null

    git pull --ff-only 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Pull failed (not fast-forwardable or no remote)"
        exit 1
    }

    $after = git rev-parse --short HEAD 2>$null

    if ($before -eq $after) {
        @{ pulled = $false; reason = "already up to date" } | ConvertTo-Json -Compress
    }
    else {
        $log = git log --oneline "$before..$after" 2>$null
        $commits = @($log | ForEach-Object { $_.Trim() })
        @{ pulled = $true; before = $before; after = $after; commits = $commits } | ConvertTo-Json -Compress
    }
}
finally {
    Pop-Location
}
