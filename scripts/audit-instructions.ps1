# Claude Code hook handler — records every instruction file loaded into a session, with the
# reason it loaded. The measuring instrument for rule-scope work: acceptance checks become a
# log diff instead of eyeballing /context.
#
# Wired up in ~/.claude/settings.json under hooks.InstructionsLoaded.
# Input: JSON via stdin. Expected fields: session_id, cwd, file_path, load_reason
# (session_start | path_glob_match | include | compact | nested_traversal).
#
# Writes JSONL to ~/.claude/debug/instruction-loads/<session>.jsonl (debug/ is gitignored).
# The raw payload is preserved on each line so the real schema stays visible even if the
# documented field names drift.
#
# Analyse with: scripts/audit-instructions.ps1 -Report

[CmdletBinding()]
param(
    # Summarise the newest log instead of recording a hook event.
    [switch]$Report,
    # Report on a specific log file rather than the newest.
    [string]$LogPath
)

$ErrorActionPreference = 'Continue'

$logDir = Join-Path $env:USERPROFILE '.claude\debug\instruction-loads'

# --- Report mode --------------------------------------------------------------------------

if ($Report) {
    if (-not $LogPath) {
        $LogPath = Get-ChildItem $logDir -Filter *.jsonl -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1 |
            ForEach-Object { $_.FullName }
    }
    if (-not $LogPath -or -not (Test-Path $LogPath)) {
        [pscustomobject]@{ ok = $false; error = "no log found in $logDir" } | ConvertTo-Json -Compress
        exit 0
    }

    # Malformed lines are counted, never silently dropped — acceptance checks compare exact
    # file counts, so a quietly skipped line would read as a successful reduction.
    $entries = [System.Collections.Generic.List[object]]::new()
    $malformed = 0
    foreach ($l in Get-Content -LiteralPath $LogPath) {
        if (-not $l.Trim()) { $malformed++; continue }
        try { $entries.Add(($l | ConvertFrom-Json)) } catch { $malformed++ }
    }

    # Bucket by scope. memory_type (User/Project) comes straight from the hook payload and is
    # authoritative; candidates need a path check because they are User/Project-agnostic.
    $byScope = $entries | Group-Object {
        if ($_.file_path -match 'rules[\\/]candidates[\\/]') { 'candidates' }
        elseif ($_.raw.memory_type) { "$($_.raw.memory_type)-memory" }
        else { 'unknown' }
    }

    [pscustomobject]@{
        ok        = $true
        log       = $LogPath
        total     = $entries.Count
        malformed = $malformed
        bytes     = ($entries | Measure-Object -Property bytes -Sum).Sum
        byScope   = @($byScope | ForEach-Object {
            [pscustomobject]@{
                scope = $_.Name
                files = $_.Count
                bytes = ($_.Group | Measure-Object -Property bytes -Sum).Sum
            }
        })
        byReason  = @($entries | Group-Object load_reason | ForEach-Object {
            [pscustomobject]@{ reason = $_.Name; files = $_.Count }
        })
    } | ConvertTo-Json -Depth 5
    exit 0
}

# --- Hook mode ----------------------------------------------------------------------------
#
# Deliberate catch-all: a throw here would surface as noise on every instruction load, and
# Claude Code ignores the exit code anyway, so failing loudly buys nothing. Best-effort by design.

try {
    $stdin = [Console]::In.ReadToEnd()
    if (-not $stdin) { exit 0 }

    $hook = $stdin | ConvertFrom-Json
    $filePath = $hook.file_path

    # Size is the number the rule-scope work is actually optimising, so record it at load time
    # rather than resolving paths later against a tree that may have moved.
    $bytes = 0
    if ($filePath -and (Test-Path -LiteralPath $filePath)) {
        $bytes = (Get-Item -LiteralPath $filePath).Length
    }

    $sessionId = if ($hook.session_id) { $hook.session_id } else { 'unknown' }
    $cwd       = if ($hook.cwd) { $hook.cwd } else { '' }

    $entry = [ordered]@{
        ts          = (Get-Date).ToString('o')
        session_id  = $sessionId
        project     = if ($cwd) { Split-Path -Leaf $cwd } else { '' }
        cwd         = $cwd
        file_path   = $filePath
        load_reason = $hook.load_reason
        bytes       = $bytes
        raw         = $hook
    }

    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    $safeId = $sessionId -replace '[^A-Za-z0-9_.-]', '_'
    $line = ($entry | ConvertTo-Json -Depth 6 -Compress) + "`n"
    $logFile = Join-Path $logDir "$safeId.jsonl"

    # Claude Code fires this hook once per instruction file, concurrently — 47+ pwsh processes
    # appending at once. Add-Content is not atomic across processes and tore ~14% of lines in
    # testing, so serialise on a named mutex. Without this the log is silently unparseable.
    $mutex = New-Object System.Threading.Mutex($false, 'Global\ClaudeInstructionAudit')
    $held = $false
    try {
        $held = $mutex.WaitOne(5000)
        [System.IO.File]::AppendAllText($logFile, $line, [System.Text.UTF8Encoding]::new($false))
    } finally {
        if ($held) { $mutex.ReleaseMutex() }
        $mutex.Dispose()
    }
} catch {
    # Swallowed on purpose — see the note above the try.
}

exit 0
