/**
 * images/cache.ts
 *
 * Manages the file-system cache at ~/.cache/inspiration/.
 *
 * The cache stores two kinds of files:
 *   - Rendered wallpapers:  {cachePath}/YYYY-MM-DD.png
 *   - Downloaded backgrounds: {cachePath}/backgrounds/YYYY-MM-DD.jpg
 *
 * Files older than MAX_CACHE_AGE_DAYS are cleaned up automatically
 * after each successful generation run.
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { resolve } from "path";
import type { AppConfig } from "../config.js";
import { getTodayString } from "../utils/date.js";

const MAX_CACHE_AGE_DAYS = 30;

/** Creates the cache directory and backgrounds subdirectory if they don't exist. */
export function ensureCacheDirs(config: AppConfig): void {
  const dirs = [config.cachePath, resolve(config.cachePath, "backgrounds")];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/** Returns the expected file path for today's cached wallpaper. */
export function getCachedWallpaperPath(config: AppConfig): string {
  return resolve(config.cachePath, `${getTodayString()}.png`);
}

/** Returns true if today's wallpaper has already been rendered and cached. */
export function hasCachedWallpaper(config: AppConfig): boolean {
  return existsSync(getCachedWallpaperPath(config));
}

/** Returns the expected file path for a cached Unsplash background image. */
export function getCachedBackgroundPath(
  config: AppConfig,
  dateStr: string
): string {
  return resolve(config.cachePath, "backgrounds", `${dateStr}.jpg`);
}

/** Removes cached files older than MAX_CACHE_AGE_DAYS (default 30 days). */
export function cleanOldCache(config: AppConfig): void {
  const now = Date.now();
  const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;

  const dirs = [config.cachePath, resolve(config.cachePath, "backgrounds")];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const filePath = resolve(dir, file);
      const stat = statSync(filePath);
      if (stat.isFile() && now - stat.mtimeMs > maxAge) {
        unlinkSync(filePath);
      }
    }
  }
}
