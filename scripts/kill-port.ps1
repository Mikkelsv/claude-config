param(
    [Parameter(Mandatory)][int]$Port
)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $connections) {
    @{ killed = $false; reason = "no process on port $Port" } | ConvertTo-Json -Compress
    exit 0
}

# Ancestors of this script (shell, terminal, Claude app, VS Code) must never be killed,
# even when they happen to be the listener's parent.
$ancestors = @{}
$walk = $PID
while ($walk) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$walk" -ErrorAction SilentlyContinue
    if (-not $p -or $ancestors.ContainsKey([int]$p.ParentProcessId)) { break }
    $walk = [int]$p.ParentProcessId
    if ($walk) { $ancestors[$walk] = $true }
}

$killed = @()
foreach ($conn in $connections) {
    $childPid = $conn.OwningProcess

    # Parent is killed only when it is a dev-server launcher (e.g. `dotnet watch`, `npm run dev`),
    # otherwise it respawns the child; anything else is left alone.
    $parentPid = $null
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$childPid" -ErrorAction SilentlyContinue
    if ($proc -and $proc.ParentProcessId) {
        $parent = Get-Process -Id $proc.ParentProcessId -ErrorAction SilentlyContinue
        if ($parent -and $parent.ProcessName -match '^(dotnet|npm|npx|node|pnpm|yarn)$' -and -not $ancestors.ContainsKey([int]$parent.Id)) {
            $parentPid = $parent.Id
        }
    }

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
