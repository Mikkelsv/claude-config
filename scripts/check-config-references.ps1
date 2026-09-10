<#
.SYNOPSIS
Verify that rule and agent references cited across the config actually resolve.

.DESCRIPTION
Config cross-references are prose, so nothing type-checks them. A citation to a rule
that was never promoted, or renamed, or retired reads as authoritative and silently does
nothing. Retiring a rule is the same hazard in reverse: inbound citations go stale with
no error.

Scans `rules/`, `skills/`, `agents/` and `commands/` for:
  - backticked rule slugs   -- `wf-foo`, `cq-foo`, `arch-foo`, `meta-foo`  -> rules/<slug>.md
  - `subagent_type: "name"`                                                -> agents/<name>.md

Only BACKTICKED rule slugs count, which keeps false positives low. Built-in agent types
(general-purpose, Explore, Plan, claude, ...) are allowlisted since they have no file.

Outputs JSON to stdout:
  {
    "missingRules":  [ { citation, citedIn } ],
    "missingAgents": [ { citation, citedIn } ],
    "filesScanned":  N,
    "ok":            bool
  }

Report-only -- exit code stays 0. Expect one false-positive class: slugs used as
illustrative examples rather than citations (e.g. /rule-candidate's slug-computation
example). A human judges those; the script does not guess.

.PARAMETER Root
Config root to scan. Default: the parent of this script's directory.
#>
[CmdletBinding()]
param(
    [string] $Root
)

$ErrorActionPreference = 'Stop'

if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }
$Root = (Resolve-Path -LiteralPath $Root).Path

$builtinAgents = @(
    'general-purpose', 'claude', 'Explore', 'Plan', 'fork',
    'statusline-setup', 'claude-code-guide', 'output-style-setup'
)

$scanDirs = @('rules', 'skills', 'agents', 'commands') |
    ForEach-Object { Join-Path $Root $_ } |
    Where-Object { Test-Path -LiteralPath $_ }

$missingRules  = New-Object System.Collections.Generic.List[object]
$missingAgents = New-Object System.Collections.Generic.List[object]
$filesScanned  = 0

foreach ($dir in $scanDirs) {
    $files = Get-ChildItem -LiteralPath $dir -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $filesScanned = $filesScanned + 1
        $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $text) { continue }

        $relative = $file.FullName.Substring($Root.Length).TrimStart('\', '/')

        foreach ($m in [regex]::Matches($text, '`((?:wf|cq|arch|meta)-[a-z0-9-]+)`')) {
            $slug = $m.Groups[1].Value
            if (-not (Test-Path -LiteralPath (Join-Path $Root "rules/$slug.md"))) {
                [void]$missingRules.Add([PSCustomObject]@{ citation = $slug; citedIn = $relative })
            }
        }

        foreach ($m in [regex]::Matches($text, 'subagent_type:\s*[''"]([A-Za-z0-9_-]+)[''"]')) {
            $name = $m.Groups[1].Value
            if ($builtinAgents -contains $name) { continue }
            if (-not (Test-Path -LiteralPath (Join-Path $Root "agents/$name.md"))) {
                [void]$missingAgents.Add([PSCustomObject]@{ citation = $name; citedIn = $relative })
            }
        }
    }
}

$uniqueRules  = @($missingRules  | Sort-Object citation, citedIn -Unique)
$uniqueAgents = @($missingAgents | Sort-Object citation, citedIn -Unique)

$result = [PSCustomObject]@{
    missingRules  = $uniqueRules
    missingAgents = $uniqueAgents
    filesScanned  = $filesScanned
    ok            = (($uniqueRules.Count -eq 0) -and ($uniqueAgents.Count -eq 0))
}

$result | ConvertTo-Json -Depth 5
