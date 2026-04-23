param(
    [Parameter(Mandatory)][string]$Script,
    [string]$WorkingDirectory
)

if (-not (Test-Path $Script)) {
    @{
        success = $false
        reason  = "Script not found: $Script"
    } | ConvertTo-Json -Compress
    exit 1
}

$resolvedScript = (Resolve-Path $Script).Path

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
    $output = & node $resolvedScript 2>&1
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
