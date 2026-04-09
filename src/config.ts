/**
 * config.ts
 *
 * Loads application configuration by merging:
 *   1. data/config.json   -- user-editable settings (sources, resolution, fonts, etc.)
 *   2. .env               -- secrets (Unsplash API key)
 *   3. Computed paths      -- archive and cache directories derived from the user's home dir
 *
 * The resulting AppConfig is passed to virtually every other module.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getHomedir } from "./utils/platform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

/**
 * Reads a .env file (if present) and populates process.env for any keys
 * that aren't already set. This avoids requiring a third-party dotenv package.
 */
function loadEnvFile(): void {
  const envPath = resolve(PROJECT_ROOT, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/** The fully resolved configuration object used across the app. */
export interface AppConfig {
  activeSources: string[];
  resolution: { width: number; height: number };
  font: { quote: string; attribution: string };
  background: { darkenOpacity: number; blurSigma: number };
  /** Absolute path to the wallpaper archive folder (e.g. ~/Pictures/DailyQuotes). */
  archivePath: string;
  /** Whether to apply the wallpaper to all displays (macOS only). */
  setAllDisplays: boolean;
  /** Unsplash API access key loaded from .env. */
  unsplashAccessKey: string;
  /** Absolute path to the project root directory. */
  projectRoot: string;
  /** Absolute path to the cache directory (~/.cache/inspiration). */
  cachePath: string;
  /** Supabase project URL for archive sync. */
  supabaseUrl: string;
  /** Supabase anon/public key for archive sync. */
  supabaseAnonKey: string;
  /** Storage bucket name for archived wallpapers. */
  supabaseBucket: string;
}

/**
 * Loads and returns the merged application configuration.
 *
 * Call this at the start of every entry point (CLI and web server).
 * The config is intentionally not cached as a singleton so that the
 * web UI can re-read config.json after the user changes settings.
 */
export function loadConfig(): AppConfig {
  loadEnvFile();
  const configPath = resolve(PROJECT_ROOT, "data", "config.json");
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));

  const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY ?? "";
  if (!unsplashAccessKey) {
    console.warn(
      "Warning: UNSPLASH_ACCESS_KEY not set. Copy .env.example to .env and add your key."
    );
  }

  // Resolve ~ to the actual home directory (cross-platform via os.homedir)
  const home = getHomedir();
  const archivePath = raw.archivePath.replace("~", home);
  const cachePath = resolve(home, ".cache", "inspiration");
  const supabaseUrl =
    process.env.SUPABASE_URL ?? "https://qmowrkiqsjuvzeyfqpsv.supabase.co";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3dya2lxc2p1dnpleWZxcHN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyMTI1MSwiZXhwIjoyMDkxMjk3MjUxfQ.g90uOHSDJe9Is8dtByarGxEk1zkm9zUJWKAhx6GcTq4";
  const supabaseBucket = process.env.SUPABASE_ARCHIVE_BUCKET ?? "wallpapers";

  return {
    activeSources: raw.activeSources,
    resolution: raw.resolution,
    font: raw.font,
    background: raw.background,
    archivePath,
    setAllDisplays: raw.setAllDisplays,
    unsplashAccessKey,
    projectRoot: PROJECT_ROOT,
    cachePath,
    supabaseUrl,
    supabaseAnonKey,
    supabaseBucket,
  };
}
