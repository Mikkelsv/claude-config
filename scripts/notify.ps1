# Claude Code hook handler — shows a Windows toast with a task summary when Claude finishes,
# and flashes the taskbar + plays a sound. Click the toast to jump back to the Claude app session.
#
# Wired up in ~/.claude/settings.json under hooks.Stop and hooks.Notification.
# Input: JSON via stdin with session_id, transcript_path, cwd, hook_event_name, (optional) message.
#
# Requires one-time setup: run register-toast-appid.ps1 to register the AppID and create the
# Start Menu shortcut. Without that, toasts land silently in Action Center on Windows 11.

$ErrorActionPreference = 'Continue'

$AppId = 'Claude.HookNotify'

# --- Read hook input from stdin --------------------------------------------------------------

$hookJson = $null
try {
    $stdin = [Console]::In.ReadToEnd()
    if ($stdin) { $hookJson = $stdin | ConvertFrom-Json }
} catch {
    # If stdin parsing fails, we still want to flash + sound, just with no summary.
}

$eventName      = if ($hookJson) { $hookJson.hook_event_name } else { 'Stop' }
$sessionId      = if ($hookJson) { $hookJson.session_id      } else { $null }
$transcriptPath = if ($hookJson) { $hookJson.transcript_path } else { $null }
$cwd            = if ($hookJson) { $hookJson.cwd             } else { (Get-Location).Path }
$projectName    = if ($cwd) { Split-Path -Leaf $cwd } else { 'Claude' }

# --- Build the toast payload -----------------------------------------------------------------

function Get-LastAssistantSummary {
    param([string]$Path)
    if (-not $Path -or -not (Test-Path $Path)) { return $null }

    # Transcript is JSONL — scan from the end for the last assistant text block.
    $lines = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        $line = $lines[$i]
        if (-not $line) { continue }
        try { $entry = $line | ConvertFrom-Json } catch { continue }
        if ($entry.type -ne 'assistant') { continue }
        $content = $entry.message.content
        if (-not $content) { continue }
        foreach ($block in $content) {
            if ($block.type -eq 'text' -and $block.text) {
                return $block.text
            }
        }
    }
    return $null
}

function Format-Summary {
    param([string]$Text, [int]$MaxLen = 80)
    if (-not $Text) { return $null }
    # Take only the first non-empty line — Claude usually leads with the summary.
    $firstLine = ($Text -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
    if (-not $firstLine) { return $null }
    # Strip markdown noise that looks ugly in a toast.
    $t = $firstLine -replace '`([^`]+)`', '$1'
    $t = $t -replace '\*\*([^*]+)\*\*', '$1'
    $t = $t -replace '\s+', ' '
    $t = $t.Trim()
    if ($t.Length -le $MaxLen) { return $t }
    return $t.Substring(0, $MaxLen - 1).TrimEnd() + '…'
}

function Escape-Xml {
    param([string]$Text)
    if (-not $Text) { return '' }
    return ($Text -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;' -replace "'", '&apos;')
}

switch ($eventName) {
    'Notification' {
        $title   = $projectName
        $message = if ($hookJson.message) { $hookJson.message } else { 'Waiting for input.' }
    }
    default {
        $title   = $projectName
        $raw     = Get-LastAssistantSummary -Path $transcriptPath
        $message = Format-Summary -Text $raw -MaxLen 80
        if (-not $message) { $message = 'Done.' }
    }
}

# --- Show the toast --------------------------------------------------------------------------
#
# No click handler. Windows 11 refuses to route custom URL schemes to unsigned user-folder
# EXEs (security heuristic), and claude:// repositions the window. Toast clicks just dismiss.
# User can alt-tab to Claude.

try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType=WindowsRuntime] | Out-Null

    $titleXml   = Escape-Xml $title
    $messageXml = Escape-Xml $message

    $xml = @"
<toast duration="long">
  <visual>
    <binding template="ToastGeneric">
      <text>$titleXml</text>
      <text>$messageXml</text>
    </binding>
  </visual>
</toast>
"@

    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml($xml)

    $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
} catch {
    # Silently degrade — flash + sound below still provide feedback.
}

# --- Flash taskbar + play sound (bonus attention-getters) ------------------------------------

Add-Type -ErrorAction SilentlyContinue -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WindowFlasher {
    [StructLayout(LayoutKind.Sequential)]
    public struct FLASHWINFO {
        public uint cbSize;
        public IntPtr hwnd;
        public uint dwFlags;
        public uint uCount;
        public uint dwTimeout;
    }

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool FlashWindowEx(ref FLASHWINFO pwfi);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    private const uint FLASHW_ALL = 0x03;
    private const uint FLASHW_TIMERNOFG = 0x0C;

    public static void Flash(IntPtr hwnd) {
        if (hwnd == IntPtr.Zero) return;
        var fi = new FLASHWINFO();
        fi.cbSize = (uint)Marshal.SizeOf(fi);
        fi.hwnd   = hwnd;
        bool isForeground = hwnd == GetForegroundWindow();
        if (isForeground) {
            fi.dwFlags  = FLASHW_ALL;
            fi.uCount   = 3;
            fi.dwTimeout = 80;
        } else {
            fi.dwFlags  = FLASHW_ALL | FLASHW_TIMERNOFG;
            fi.uCount   = 0;
            fi.dwTimeout = 0;
        }
        FlashWindowEx(ref fi);
    }
}
"@

$procs = Get-Process -Name "claude" -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
foreach ($p in $procs) {
    [WindowFlasher]::Flash($p.MainWindowHandle)
}

[System.Media.SystemSounds]::Asterisk.Play()
