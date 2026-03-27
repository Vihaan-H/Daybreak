/**
 * wallpaper/setter.ts
 *
 * Sets the desktop wallpaper using platform-native APIs:
 *
 *   - macOS:   AppleScript via `osascript` (controls System Events)
 *   - Windows: PowerShell calling the Win32 SystemParametersInfo API
 *   - Linux:   Tries gsettings (GNOME/ChromeOS), qdbus (KDE), xfconf (XFCE),
 *              then feh as a last resort for tiling window managers
 *
 * A temp-copy workaround is used because some OSes cache the wallpaper
 * by file path -- overwriting the same path won't trigger a visual update.
 */

import { execSync } from "child_process";
import { copyFileSync, readdirSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { detectPlatform } from "../utils/platform.js";

/**
 * Sets the desktop wallpaper to the given image file.
 *
 * Creates a timestamped copy to defeat OS-level path caching, then
 * delegates to the platform-specific setter.
 */
export function setWallpaper(imagePath: string, allDisplays: boolean): void {
  const dir = dirname(imagePath);
  const tempPath = resolve(dir, `_wallpaper_${Date.now()}.png`);

  // Clean up leftover temp files from previous runs
  try {
    for (const f of readdirSync(dir)) {
      if (f.startsWith("_wallpaper_") && f.endsWith(".png")) {
        unlinkSync(resolve(dir, f));
      }
    }
  } catch {}

  // Copy to a unique temp path and apply that as the wallpaper
  try {
    copyFileSync(imagePath, tempPath);
    applyWallpaper(tempPath, allDisplays);
  } catch {
    // If the copy/rename trick fails, try the original path directly
    applyWallpaper(imagePath, allDisplays);
  }
}

/** Routes to the correct platform-specific implementation. */
function applyWallpaper(imagePath: string, allDisplays: boolean): void {
  const platform = detectPlatform();

  switch (platform) {
    case "macos":
      applyWallpaperMac(imagePath, allDisplays);
      break;
    case "windows":
      applyWallpaperWindows(imagePath);
      break;
    case "linux":
      applyWallpaperLinux(imagePath);
      break;
  }
}

// ---------------------------------------------------------------------------
// macOS -- AppleScript via osascript
// ---------------------------------------------------------------------------

function applyWallpaperMac(imagePath: string, allDisplays: boolean): void {
  const script = allDisplays
    ? `
tell application "System Events"
  set desktopCount to count of desktops
  repeat with i from 1 to desktopCount
    set picture of desktop i to "${imagePath}"
  end repeat
end tell`
    : `
tell application "System Events"
  set picture of desktop 1 to "${imagePath}"
end tell`;

  try {
    execSync(`osascript -e '${script}'`, { stdio: "pipe" });
    console.log("Wallpaper set successfully (macOS)");
  } catch (err) {
    console.error(
      "Failed to set wallpaper. You may need to grant automation permissions in System Settings > Privacy > Automation."
    );
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Windows -- PowerShell + SystemParametersInfo Win32 API
// ---------------------------------------------------------------------------

function applyWallpaperWindows(imagePath: string): void {
  // Convert forward slashes to backslashes for Windows paths
  const winPath = imagePath.replace(/\//g, "\\");

  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[Wallpaper]::SystemParametersInfo(0x0014, 0, "${winPath}", 0x0001 -bor 0x0002)
`;

  try {
    execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, {
      stdio: "pipe",
    });
    console.log("Wallpaper set successfully (Windows)");
  } catch (err) {
    console.error("Failed to set wallpaper on Windows.");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Linux -- tries multiple desktop environments in priority order
// ---------------------------------------------------------------------------

function applyWallpaperLinux(imagePath: string): void {
  const methods = [
    {
      name: "GNOME/gsettings",
      cmd: `gsettings set org.gnome.desktop.background picture-uri "file://${imagePath}" && gsettings set org.gnome.desktop.background picture-uri-dark "file://${imagePath}"`,
    },
    {
      name: "KDE Plasma",
      cmd: `qdbus org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript 'var allDesktops = desktops(); for (var i = 0; i < allDesktops.length; i++) { var d = allDesktops[i]; d.wallpaperPlugin = "org.kde.image"; d.currentConfigGroup = ["Wallpaper", "org.kde.image", "General"]; d.writeConfig("Image", "file://${imagePath}"); }'`,
    },
    {
      name: "XFCE",
      cmd: `xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/last-image -s "${imagePath}"`,
    },
    {
      name: "feh",
      cmd: `feh --bg-fill "${imagePath}"`,
    },
  ];

  for (const method of methods) {
    try {
      execSync(method.cmd, { stdio: "pipe" });
      console.log(`Wallpaper set successfully (Linux/${method.name})`);
      return;
    } catch {
      // This desktop environment isn't available -- try the next one
    }
  }

  console.error(
    "Failed to set wallpaper. Could not detect a supported desktop environment.\n" +
      "Supported: GNOME, KDE Plasma, XFCE, or any WM with feh installed."
  );
}
