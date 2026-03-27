/**
 * canvas/textLayout.ts
 *
 * Calculates how to lay out a quote string on the wallpaper canvas.
 *
 * The algorithm:
 *   1. Start at MAX_FONT_SIZE and attempt to word-wrap the text within
 *      70% of the canvas width.
 *   2. If the result exceeds MAX_LINES or MAX_TEXT_HEIGHT_RATIO of the
 *      canvas height, reduce the font size by FONT_STEP and retry.
 *   3. Vertically center the text block slightly above the midpoint
 *      (VERTICAL_CENTER_RATIO = 0.42) so it feels balanced with the
 *      attribution line below.
 */

import type { SKRSContext2D } from "@napi-rs/canvas";

/** The computed layout passed to the renderer for drawing. */
export interface TextLayout {
  /** The quote text broken into wrapped lines. */
  lines: string[];
  /** The font size (in px) that fit within constraints. */
  fontSize: number;
  /** The Y coordinate where the first line should be drawn. */
  startY: number;
  /** The distance in px between each line's baseline. */
  lineHeight: number;
}

// --- Layout tuning constants ---
const MIN_FONT_SIZE = 54;
const MAX_FONT_SIZE = 96;
const FONT_STEP = 6;
const MAX_LINES = 8;
const LINE_HEIGHT_MULTIPLIER = 1.6;
/** Fraction of canvas width available for text (70%). */
const TEXT_WIDTH_RATIO = 0.7;
/** Vertical center target -- slightly above true center for visual balance. */
const VERTICAL_CENTER_RATIO = 0.42;
/** Maximum fraction of canvas height the text block may occupy. */
const MAX_TEXT_HEIGHT_RATIO = 0.55;

/**
 * Word-wraps text into lines that fit within maxWidth.
 * Uses canvas measureText() for accurate pixel-width calculations.
 */
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Determines the optimal font size, line breaks, and vertical position
 * for rendering a quote on a canvas of the given dimensions.
 */
export function layoutQuoteText(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  canvasWidth: number,
  canvasHeight: number
): TextLayout {
  const textBoxWidth = canvasWidth * TEXT_WIDTH_RATIO;
  let fontSize = MAX_FONT_SIZE;
  let lines: string[] = [];
  let lineHeight = 0;
  let totalTextHeight = 0;

  // Shrink font size until the text fits within the constraints
  while (fontSize >= MIN_FONT_SIZE) {
    ctx.font = `500 ${fontSize}px "${fontFamily}", sans-serif`;
    lines = wrapText(ctx, text, textBoxWidth);
    lineHeight = fontSize * LINE_HEIGHT_MULTIPLIER;
    totalTextHeight = lines.length * lineHeight;

    if (
      lines.length <= MAX_LINES &&
      totalTextHeight < canvasHeight * MAX_TEXT_HEIGHT_RATIO
    ) {
      break;
    }

    fontSize -= FONT_STEP;
  }

  // Position the text block so its vertical center sits at VERTICAL_CENTER_RATIO
  const startY =
    canvasHeight * VERTICAL_CENTER_RATIO - totalTextHeight / 2;

  return { lines, fontSize, startY, lineHeight };
}
