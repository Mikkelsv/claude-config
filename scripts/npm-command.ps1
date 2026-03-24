param(
    [Parameter(Mandatory)][string]$Command,
    [string]$WorkingDirectory
)

if ($WorkingDirectory) {
    if (-not (Test-Path $WorkingDirectory -PathType Container)) {
        @{
            success = $false
            reason  = "Directory not found: $WorkingDirectory"
        } | ConvertTo-Json -Compress
        exit 1
    }
    Push-Location $WorkingDirectory
}

try {
    $output = & npm $Command.Split(' ') 2>&1
    $exitCode = $LASTEXITCODE
    @{
        success  = ($exitCode -eq 0)
        exitCode = $exitCode
        output   = "$output"
    } | ConvertTo-Json -Compress
    if ($exitCode -ne 0) { exit 1 }
} finally {
    if ($WorkingDirectory) { Pop-Location }
}
