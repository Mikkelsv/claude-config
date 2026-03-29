param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Color
)

$Path = Resolve-Path $Path -ErrorAction Stop

# Open VS Code in a new window
code --new-window $Path

# Wait for VS Code extensions to settle before writing color settings
Start-Sleep -Seconds 5

$vscodePath = Join-Path $Path '.vscode'
$settingsPath = Join-Path $vscodePath 'settings.json'

if (-not (Test-Path $vscodePath)) {
    New-Item -ItemType Directory -Path $vscodePath -Force | Out-Null
}

$colorCustomizations = @{
    'titleBar.activeBackground'  = $Color
    'titleBar.activeForeground'  = '#ffffff'
    'activityBar.background'     = $Color
    'statusBar.background'       = $Color
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
