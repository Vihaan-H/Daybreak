/**
 * index.ts -- CLI entry point
 *
 * Runs the full wallpaper generation pipeline:
 *
 *   1. Load configuration (data/config.json + .env)
 *   2. Select today's quote (deterministic based on date)
 *   3. Check cache -- skip to step 7 if today's wallpaper already exists
 *   4. Fetch a themed background photo from Unsplash
 *   5. Render the wallpaper (background + quote text overlay)
 *   6. Archive the result to ~/Pictures/DailyQuotes/
 *   7. Set the desktop wallpaper
 *   8. Clean up stale cache files
 *
 * Usage:  npm run generate   (or:  npx tsx src/index.ts)
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { loadConfig } from "./config.js";
import { loadQuoteSources, selectDailyQuote } from "./quotes/loader.js";
import { getTodayString } from "./utils/date.js";
import { ensureCacheDirs, hasCachedWallpaper, getCachedWallpaperPath, cleanOldCache } from "./images/cache.js";
import { fetchBackgroundImage } from "./images/unsplash.js";
import { renderWallpaper } from "./canvas/renderer.js";
import { archiveWallpaper } from "./wallpaper/archive.js";
import { setWallpaper } from "./wallpaper/setter.js";

async function main() {
  console.log("=== Daily Inspiration ===\n");

  // 1. Load config
  const config = loadConfig();
  ensureCacheDirs(config);

  // 2. Select today's quote
  const sources = loadQuoteSources(config);
  const quote = selectDailyQuote(sources);
  console.log(`Today's quote: "${quote.text}"`);
  console.log(`— ${quote.author} (source: ${quote.source.name})\n`);

  // 3. Check cache
  if (hasCachedWallpaper(config)) {
    console.log("Today's wallpaper already generated. Using cached version.");
    const cachedPath = getCachedWallpaperPath(config);
    setWallpaper(cachedPath, config.setAllDisplays);
    return;
  }

  // 4. Fetch background image
  const backgroundPath = await fetchBackgroundImage(config, quote.source.theme);

  // 5-6. Render wallpaper
  console.log("Rendering wallpaper...");
  const wallpaperBuffer = await renderWallpaper(config, quote, backgroundPath);

  // 7. Archive
  const archivedPath = archiveWallpaper(config, wallpaperBuffer);

  // Also cache it so subsequent runs today are instant
  writeFileSync(getCachedWallpaperPath(config), wallpaperBuffer);

  // Save quote state so the UI knows which quote is active
  const quoteState = {
    date: getTodayString(),
    text: quote.text,
    author: quote.author,
    sourceId: quote.source.id,
    sourceName: quote.source.name,
    sourceTheme: quote.source.theme,
  };
  writeFileSync(resolve(config.cachePath, "current-quote.json"), JSON.stringify(quoteState, null, 2));

  // 8. Set wallpaper
  setWallpaper(archivedPath, config.setAllDisplays);

  // Cleanup old cache
  cleanOldCache(config);

  console.log("\nDone! Enjoy your daily inspiration.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
