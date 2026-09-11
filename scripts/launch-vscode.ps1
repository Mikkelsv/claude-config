param(
    [Parameter(Mandatory)][string]$Path
)

$Path = Resolve-Path $Path -ErrorAction Stop

# Stable per-project colors so multiple VS Code windows stay tellable apart.
# Keyed on exact leaf directory name (PowerShell hashtable lookup is case-insensitive),
# which keeps Eidetic from colliding with the unrelated Eidetics folder.
$palette = @{
    'Axioku'         = @{ Base = '#0f3d1f'; Bright = '#1f7a3d' }  # dark green
    'Eidetic'        = @{ Base = '#0f2d5c'; Bright = '#1f5cb8' }  # dark blue
    'GridPreviewPoc' = @{ Base = '#000000'; Bright = '#3a3a3a' }  # SeisX - black
}
$unlisted = @{ Base = '#8a4a10'; Bright = '#d1741a' }             # orange

$segments = @($Path -split '[\\/]' | Where-Object { $_ })

$worktreeIndex = -1
for ($i = 0; $i -lt $segments.Count; $i++) {
    if ($segments[$i] -ieq '.claude-worktrees') { $worktreeIndex = $i; break }
}

# A worktree lives at <project>/.claude-worktrees/<name>, so the project is the
# segment before the marker; it gets the brighter variant of its project's color.
$isWorktree = $worktreeIndex -gt 0
$project = if ($isWorktree) { $segments[$worktreeIndex - 1] } else { $segments[-1] }

$entry = if ($palette.ContainsKey($project)) { $palette[$project] } else { $unlisted }
$color = if ($isWorktree) { $entry.Bright } else { $entry.Base }

code --new-window $Path

# Wait for VS Code extensions to settle before writing color settings
Start-Sleep -Seconds 5

$vscodePath = Join-Path $Path '.vscode'
$settingsPath = Join-Path $vscodePath 'settings.json'

if (-not (Test-Path $vscodePath)) {
    New-Item -ItemType Directory -Path $vscodePath -Force | Out-Null
}

$colorCustomizations = @{
    'titleBar.activeBackground'  = $color
    'titleBar.activeForeground'  = '#ffffff'
    'activityBar.background'     = $color
    'statusBar.background'       = $color
    'statusBar.foreground'       = '#ffffff'
}

$settings = @{}
if (Test-Path $settingsPath) {
    try {
        $existing = Get-Content $settingsPath -Raw | ConvertFrom-Json
        foreach ($prop in $existing.PSObject.Properties) {
            $settings[$prop.Name] = $prop.Value
        }
    } catch {}
}

$settings['workbench.colorCustomizations'] = $colorCustomizations

$settings | ConvertTo-Json -Depth 4 | Set-Content $settingsPath -Encoding UTF8

$scope = if ($isWorktree) { "$project worktree '$($segments[-1])'" } else { $project }
Write-Output "Opened $scope with color $color"
