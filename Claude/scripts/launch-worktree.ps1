param(
    [Parameter(Mandatory)][string]$WorktreePath,
    [Parameter(Mandatory)][string]$TabColor
)

$env:CLAUDECODE = $null
Set-Location $WorktreePath
claude
