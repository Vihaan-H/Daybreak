/**
 * images/unsplash.ts
 *
 * Fetches a landscape photograph from the Unsplash API to use as
 * the wallpaper background. The search query comes from the quote
 * source's `theme` field (e.g. "zen garden minimal nature").
 *
 * Downloaded images are cached by date in ~/.cache/inspiration/backgrounds/
 * so the API is only called once per day, even if the pipeline reruns.
 */

import { writeFileSync, existsSync } from "fs";
import type { AppConfig } from "../config.js";
import { getTodayString } from "../utils/date.js";
import { getCachedBackgroundPath } from "./cache.js";

/** Shape of the Unsplash /photos/random response (only the fields we use). */
interface UnsplashPhoto {
  urls: { raw: string };
  user: { name: string; links: { html: string } };
}

/**
 * Returns the path to a background image for today's wallpaper.
 *
 * If a cached background already exists for today, it is returned immediately.
 * Otherwise a new image is fetched from Unsplash, saved to the cache, and
 * its path is returned.
 */
export async function fetchBackgroundImage(
  config: AppConfig,
  theme: string
): Promise<string> {
  const dateStr = getTodayString();
  const cachedPath = getCachedBackgroundPath(config, dateStr);

  if (existsSync(cachedPath)) {
    console.log("Using cached background image");
    return cachedPath;
  }

  if (!config.unsplashAccessKey) {
    throw new Error(
      "UNSPLASH_ACCESS_KEY is required. Copy .env.example to .env and add your key."
    );
  }

  const { width, height } = config.resolution;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(theme)}&orientation=landscape&content_filter=high`;

  console.log(`Fetching background from Unsplash (theme: "${theme}")...`);

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${config.unsplashAccessKey}` },
  });

  if (response.status === 429) {
    throw new Error("Unsplash API rate limit reached. Try again later.");
  }

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  const photo: UnsplashPhoto = await response.json();
  const imageUrl = `${photo.urls.raw}&w=${width}&h=${height}&fit=crop&q=85`;

  // Per Unsplash guidelines, credit the photographer
  console.log(`Photo by ${photo.user.name} on Unsplash`);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  writeFileSync(cachedPath, buffer);
  console.log(`Background cached to ${cachedPath}`);

  return cachedPath;
}
