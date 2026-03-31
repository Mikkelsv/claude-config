param(
    [Parameter(Mandatory)]
    [string]$Message,

    [string]$Body,

    [switch]$Amend,

    [switch]$Push
)

# Stage all changes
git add .
if ($LASTEXITCODE -ne 0) {
    @{ success = $false; step = "stage"; error = "git add failed" } | ConvertTo-Json -Compress
    exit 1
}

# Build commit message
if ($Body) {
    $fullMessage = "$Message`n`n$Body"
} else {
    $fullMessage = $Message
}

# Commit
if ($Amend) {
    git commit --amend -m $fullMessage
} else {
    git commit -m $fullMessage
}

if ($LASTEXITCODE -ne 0) {
    @{ success = $false; step = "commit"; error = "git commit failed" } | ConvertTo-Json -Compress
    exit 1
}

$commitHash = git rev-parse --short HEAD

# Push
if ($Push) {
    if ($Amend) {
        git push --force-with-lease 2>&1
    } else {
        git push 2>&1
    }

    if ($LASTEXITCODE -ne 0) {
        @{ success = $true; step = "push-failed"; commit = $commitHash; error = "push failed (commit succeeded)" } | ConvertTo-Json -Compress
        exit 0
    }
}

@{
    success = $true
    commit  = $commitHash
    amend   = [bool]$Amend
    pushed  = [bool]$Push
} | ConvertTo-Json -Compress
