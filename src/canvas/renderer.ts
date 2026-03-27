/**
 * canvas/renderer.ts
 *
 * The core rendering pipeline that composites a wallpaper from:
 *   1. An Unsplash background photo (resized, blurred, darkened via sharp)
 *   2. The quote text (word-wrapped and centered via @napi-rs/canvas)
 *   3. An author attribution line
 *   4. A subtle date watermark in the bottom-right corner
 *
 * Returns a PNG buffer that can be written to disk and set as wallpaper.
 */

import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import type { AppConfig } from "../config.js";
import type { SelectedQuote } from "../quotes/types.js";
import { registerFonts, getResolvedFontFamily } from "./fonts.js";
import { layoutQuoteText } from "./textLayout.js";
import { getTodayString } from "../utils/date.js";

/** Optional overrides for the output dimensions (used by iPhone export). */
export interface RenderOptions {
  width?: number;
  height?: number;
}

/**
 * Renders a complete wallpaper image and returns it as a PNG buffer.
 *
 * @param config       - App configuration (resolution, font, background settings)
 * @param quote        - The selected quote to render
 * @param backgroundPath - Path to the downloaded Unsplash background image
 * @param options      - Optional width/height overrides (e.g. for iPhone export)
 */
export async function renderWallpaper(
  config: AppConfig,
  quote: SelectedQuote,
  backgroundPath: string,
  options?: RenderOptions
): Promise<Buffer> {
  registerFonts();

  const width = options?.width ?? config.resolution.width;
  const height = options?.height ?? config.resolution.height;
  const { darkenOpacity, blurSigma } = config.background;

  // Step 1: Prepare the background photo -- resize to fill, optionally blur,
  // then overlay a semi-transparent black rectangle to darken it.
  const background = await sharp(backgroundPath)
    .resize(width, height, { fit: "cover" })
    .blur(blurSigma > 0 ? blurSigma : undefined)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="black" opacity="${darkenOpacity}"/>
          </svg>`
        ),
        blend: "over",
      },
    ])
    .toBuffer();

  // Step 2: Create a canvas and paint the processed background onto it.
  // We convert via raw RGBA pixels because @napi-rs/canvas doesn't
  // natively load image buffers.
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const { data, info } = await sharp(background)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const imageData = ctx.createImageData(info.width, info.height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);

  // Step 3: Calculate text layout (font size, line breaks, vertical position)
  const layout = layoutQuoteText(
    ctx,
    quote.text,
    config.font.quote,
    width,
    height
  );

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const centerX = width / 2;

  // Add a subtle text shadow for readability against any background
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Step 4: Draw the quote text lines
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `500 ${layout.fontSize}px "${config.font.quote}", sans-serif`;

  for (let i = 0; i < layout.lines.length; i++) {
    const y = layout.startY + i * layout.lineHeight;
    ctx.fillText(layout.lines[i], centerX, y);
  }

  // Step 5: Draw the author attribution below the quote
  const attributionY =
    layout.startY + layout.lines.length * layout.lineHeight + 40;
  ctx.font = `italic 36px "${config.font.attribution}", sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.shadowBlur = 2;
  ctx.fillText(`— ${quote.author}`, centerX, attributionY);

  // Step 6: Draw a small date watermark in the bottom-right corner
  const fontFamily = getResolvedFontFamily();
  ctx.font = `18px "${fontFamily}", sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = "right";
  ctx.fillText(getTodayString(), width - 40, height - 30);

  // Export the finished canvas as a PNG buffer
  return Buffer.from(canvas.toBuffer("image/png"));
}
