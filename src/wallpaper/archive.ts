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
import { upsertArchiveRow } from "./supabaseArchive.js";

/**
 * Writes the wallpaper buffer to the archive folder and returns
 * the absolute path of the saved file.
 */
export async function archiveWallpaper(
  config: AppConfig,
  imageBuffer: Buffer,
  quote: { text: string; author: string; source: { id: string; name: string } }
): Promise<string> {
  if (!existsSync(config.archivePath)) {
    mkdirSync(config.archivePath, { recursive: true });
  }

  const now = new Date();
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const filename = `${getTodayString()}_${time}.png`;
  const filePath = resolve(config.archivePath, filename);
  writeFileSync(filePath, imageBuffer);
  console.log(`Wallpaper archived to ${filePath}`);

  try {
    await upsertArchiveRow(
      config,
      {
        date: getTodayString(),
        filename,
        quote_text: quote.text,
        quote_author: quote.author,
        source_id: quote.source.id,
        source_name: quote.source.name,
      },
      imageBuffer
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`Supabase archive sync failed: ${message}`);
  }

  return filePath;
}
