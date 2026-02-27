param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Color
)

$Path = Resolve-Path $Path -ErrorAction Stop
$scriptsDir = $PSScriptRoot
$innerScript = Join-Path $scriptsDir 'launch-worktree.ps1'

if (-not (Test-Path $innerScript)) {
    Write-Error "Inner launcher not found: $innerScript"
    exit 1
}

wt new-tab --tabColor "$Color" -d "$Path" -- powershell -NoExit -File "$innerScript" -WorktreePath "$Path" -TabColor "$Color"
