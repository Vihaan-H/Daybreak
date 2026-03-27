/**
 * utils/platform.ts
 *
 * Cross-platform helpers used throughout the app to branch behavior
 * based on the host operating system. All platform-specific decisions
 * (wallpaper API, font paths, scheduler, browser-open command) flow
 * through the `detectPlatform()` function defined here.
 */

import { homedir } from "os";

export type Platform = "macos" | "windows" | "linux";

/** Maps Node's `process.platform` to one of our three supported targets. */
export function detectPlatform(): Platform {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    default:
      // Covers standard Linux, ChromeOS Crostini, WSL, etc.
      return "linux";
  }
}

/** Returns the current user's home directory (works on all platforms). */
export function getHomedir(): string {
  return homedir();
}

/** Returns the shell command to open a URL in the default browser. */
export function openUrl(url: string): string {
  switch (detectPlatform()) {
    case "macos":
      return `open ${url}`;
    case "windows":
      return `start ${url}`;
    case "linux":
      return `xdg-open ${url}`;
  }
}
