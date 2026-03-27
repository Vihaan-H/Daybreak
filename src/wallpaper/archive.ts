/**
 * wallpaper/archive.ts
 *
 * Saves each generated wallpaper to the archive directory (default:
 * ~/Pictures/DailyQuotes/) with a timestamped filename. This lets
 * users browse past wallpapers in the web UI or in their file manager.
 *
 * Filename format: YYYY-MM-DD_HHMMSS.png
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import type { AppConfig } from "../config.js";
import { getTodayString } from "../utils/date.js";

/**
 * Writes the wallpaper buffer to the archive folder and returns
 * the absolute path of the saved file.
 */
export function archiveWallpaper(config: AppConfig, imageBuffer: Buffer): string {
  if (!existsSync(config.archivePath)) {
    mkdirSync(config.archivePath, { recursive: true });
  }

  const now = new Date();
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const filename = `${getTodayString()}_${time}.png`;
  const filePath = resolve(config.archivePath, filename);
  writeFileSync(filePath, imageBuffer);
  console.log(`Wallpaper archived to ${filePath}`);

  return filePath;
}
