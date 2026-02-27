# Flash the Windows Terminal taskbar icon and play a notification sound.
Add-Type -TypeDefinition @"
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

# Flash all Windows Terminal windows
$procs = Get-Process -Name "WindowsTerminal" -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
foreach ($p in $procs) {
    [WindowFlasher]::Flash($p.MainWindowHandle)
}

# Play notification sound
[System.Media.SystemSounds]::Asterisk.Play()
