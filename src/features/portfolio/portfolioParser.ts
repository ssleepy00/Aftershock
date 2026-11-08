/**
 * Portfolio Text & CSV Ingestion Parser
 *
 * This feature module provides resilient, deterministic parsing of unstructured portfolio text,
 * CSV files, brokerage exports, and markdown tables into structured ticker-weight allocations.
 *
 * Feature Overview & Use Cases:
 * 1. Multi-Format Ingestion: Parses CSV, TSV, colon-separated (`NVDA: 25`), equals-separated (`AAPL=15`),
 *    and space/pipe delimited lines exported from Bloomberg, FactSet, Fidelity, Schwab, or Robinhood.
 * 2. Noise & Header Filtering: Automatically discards comment lines starting with `#` and ignores
 *    standard financial column headers (e.g. TICKER, SHARES, ALLOCATION, WEIGHT, USD, PERCENT, CASH).
 * 3. Number Format Normalization: Handles decimal percentages, integers, and strips numbered lists
 *    like `1. NVDA, 25%` or `2) MSFT 15%`.
 * 4. Aggregation & Deduplication: Aggregates duplicate occurrences of the same ticker symbol
 *    and rounds weights to 2 decimal places.
 * 5. Diagnostic Call Logging: Logs each parser invocation and input payload length via structured
 *    informational telemetry for auditing and debugging.
 */

import { logFunctionCall } from '../../utils/logger.ts';

export const RESERVED_CSV_WORDS = new Set([
  'TICKER',
  'TICKERS',
  'WEIGHT',
  'WEIGHTS',
  'SYMBOL',
  'SYMBOLS',
  'ALLOCATION',
  'STOCK',
  'STOCKS',
  'HOLDING',
  'HOLDINGS',
  'TOTAL',
  'SUM',
  'CASH',
  'PORTFOLIO',
  'SHARES',
  'VALUE',
  'NAME',
  'COMPANY',
  'CSV',
  'USD',
  'PCT',
  'PERCENT',
]);

/**
 * Parsed portfolio item containing standard ticker symbol and numeric weight.
 */
export interface ParsedPortfolioHolding {
  ticker: string;
  weight: number;
}

/**
 * Parses raw textual input (CSV, markdown, table, or delimited text) into an array of
 * validated stock tickers and percentage weights.
 *
 * @param textContent Raw textual contents from a file upload, pasted string, or vision extraction.
 * @returns Array of parsed holdings with aggregated positive weights.
 */
export function parsePortfolioText(
  textContent: string
): ParsedPortfolioHolding[] {
  logFunctionCall('parsePortfolioText', {
    textLength: textContent ? textContent.length : 0,
    preview: textContent ? textContent.slice(0, 100) : '',
  });

  if (!textContent || typeof textContent !== 'string') return [];

  const totals = new Map<string, number>();
  const lines = textContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Strip leading list indices like "1." or "2)"
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '');

    // Match first 1-5 letter ticker token and the first signed number that follows on the same line
    const match = cleaned.match(
      /(?:^|["',;\t|\s])([A-Za-z]{1,5})(?:["',;\t|\s:=]+)(-?\d+(?:\.\d+)?)/
    );
    if (!match) continue;

    const ticker = match[1].toUpperCase();
    if (RESERVED_CSV_WORDS.has(ticker)) continue;

    const weight = parseFloat(match[2]);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1e12) continue;

    totals.set(ticker, Number(((totals.get(ticker) || 0) + weight).toFixed(4)));
  }

  const results = Array.from(totals.entries()).map(([ticker, weight]) => ({
    ticker,
    weight: Number(weight.toFixed(2)),
  }));

  logFunctionCall('parsePortfolioText:result', {
    holdingsCount: results.length,
    tickers: results.map((r) => r.ticker),
  });

  return results;
}
