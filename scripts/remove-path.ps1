param(
    [Parameter(Mandatory)][string]$Path,
    [switch]$Force
)

$resolved = Resolve-Path $Path -ErrorAction SilentlyContinue
if (-not $resolved) {
    @{
        removed = $false
        reason  = "Path not found: $Path"
    } | ConvertTo-Json -Compress
    exit 1
}

$target = $resolved.Path

# Safety: refuse to delete obvious dangerous paths
$dangerous = @(
    $env:USERPROFILE,
    "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\.claude",
    "C:\",
    "C:\Windows",
    "C:\Program Files",
    "C:\Program Files (x86)"
)
foreach ($d in $dangerous) {
    if ($target -eq (Resolve-Path $d -ErrorAction SilentlyContinue)?.Path) {
        @{
            removed = $false
            reason  = "Refused to delete protected path: $target"
        } | ConvertTo-Json -Compress
        exit 1
    }
}

$isDir = Test-Path $target -PathType Container
$isFile = Test-Path $target -PathType Leaf

try {
    if ($isDir) {
        Remove-Item $target -Recurse -Force:$Force -ErrorAction Stop
    } else {
        Remove-Item $target -Force:$Force -ErrorAction Stop
    }
    @{
        removed = $true
        path    = $target
        type    = if ($isDir) { "directory" } else { "file" }
    } | ConvertTo-Json -Compress
} catch {
    @{
        removed = $false
        path    = $target
        reason  = $_.Exception.Message
    } | ConvertTo-Json -Compress
    exit 1
}
