/**
 * quotes/types.ts
 *
 * Shared TypeScript interfaces used across the quote system.
 * Each quote collection is stored as a JSON file in data/quotes/ and
 * deserialized into these types at runtime.
 */

/** A single quote with its text and attribution. */
export interface Quote {
  text: string;
  author: string;
  /** Optional category for organizing quotes (e.g., "Creativity", "Wisdom"). */
  category?: string;
  /** Optional tags for future filtering (not currently used in selection). */
  tags?: string[];
}

/**
 * A quote collection loaded from a single JSON file in data/quotes/.
 *
 * The `theme` field doubles as the Unsplash search query -- it should be
 * 2-4 descriptive words that capture the visual mood (e.g. "zen garden minimal nature").
 */
export interface QuoteSource {
  id: string;
  name: string;
  theme: string;
  quotes: Quote[];
}

/**
 * A quote that has been chosen for display, enriched with a back-reference
 * to the source collection it came from. This is the shape passed to the
 * renderer and stored as the current-quote state.
 */
export interface SelectedQuote extends Quote {
  source: QuoteSource;
}
