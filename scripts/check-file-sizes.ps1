<#
.SYNOPSIS
Audit source files against soft (400) and hard (800) line-count thresholds.

.DESCRIPTION
Flags source files that exceed the project's file-size policy. Files
exempted via a top-of-file `SIZE-EXEMPT: <reason>` comment (within the
first 10 lines, any comment style) are reported as justified rather than
flagged.

Outputs JSON to stdout:
  {
    "hard":      [ { path, lines, justified=false, reason=null } ],
    "soft":      [ { path, lines, justified=false, reason=null } ],
    "justified": [ { path, lines, justified=true,  reason="..."  } ],
    "totalScanned": N
  }

- hard:      lines > Hard, no SIZE-EXEMPT marker  -> action required
- soft:      Soft < lines <= Hard, no SIZE-EXEMPT -> informational
- justified: lines > Hard, has SIZE-EXEMPT marker -> reviewer can verify

Files with SIZE-EXEMPT markers AND lines <= Hard are skipped entirely
(the developer explicitly opted out of size flagging for that file).

.PARAMETER Files
Explicit file list. If supplied, scans these instead of -Path.

.PARAMETER Path
Directory to scan recursively. Default: current directory.

.PARAMETER Soft
Soft warning threshold. Default 400.

.PARAMETER Hard
Hard cap threshold. Default 800.
#>
[CmdletBinding()]
param(
    [string[]] $Files,
    [string]   $Path = ".",
    [int]      $Soft = 400,
    [int]      $Hard = 800
)

$ErrorActionPreference = 'Stop'

$exts = @('.fs', '.cs', '.js', '.ts', '.tsx', '.razor', '.wgsl', '.glsl')
$excludePattern = '[\\/](bin|obj|node_modules|\.git|dist|build|out|_framework|worktrees|assets)[\\/]'

function Test-Exempt {
    param([string] $FilePath)
    try {
        $head = Get-Content -LiteralPath $FilePath -TotalCount 10 -ErrorAction Stop
        foreach ($line in $head) {
            $m = [regex]::Match($line, 'SIZE-EXEMPT:\s*(.+?)\s*(?:-->|\*/)?\s*$')
            if ($m.Success) {
                return @{ exempt = $true; reason = $m.Groups[1].Value.Trim() }
            }
        }
    } catch {}
    return @{ exempt = $false; reason = $null }
}

# (Line counting is inlined in the loop below — calling a PS function and
#  capturing its return into a variable can pick up incidental pipeline
#  output, leading to List<object> instead of Int32.)

# Resolve candidate files
$candidates = New-Object System.Collections.Generic.List[object]

if ($PSBoundParameters.ContainsKey('Files') -and $Files -and $Files.Count -gt 0) {
    foreach ($f in $Files) {
        if (Test-Path -LiteralPath $f) {
            $item = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
            if ($item -and ($exts -contains $item.Extension.ToLower())) {
                [void]$candidates.Add($item)
            }
        }
    }
} else {
    $allItems = Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue
    foreach ($item in $allItems) {
        if (($exts -contains $item.Extension.ToLower()) -and
            ($item.FullName -notmatch $excludePattern)) {
            [void]$candidates.Add($item)
        }
    }
}

# Note: local list names must NOT collide (case-insensitively) with the
# [int] $Soft / $Hard parameters above, or PowerShell will try to coerce
# a List<object> into Int32 and crash.
$hardEntries      = New-Object System.Collections.Generic.List[object]
$softEntries      = New-Object System.Collections.Generic.List[object]
$justifiedEntries = New-Object System.Collections.Generic.List[object]
$totalScanned = 0

foreach ($file in $candidates) {
    $totalScanned = $totalScanned + 1

    # Inline line counting — avoids function-return pipeline pollution.
    $lineCount = -1
    try {
        $content = Get-Content -LiteralPath $file.FullName -ErrorAction Stop
        if ($null -eq $content) {
            $lineCount = 0
        } elseif ($content -is [array]) {
            $lineCount = $content.Length
        } else {
            $lineCount = 1
        }
    } catch {}

    if ($lineCount -lt 0) { continue }
    if ($lineCount -le $Soft) { continue }

    $ex = Test-Exempt -FilePath $file.FullName
    $entry = [PSCustomObject]@{
        path      = $file.FullName
        lines     = $lineCount
        justified = $ex.exempt
        reason    = $ex.reason
    }

    if ($lineCount -gt $Hard) {
        if ($ex.exempt) { [void]$justifiedEntries.Add($entry) }
        else            { [void]$hardEntries.Add($entry) }
    } else {
        # Soft tier: skip if explicitly exempt (developer opted out)
        if (-not $ex.exempt) { [void]$softEntries.Add($entry) }
    }
}

$result = [PSCustomObject]@{
    hard         = @($hardEntries.ToArray())
    soft         = @($softEntries.ToArray())
    justified    = @($justifiedEntries.ToArray())
    totalScanned = $totalScanned
}

$result | ConvertTo-Json -Depth 5
