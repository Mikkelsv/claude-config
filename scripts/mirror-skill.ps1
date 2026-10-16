param(
    [Parameter(Mandatory)][string]$Name,
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$Force
)

# Mirrors a global skill folder into a project's .claude/skills/<Name>/, applying the fork
# transformations from skills/claude-sync/SKILL.md "Transformations" and preserving
# <ProjectSpecific> blocks in SKILL.md. Other non-script files (templates etc.) are
# transformed and copied wholesale; scripts/ is out of scope (claude-sync's Script sync).
#
# DRIFT DETECTION (SKILL.md only):
# Compares the project file and the transformed global, both with blocks stripped, in order.
# If they differ — i.e. the project has unmarked edits — refuses to overwrite anything
# unless -Force is passed, returning a drift sample for review.
#
# Returns JSON: { ok, action, preserved, driftLines?, sample?, orphans?, orphanAnchors?, files? }.
# action ∈ copied (no project copy), in-sync (identical), replaced (no blocks), merged.
# files = [{ path, action }] for non-SKILL.md files, action ∈ copied, in-sync, replaced.

$globalDir  = Join-Path $env:USERPROFILE ".claude/skills/$Name"
$projectDir = Join-Path $ProjectRoot ".claude/skills/$Name"
$globalPath  = Join-Path $globalDir 'SKILL.md'
$projectPath = Join-Path $projectDir 'SKILL.md'

if (-not (Test-Path $globalPath)) {
    @{ ok = $false; reason = "Global skill not found: $globalPath" } | ConvertTo-Json -Compress
    exit 1
}
$globalDir = (Resolve-Path $globalDir).Path

# Keep in step with claude-sync's Transformations list.
function Convert-ForFork([string]$text) {
    $text = $text -replace '(~|\$HOME)/\.claude/', '.claude/'
    $text -replace 'powershell\.exe', 'pwsh'
}

function Read-Lines([string]$path) {
    $lines = [System.IO.File]::ReadAllText($path) -split '\r?\n'
    if ($lines.Count -gt 0 -and $lines[-1] -eq '') { $lines = $lines[0..($lines.Count - 2)] }
    $lines
}

function Write-Text([string]$path, [string]$text) {
    New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding $false))
}

function Join-Lines([string[]]$lines) { ($lines -join "`n") + "`n" }

# Splits lines into base (blocks removed) and blocks (with anchor heading).
# Headings inside fenced code are not anchors. A blank line following a block is dropped
# when the line before the block was blank, so merge output (which pads blocks with a
# blank line for markdownlint) strips back to exactly the global text.
# Blocks under "## Project additions" carry their original anchor in a preceding comment.
function Split-Blocks([string[]]$lines) {
    $base = New-Object System.Collections.Generic.List[string]
    $blocks = New-Object System.Collections.Generic.List[object]
    $lastHeading = $null
    $inFence = $false
    $inBlock = $false
    $current = $null
    $blockHeading = $null
    $dropNextBlank = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($inBlock) {
            $current.Add($line)
            if ($line -match '^\s*</ProjectSpecific>\s*$') {
                $blocks.Add([pscustomobject]@{ Heading = $blockHeading; Lines = $current.ToArray() })
                $inBlock = $false
                $dropNextBlank = $base.Count -gt 0 -and $base[$base.Count - 1] -eq ''
            }
            continue
        }
        if ($dropNextBlank) {
            $dropNextBlank = $false
            if ($line -eq '') { continue }
        }
        $nextOpens = -not $inFence -and ($i + 1) -lt $lines.Count -and $lines[$i + 1] -match '^\s*<ProjectSpecific>\s*$'
        if ($nextOpens -and $line -match '^<!-- Original anchor: (.*) -->$') { $blockHeading = $Matches[1]; continue }
        # Markers count only on their own line outside fences, so prose and fenced examples
        # that mention the tag are left alone.
        if (-not $inFence -and $line -match '^\s*<ProjectSpecific>\s*$') {
            $inBlock = $true
            $current = New-Object System.Collections.Generic.List[string]
            $current.Add($line)
            $prev = if ($i -gt 0) { $lines[$i - 1] } else { '' }
            if ($prev -notmatch '^<!-- Original anchor: ') { $blockHeading = $lastHeading }
            continue
        }
        if ($line -match '^\s*(```|~~~)') { $inFence = -not $inFence }
        elseif (-not $inFence -and $line -match '^#{1,6}\s') { $lastHeading = $line }
        $base.Add($line)
    }
    # Drop a trailing "## Project additions" left empty once its orphan blocks are stripped.
    while ($base.Count -gt 0 -and $base[$base.Count - 1] -eq '') { $base.RemoveAt($base.Count - 1) }
    if ($base.Count -gt 0 -and $base[$base.Count - 1] -eq '## Project additions') {
        $base.RemoveAt($base.Count - 1)
        while ($base.Count -gt 0 -and $base[$base.Count - 1] -eq '') { $base.RemoveAt($base.Count - 1) }
    }
    [pscustomobject]@{ Base = $base.ToArray(); Blocks = $blocks.ToArray() }
}

function Sync-OtherFiles {
    $results = @()
    $files = Get-ChildItem $globalDir -Recurse -File | Where-Object {
        $rel = $_.FullName.Substring($globalDir.Length).TrimStart('\', '/')
        $rel -ne 'SKILL.md' -and $rel -notmatch '^scripts[\\/]'
    }
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($globalDir.Length).TrimStart('\', '/')
        $dest = Join-Path $projectDir $rel
        $text = Join-Lines @(Read-Lines $f.FullName | ForEach-Object { Convert-ForFork $_ })
        $action = if (-not (Test-Path $dest)) { 'copied' }
                  elseif ((Join-Lines @(Read-Lines $dest)) -ceq $text) { 'in-sync' }
                  else { 'replaced' }
        if ($action -ne 'in-sync') { Write-Text $dest $text }
        $results += @{ path = ($rel -replace '\\', '/'); action = $action }
    }
    , @($results)
}

function Emit([hashtable]$result) {
    $result.files = Sync-OtherFiles
    $result | ConvertTo-Json -Depth 10 -Compress
    exit 0
}

$globalSplit = Split-Blocks @(Read-Lines $globalPath | ForEach-Object { Convert-ForFork $_ })
$globalLines = $globalSplit.Base

# No project copy yet → straight copy, no drift possible
if (-not (Test-Path $projectPath)) {
    Write-Text $projectPath (Join-Lines $globalLines)
    Emit @{ ok = $true; action = 'copied'; preserved = 0 }
}

$projectRaw   = @(Read-Lines $projectPath)
$projectSplit = Split-Blocks $projectRaw
$blocks       = $projectSplit.Blocks
$projectBase  = $projectSplit.Base

# Ordered drift: Compare-Object alone ignores order, so a moved line would read as in sync.
$diff = @(Compare-Object -ReferenceObject $globalLines -DifferenceObject $projectBase -CaseSensitive)
$sameText = (Join-Lines $globalLines) -ceq (Join-Lines $projectBase)
if (-not $sameText -and $diff.Count -eq 0) {
    $diff = @(Compare-Object -ReferenceObject $globalLines -DifferenceObject $projectBase -CaseSensitive -SyncWindow 0)
}
$driftCount = if ($sameText) { 0 } else { [Math]::Max($diff.Count, 1) }

# Already in sync (no drift, no blocks)
if ($driftCount -eq 0 -and $blocks.Count -eq 0) {
    Emit @{ ok = $true; action = 'in-sync'; preserved = 0 }
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
    Write-Text $projectPath (Join-Lines $globalLines)
    $msg = if ($driftCount -gt 0) { "drift overwritten with -Force ($driftCount lines)" } else { 'replaced' }
    Emit @{ ok = $true; action = 'replaced'; preserved = 0; note = $msg }
}

# Merge: walk global, re-insert blocks after their anchor heading (headings in fences skipped).
# A blank line after the heading is kept above the block and one is added below it.
$result   = New-Object System.Collections.Generic.List[string]
$inserted = @{}
$inFence  = $false

for ($g = 0; $g -lt $globalLines.Count; $g++) {
    $line = $globalLines[$g]
    $result.Add($line)
    if ($line -match '^\s*(```|~~~)') { $inFence = -not $inFence; continue }
    if ($inFence -or $line -notmatch '^#{1,6}\s') { continue }
    $matching = @(for ($i = 0; $i -lt $blocks.Count; $i++) {
        if (-not $inserted[$i] -and $blocks[$i].Heading -eq $line) { $i }
    })
    if ($matching.Count -eq 0) { continue }
    $padded = ($g + 1) -lt $globalLines.Count -and $globalLines[$g + 1] -eq ''
    if ($padded) { $result.Add(''); $g++ }
    foreach ($i in $matching) {
        foreach ($bl in $blocks[$i].Lines) { $result.Add($bl) }
        if ($padded) { $result.Add('') }
        $inserted[$i] = $true
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

$merged = Join-Lines $result.ToArray()
$unchanged = $merged -ceq (Join-Lines $projectRaw)
if (-not $unchanged) { Write-Text $projectPath $merged }

Emit @{
    ok            = $true
    action        = if ($unchanged) { 'in-sync' } else { 'merged' }
    preserved     = $blocks.Count
    orphans       = $orphans.Count
    orphanAnchors = @($orphans | ForEach-Object { $_.Heading })
    driftLines    = $driftCount
    note          = if ($driftCount -gt 0) { "drift overwritten with -Force" } else { $null }
}
