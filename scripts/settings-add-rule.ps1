param(
    [Parameter(Mandatory)][string]$Rule
)

$settingsPath = Join-Path $env:USERPROFILE '.claude\settings.json'

if (-not (Test-Path $settingsPath)) {
    Write-Error "Settings file not found: $settingsPath"
    exit 1
}

try {
    $raw = Get-Content $settingsPath -Raw
    $settings = $raw | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse settings.json: $_"
    exit 1
}

# Ensure permissions.allow exists
if (-not $settings.permissions) {
    $settings | Add-Member -NotePropertyName 'permissions' -NotePropertyValue ([PSCustomObject]@{ allow = @() })
}
if (-not $settings.permissions.allow) {
    $settings.permissions | Add-Member -NotePropertyName 'allow' -NotePropertyValue @()
}

$allowList = @($settings.permissions.allow)

# Check for exact duplicate
if ($allowList -contains $Rule) {
    @{
        added  = $false
        exists = $true
        rule   = $Rule
    } | ConvertTo-Json -Compress
    exit 0
}

# Add the rule
$allowList += $Rule
$settings.permissions.allow = $allowList

$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8

@{
    added  = $true
    exists = $false
    rule   = $Rule
} | ConvertTo-Json -Compress
