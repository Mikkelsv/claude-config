<#
.SYNOPSIS
Audit source files for large runs of consecutive comment-only lines.

.DESCRIPTION
Flags runs of >= MinRun consecutive comment lines — single-line (`//`, `///`) and
block styles (`/* */`, `(* *)`, `<!-- -->`). A blank line breaks a run; a run still
open at end-of-file is closed there. This is a quantify-only pass (arch-docs-over-inline
enforcement is a qualitative rubric applied separately) — it just sizes the problem.

Mirrors check-file-sizes.ps1's `$exts` / `$excludePattern` / `Test-Excluded` / -Files|-Path
split. Keep the two in step — they are meant to scan the same candidate set.
`--` is deliberately NOT treated as a comment marker: it is not a comment prefix in any scanned
extension, so detecting it would risk false positives with no corresponding real hit. `#` IS a
comment prefix in `.py`, so Python files are scanned for `#` runs. Razor's native `@* *@`
block comment IS recognized (markup-level; `@code` blocks already hit the `//` branch).

Outputs JSON to stdout:
  {
    "findings":     [ { path, startLine, lineCount } ],   # sorted desc by lineCount
    "totalScanned": N
  }

KNOWN LIMITS: line-based text heuristic, not a lexer — a line that closes a block
comment with trailing code after the terminator still counts as fully comment for that
line. F#'s point-free multiplication operator `(*)` immediately followed by `)` is
guarded against (see the `(*` branch below) since it would otherwise look like a block
comment opener.

.PARAMETER Files
Explicit file list. If supplied, scans these instead of -Path.

.PARAMETER Path
Directory to scan recursively. Default: current directory.

.PARAMETER MinRun
Minimum consecutive comment-line count to report. Default 5.
#>
[CmdletBinding()]
param(
    [string[]] $Files,
    [string]   $Path = ".",
    [int]      $MinRun = 5
)

$ErrorActionPreference = 'Stop'

$exts = @('.fs', '.cs', '.js', '.ts', '.tsx', '.razor', '.wgsl', '.glsl', '.py', '.css')
$excludePattern = '[\\/](bin|obj|node_modules|\.git|dist|build|out|_framework|worktrees|assets|external|vendor|\.venv)[\\/]|[\\/]reset\.css$'

# Match against the path RELATIVE to the scan root, never FullName — see the same note in
# check-file-sizes.ps1. The scan root is often itself inside a `worktrees/` checkout, and matching
# FullName then excludes every candidate and reports totalScanned: 0, which reads as "no findings".
$scanRoot = (Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue).Path
function Test-Excluded {
    param([string] $FullName)
    $relative = $FullName
    if ($scanRoot -and $FullName.StartsWith($scanRoot, [StringComparison]::OrdinalIgnoreCase)) {
        $relative = $FullName.Substring($scanRoot.Length)
    }
    return (('/' + $relative.TrimStart('\', '/')) -match $excludePattern)
}

# Resolve candidate files (mirrors check-file-sizes.ps1)
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
            (-not (Test-Excluded -FullName $item.FullName))) {
            [void]$candidates.Add($item)
        }
    }
}

function Add-CommentRunFinding {
    param(
        [System.Collections.Generic.List[object]] $Findings,
        [string] $FilePath,
        [int]    $Start,
        [int]    $Len,
        [int]    $Min
    )
    if ($Len -lt $Min) { return }
    [void]$Findings.Add([PSCustomObject]@{
        path      = $FilePath
        startLine = $Start + 1
        lineCount = $Len
    })
}

$findings = New-Object System.Collections.Generic.List[object]
$totalScanned = 0

foreach ($file in $candidates) {
    $totalScanned = $totalScanned + 1

    $lines = $null
    try {
        $lines = Get-Content -LiteralPath $file.FullName -ErrorAction Stop
    } catch { continue }
    if ($null -eq $lines) { continue }
    if ($lines -isnot [array]) { $lines = @($lines) }

    $runStart = -1
    $runLen = 0
    $inBlock = $false
    $terminator = $null
    # `#` is a comment marker only in Python. Gated by extension because `#region` / `#if` are C#
    # preprocessor directives and `#id` is a CSS selector — treating either as a comment would
    # fabricate runs that aren't comments.
    $isPython = ($file.Extension.ToLower() -eq '.py')

    for ($i = 0; $i -lt $lines.Length; $i++) {
        $trimmed = $lines[$i].Trim()
        $isCommentLine = $false

        if ($inBlock) {
            $isCommentLine = $true
            if ($trimmed.Contains($terminator)) {
                $inBlock = $false
                $terminator = $null
            }
        } elseif ($trimmed.Length -eq 0) {
            $isCommentLine = $false
        } elseif ($trimmed.StartsWith('//')) {
            $isCommentLine = $true
        } elseif ($trimmed.StartsWith('/*')) {
            $isCommentLine = $true
            if (-not $trimmed.Contains('*/')) { $inBlock = $true; $terminator = '*/' }
        } elseif ($trimmed.StartsWith('(*') -and -not $trimmed.StartsWith('(*)')) {
            # Guard excludes F#'s point-free multiplication operator `(*)`, which would
            # otherwise misparse as a block-comment opener.
            $isCommentLine = $true
            if (-not $trimmed.Contains('*)')) { $inBlock = $true; $terminator = '*)' }
        } elseif ($trimmed.StartsWith('<!--')) {
            $isCommentLine = $true
            if (-not $trimmed.Contains('-->')) { $inBlock = $true; $terminator = '-->' }
        } elseif ($trimmed.StartsWith('@*')) {
            $isCommentLine = $true
            if (-not $trimmed.Contains('*@')) { $inBlock = $true; $terminator = '*@' }
        } elseif ($isPython -and $trimmed.StartsWith('#')) {
            $isCommentLine = $true
        }

        if ($isCommentLine) {
            if ($runStart -lt 0) { $runStart = $i }
            $runLen = $runLen + 1
        } else {
            Add-CommentRunFinding -Findings $findings -FilePath $file.FullName -Start $runStart -Len $runLen -Min $MinRun
            $runStart = -1
            $runLen = 0
        }
    }

    Add-CommentRunFinding -Findings $findings -FilePath $file.FullName -Start $runStart -Len $runLen -Min $MinRun
}

$sorted = $findings | Sort-Object -Property lineCount -Descending

$result = [PSCustomObject]@{
    findings     = @($sorted)
    totalScanned = $totalScanned
}

$result | ConvertTo-Json -Depth 5
