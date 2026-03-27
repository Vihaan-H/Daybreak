/**
 * canvas/fonts.ts
 *
 * Handles cross-platform font registration for @napi-rs/canvas.
 *
 * The strategy is:
 *   1. Try platform-specific system fonts (Avenir Next, Segoe UI, DejaVu, etc.)
 *   2. Fall back to the bundled Inter font in data/fonts/
 *   3. If nothing works, let canvas use its built-in sans-serif
 *
 * Other modules can call getResolvedFontFamily() to learn which font
 * was actually registered, so they don't hardcode a family name.
 */

import { GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { detectPlatform } from "../utils/platform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

/** Bundled fallback font shipped with the project (works on all platforms). */
const BUNDLED_FONT = resolve(PROJECT_ROOT, "data", "fonts", "Inter.ttf");

interface FontCandidate {
  path: string;
  family: string;
}

/** Returns an ordered list of system font paths to try for the current OS. */
function getSystemFontPaths(): FontCandidate[] {
  const platform = detectPlatform();

  switch (platform) {
    case "macos":
      return [
        { path: "/System/Library/Fonts/Avenir Next.ttc", family: "Avenir Next" },
        { path: "/System/Library/Fonts/Supplemental/Avenir Next.ttc", family: "Avenir Next" },
        { path: "/System/Library/Fonts/Helvetica.ttc", family: "Helvetica" },
      ];
    case "windows":
      return [
        { path: "C:\\Windows\\Fonts\\segoeui.ttf", family: "Segoe UI" },
        { path: "C:\\Windows\\Fonts\\arial.ttf", family: "Arial" },
        { path: "C:\\Windows\\Fonts\\calibri.ttf", family: "Calibri" },
      ];
    case "linux":
      return [
        { path: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", family: "DejaVu Sans" },
        { path: "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", family: "Liberation Sans" },
        { path: "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", family: "Noto Sans" },
        { path: "/usr/share/fonts/noto/NotoSans-Regular.ttf", family: "Noto Sans" },
      ];
  }
}

let fontsRegistered = false;
let resolvedFamily = "sans-serif";

/**
 * Registers the best available font with the canvas runtime.
 *
 * Safe to call multiple times -- subsequent calls are no-ops.
 * Must be called before any canvas text rendering.
 */
export function registerFonts(): void {
  if (fontsRegistered) return;

  // Try system fonts first
  for (const { path, family } of getSystemFontPaths()) {
    if (existsSync(path)) {
      GlobalFonts.registerFromPath(path, family);
      console.log(`Registered font: ${family} from ${path}`);
      resolvedFamily = family;
      fontsRegistered = true;
      return;
    }
  }

  // Fall back to bundled Inter font
  if (existsSync(BUNDLED_FONT)) {
    GlobalFonts.registerFromPath(BUNDLED_FONT, "Inter");
    console.log("Registered bundled fallback font: Inter");
    resolvedFamily = "Inter";
    fontsRegistered = true;
    return;
  }

  console.warn("No suitable font found, falling back to system default sans-serif");
  fontsRegistered = true;
}

/** Returns the family name of the font that was actually registered. */
export function getResolvedFontFamily(): string {
  return resolvedFamily;
}
