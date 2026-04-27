param(
    [Parameter(Mandatory)][string]$Name,
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$Force
)

# Mirrors a global skill into a project's .claude/skills/<Name>/SKILL.md, preserving
# <ProjectSpecific> blocks (the project-specific content delimited by <ProjectSpecific>...</ProjectSpecific>).
#
# DRIFT DETECTION:
# Compares project file (with blocks stripped) against global. If they differ — i.e. the
# project has unmarked edits — refuses to overwrite unless -Force is passed. The drift
# sample is returned so the user can review before deciding to overwrite or merge by hand.
#
# Returns JSON: { ok, action, preserved, driftLines?, sample?, orphans?, orphanAnchors? }.
# action ∈ copied (no project copy), in-sync (identical), replaced (no blocks), merged.

$globalPath  = Join-Path $env:USERPROFILE ".claude/skills/$Name/SKILL.md"
$projectPath = Join-Path $ProjectRoot ".claude/skills/$Name/SKILL.md"

if (-not (Test-Path $globalPath)) {
    @{ ok = $false; reason = "Global skill not found: $globalPath" } | ConvertTo-Json -Compress
    exit 1
}

# No project copy yet → straight copy, no drift possible
if (-not (Test-Path $projectPath)) {
    New-Item -ItemType Directory -Path (Split-Path $projectPath -Parent) -Force | Out-Null
    Copy-Item $globalPath $projectPath
    @{ ok = $true; action = 'copied'; preserved = 0 } | ConvertTo-Json -Compress
    exit 0
}

$projectLines = Get-Content $projectPath
$globalLines  = Get-Content $globalPath

# Extract PROJECT-SPECIFIC blocks from project (capturing each block's anchor heading)
$blocks       = New-Object System.Collections.Generic.List[object]
$lastHeading  = $null
$inBlock      = $false
$currentLines = New-Object System.Collections.Generic.List[string]
$blockHeading = $null

foreach ($line in $projectLines) {
    if (-not $inBlock -and $line -match '^#{1,6}\s') { $lastHeading = $line }
    if ($line -match '<ProjectSpecific\b') {
        $inBlock = $true
        $currentLines.Clear()
        $currentLines.Add($line)
        $blockHeading = $lastHeading
        continue
    }
    if ($inBlock) {
        $currentLines.Add($line)
        if ($line -match '</ProjectSpecific>') {
            $blocks.Add([pscustomobject]@{ Heading = $blockHeading; Lines = $currentLines.ToArray() })
            $inBlock = $false
        }
    }
}

# Compute project base (strip PROJECT-SPECIFIC blocks) for drift comparison
$projectBase = New-Object System.Collections.Generic.List[string]
$inBlock2 = $false
foreach ($line in $projectLines) {
    if ($line -match '<ProjectSpecific\b') { $inBlock2 = $true;  continue }
    if ($line -match '</ProjectSpecific>')  { $inBlock2 = $false; continue }
    if (-not $inBlock2) { $projectBase.Add($line) }
}

# Drift = differences between project base and global
$diff = @(Compare-Object -ReferenceObject $globalLines -DifferenceObject $projectBase.ToArray())
$driftCount = $diff.Count

# Already in sync (no drift, no blocks)
if ($driftCount -eq 0 -and $blocks.Count -eq 0) {
    @{ ok = $true; action = 'in-sync'; preserved = 0 } | ConvertTo-Json -Compress
    exit 0
}

# Drift detected and not forced → refuse, show sample
if ($driftCount -gt 0 -and -not $Force) {
    $sample = @($diff | Select-Object -First 20 | ForEach-Object {
        if ($_.SideIndicator -eq '=>') { "+ $($_.InputObject)" }
        else                            { "- $($_.InputObject)" }
    })
    @{
        ok          = $false
        reason      = "drift detected ($driftCount lines diverge from global, outside <ProjectSpecific> blocks)"
        driftLines  = $driftCount
        sample      = $sample
        hint        = "Review the diff. Pass -Force to overwrite (<ProjectSpecific> blocks always preserved). Lines marked '+' exist in project, '-' exist in global."
    } | ConvertTo-Json -Depth 10
    exit 1
}

# No blocks → straight replace (drift either absent, or forced)
if ($blocks.Count -eq 0) {
    Copy-Item $globalPath $projectPath -Force
    $msg = if ($driftCount -gt 0) { "drift overwritten with -Force ($driftCount lines)" } else { 'replaced' }
    @{ ok = $true; action = 'replaced'; preserved = 0; note = $msg } | ConvertTo-Json -Compress
    exit 0
}

# Merge: walk global, re-insert blocks after their anchor heading
$result   = New-Object System.Collections.Generic.List[string]
$inserted = @{}

foreach ($line in $globalLines) {
    $result.Add($line)
    if ($line -match '^#{1,6}\s') {
        for ($i = 0; $i -lt $blocks.Count; $i++) {
            if ($inserted[$i]) { continue }
            if ($blocks[$i].Heading -eq $line) {
                $result.Add('')
                foreach ($bl in $blocks[$i].Lines) { $result.Add($bl) }
                $inserted[$i] = $true
            }
        }
    }
}

# Orphan blocks (anchor heading no longer present) → append under "## Project additions"
$orphans = @()
for ($i = 0; $i -lt $blocks.Count; $i++) {
    if (-not $inserted[$i]) { $orphans += $blocks[$i] }
}
if ($orphans.Count -gt 0) {
    $result.Add('')
    $result.Add('## Project additions')
    foreach ($orph in $orphans) {
        $result.Add('')
        $result.Add("<!-- Original anchor: $($orph.Heading) -->")
        foreach ($bl in $orph.Lines) { $result.Add($bl) }
    }
}

$result -join "`n" | Set-Content -Path $projectPath -Encoding UTF8 -NoNewline

@{
    ok            = $true
    action        = 'merged'
    preserved     = $blocks.Count
    orphans       = $orphans.Count
    orphanAnchors = @($orphans | ForEach-Object { $_.Heading })
    driftLines    = $driftCount
    note          = if ($driftCount -gt 0) { "drift overwritten with -Force" } else { $null }
} | ConvertTo-Json -Depth 10 -Compress
