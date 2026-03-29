param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination,
    [switch]$Force
)

if (-not (Test-Path $Source)) {
    @{
        moved  = $false
        reason = "Source not found: $Source"
    } | ConvertTo-Json -Compress
    exit 1
}

$resolvedSource = (Resolve-Path $Source).Path

try {
    Move-Item -Path $resolvedSource -Destination $Destination -Force:$Force -ErrorAction Stop
    $resolvedDest = (Resolve-Path $Destination).Path
    @{
        moved       = $true
        source      = $resolvedSource
        destination = $resolvedDest
    } | ConvertTo-Json -Compress
} catch {
    @{
        moved  = $false
        source = $resolvedSource
        reason = $_.Exception.Message
    } | ConvertTo-Json -Compress
    exit 1
}
