/**
 * quotes/loader.ts
 *
 * Reads quote collection JSON files from data/quotes/, filters to the
 * user's active sources, and provides two selection strategies:
 *
 *   - selectDailyQuote()  -- deterministic, same quote for a given date
 *   - selectRandomQuote() -- truly random, used by the "shuffle" button
 */

import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import type { QuoteSource, SelectedQuote } from "./types.js";
import type { AppConfig } from "../config.js";
import { getTodayString, dateToHash } from "../utils/date.js";

/**
 * Loads all quote source files whose IDs appear in config.activeSources.
 * Each JSON file in data/quotes/ must conform to the QuoteSource interface.
 */
export function loadQuoteSources(config: AppConfig): QuoteSource[] {
  const quotesDir = resolve(config.projectRoot, "data", "quotes");
  const files = readdirSync(quotesDir).filter((f) => f.endsWith(".json"));

  const sources: QuoteSource[] = [];
  for (const file of files) {
    const source: QuoteSource = JSON.parse(
      readFileSync(resolve(quotesDir, file), "utf-8")
    );
    if (config.activeSources.includes(source.id)) {
      sources.push(source);
    }
  }

  return sources;
}

/**
 * Selects a quote deterministically based on today's date.
 *
 * All active quotes are flattened into a single array, then an index is
 * derived by hashing the date string. This means every device running
 * the app on the same day will pick the same quote (given the same config).
 */
export function selectDailyQuote(sources: QuoteSource[]): SelectedQuote {
  const allQuotes = sources.flatMap((source) =>
    source.quotes.map((q) => ({ ...q, source }))
  );

  if (allQuotes.length === 0) {
    throw new Error("No quotes found in active sources");
  }

  const dateStr = getTodayString();
  const hash = dateToHash(dateStr);
  const index = hash % allQuotes.length;

  return allQuotes[index];
}

/** Selects a random quote from all active sources (used by the shuffle feature). */
export function selectRandomQuote(sources: QuoteSource[]): SelectedQuote {
  const allQuotes = sources.flatMap((source) =>
    source.quotes.map((q) => ({ ...q, source }))
  );

  if (allQuotes.length === 0) {
    throw new Error("No quotes found in active sources");
  }

  const index = Math.floor(Math.random() * allQuotes.length);
  return allQuotes[index];
}
