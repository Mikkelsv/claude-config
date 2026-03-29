param(
    [Parameter(Mandatory)][int]$Port
)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $connections) {
    @{ killed = $false; reason = "no process on port $Port" } | ConvertTo-Json -Compress
    exit 0
}

$killed = @()
foreach ($conn in $connections) {
    $childPid = $conn.OwningProcess

    # Find parent process
    $parentPid = $null
    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$childPid" -ErrorAction SilentlyContinue
        if ($proc) { $parentPid = $proc.ParentProcessId }
    } catch {}

    # Kill parent first (if found), then child
    if ($parentPid) {
        Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue
        $killed += $parentPid
    }
    Stop-Process -Id $childPid -Force -ErrorAction SilentlyContinue
    $killed += $childPid
}

@{
    killed = $true
    pids   = ($killed | Select-Object -Unique)
} | ConvertTo-Json -Compress
