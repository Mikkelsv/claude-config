# Register a dedicated AppUserModelId for Claude hook notifications so Windows trusts
# our toasts AND shows banner popups instead of dumping them silently into Action Center.
# One-time setup — safe to re-run.
#
# Windows 11 requires:
#   1. Registry entries under HKCU\Software\Classes\AppUserModelId\<AppId>  (DisplayName, ShowInSettings)
#   2. Registry entries under HKCU\...\Notifications\Settings\<AppId>       (Enabled, ShowBanner, ...)
#   3. A Start Menu .lnk shortcut with System.AppUserModel.ID embedded via IPropertyStore
#
# BurntToast's New-BTShortcut is broken in v1.1.0 — it creates the shortcut but its fallback
# for setting AppUserModelID uses Set-ItemProperty which doesn't touch PropertyStore. So we
# do step 3 manually via COM/IShellLink/IPropertyStore.

$ErrorActionPreference = 'Stop'

$AppId = 'Claude.HookNotify'
$DisplayName = 'Claude Code'

# -- 1. AppID registry entries ---------------------------------------------------------------
$classesPath = "HKCU:\Software\Classes\AppUserModelId\$AppId"
if (-not (Test-Path $classesPath)) { New-Item -Path $classesPath -Force | Out-Null }
New-ItemProperty -Path $classesPath -Name 'DisplayName'    -Value $DisplayName -PropertyType String -Force | Out-Null
New-ItemProperty -Path $classesPath -Name 'ShowInSettings' -Value 1 -PropertyType DWord -Force | Out-Null

# -- 2. Enable banners in notification settings ----------------------------------------------
$notifPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\$AppId"
if (-not (Test-Path $notifPath)) { New-Item -Path $notifPath -Force | Out-Null }
New-ItemProperty -Path $notifPath -Name 'Enabled'              -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $notifPath -Name 'ShowInActionCenter'   -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $notifPath -Name 'ShowBanner'           -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $notifPath -Name 'AllowContentAboveLock' -Value 1 -PropertyType DWord -Force | Out-Null

# -- 3. Create Start Menu shortcut with AppUserModelID embedded ------------------------------
$shortcutDir  = [Environment]::GetFolderPath('Programs')   # Start Menu\Programs
$shortcutPath = [IO.Path]::Combine($shortcutDir, "$DisplayName.lnk")

# Remove any broken shortcut from prior attempts so we start clean.
if (Test-Path $shortcutPath) { Remove-Item $shortcutPath -Force }

# Create the basic .lnk with WScript.Shell (target, args, etc.)
$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($shortcutPath)
$lnk.TargetPath = (Get-Command powershell.exe).Source
$lnk.Description = 'Claude Code notifications'
$lnk.Save()

# Now embed System.AppUserModel.ID into the shortcut's PropertyStore via COM.
# This is the step BurntToast 1.1.0 gets wrong.
Add-Type -ErrorAction SilentlyContinue -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace ClaudeHook {
    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    public struct PROPERTYKEY {
        public Guid fmtid;
        public uint pid;
    }

    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IPropertyStore {
        uint GetCount([Out] out uint propertyCount);
        uint GetAt([In] uint propertyIndex, out PROPERTYKEY key);
        uint GetValue([In] ref PROPERTYKEY key, [Out] IntPtr pv);
        uint SetValue([In] ref PROPERTYKEY key, [In] IntPtr pv);
        uint Commit();
    }

    [ComImport, Guid("000214F9-0000-0000-C000-000000000046"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IShellLinkW {
        uint GetPath(IntPtr pszFile, int cch, IntPtr pfd, uint fFlags);
        uint GetIDList(out IntPtr ppidl);
        uint SetIDList(IntPtr pidl);
        uint GetDescription(IntPtr pszName, int cch);
        uint SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
        uint GetWorkingDirectory(IntPtr pszDir, int cch);
        uint SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
        uint GetArguments(IntPtr pszArgs, int cch);
        uint SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
        uint GetHotkey(out ushort pwHotkey);
        uint SetHotkey(ushort wHotkey);
        uint GetShowCmd(out int piShowCmd);
        uint SetShowCmd(int iShowCmd);
        uint GetIconLocation(IntPtr pszIconPath, int cch, out int piIcon);
        uint SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
        uint SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, uint dwReserved);
        uint Resolve(IntPtr hwnd, uint fFlags);
        uint SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
    }

    [ComImport, Guid("0000010B-0000-0000-C000-000000000046"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IPersistFile {
        uint GetClassID(out Guid pClassID);
        [PreserveSig] int IsDirty();
        uint Load([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, uint dwMode);
        uint Save([MarshalAs(UnmanagedType.LPWStr)] string pszFileName, [MarshalAs(UnmanagedType.Bool)] bool fRemember);
        uint SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string pszFileName);
        uint GetCurFile(IntPtr ppszFileName);
    }

    public static class NativeMethods {
        [DllImport("ole32.dll")]
        public static extern int CoCreateInstance(
            [In] ref Guid clsid, IntPtr pUnkOuter, uint dwClsContext,
            [In] ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object ppv);

        [DllImport("ole32.dll")]
        public static extern int PropVariantClear(IntPtr pvar);
    }

    public static class ShortcutAppId {
        // VT_LPWSTR = 31
        private const ushort VT_LPWSTR = 31;
        private static readonly Guid CLSID_ShellLink = new Guid("00021401-0000-0000-C000-000000000046");
        private static readonly Guid IID_IShellLinkW = new Guid("000214F9-0000-0000-C000-000000000046");
        private static readonly Guid IID_IPersistFile = new Guid("0000010B-0000-0000-C000-000000000046");
        private static readonly Guid IID_IPropertyStore = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");

        public static void Set(string shortcutPath, string appUserModelId) {
            object obj;
            Guid clsid = CLSID_ShellLink;
            Guid iidShellLink = IID_IShellLinkW;
            int hr = NativeMethods.CoCreateInstance(ref clsid, IntPtr.Zero, 1 /*CLSCTX_INPROC_SERVER*/, ref iidShellLink, out obj);
            if (hr != 0) throw new System.ComponentModel.Win32Exception(hr, "CoCreateInstance(ShellLink) failed");

            IShellLinkW link = (IShellLinkW)obj;
            IPersistFile persist = (IPersistFile)obj;
            persist.Load(shortcutPath, 2 /*STGM_READWRITE*/);

            IPropertyStore store = (IPropertyStore)obj;

            // PKEY_AppUserModel_ID: fmtid={9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3}, pid=5
            PROPERTYKEY key = new PROPERTYKEY();
            key.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");
            key.pid = 5;

            // PROPVARIANT layout: ushort vt at offset 0, padding, then pointer at offset 8.
            // We allocate 24 bytes (x64 safe) and write VT_LPWSTR + a CoTaskMem-allocated LPWSTR.
            IntPtr pv = Marshal.AllocCoTaskMem(24);
            try {
                // Zero the struct
                for (int i = 0; i < 24; i++) Marshal.WriteByte(pv, i, 0);
                Marshal.WriteInt16(pv, 0, (short)VT_LPWSTR);
                IntPtr str = Marshal.StringToCoTaskMemUni(appUserModelId);
                Marshal.WriteIntPtr(pv, 8, str);

                uint rc = store.SetValue(ref key, pv);
                if (rc != 0) throw new System.ComponentModel.Win32Exception((int)rc, "IPropertyStore.SetValue failed");
                rc = store.Commit();
                if (rc != 0) throw new System.ComponentModel.Win32Exception((int)rc, "IPropertyStore.Commit failed");

                persist.Save(shortcutPath, true);
            } finally {
                NativeMethods.PropVariantClear(pv);
                Marshal.FreeCoTaskMem(pv);
            }

            Marshal.ReleaseComObject(obj);
        }
    }
}
'@

[ClaudeHook.ShortcutAppId]::Set($shortcutPath, $AppId)

# -- 4. Clean up abandoned claude-focus:// scheme attempt -----------------------------------
# We tried to make toast clicks focus Claude via a custom URL scheme, but Windows 11 refuses
# to route unsigned user-folder EXEs as URL handlers (security heuristic). Toast now has no
# click action; this block removes the scaffolding from prior attempts in case it was set.
$cleanup = @(
    'HKCU:\Software\Classes\claude-focus',
    'HKCU:\Software\Classes\Claude.Focus',
    'HKCU:\Software\Claude\Focus'
)
foreach ($p in $cleanup) {
    if (Test-Path $p) { Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue }
}
$regApps = 'HKCU:\Software\RegisteredApplications'
if (Test-Path $regApps) {
    Remove-ItemProperty -Path $regApps -Name 'Claude Focus' -Force -ErrorAction SilentlyContinue
}
$leftoverExe = "$PSScriptRoot\focus-claude.exe"
if (Test-Path $leftoverExe) { Remove-Item $leftoverExe -Force -ErrorAction SilentlyContinue }

Write-Host "Registered AppID    : $AppId"
Write-Host "Display name        : $DisplayName"
Write-Host "Start Menu shortcut : $shortcutPath"
Write-Host "Banners enabled     : yes"
