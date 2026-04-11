/**
 * Financial utility functions for calculations and data formatting.
 */

export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundToDigits(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Deterministic seeded random number generator.
 * Used for consistent fallback data generation.
 */
export function seededRandom(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function safeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Standard Deviation calculation for a series of values.
 */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Percentile calculation for a series of values.
 */
export function percentile(values: number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(probability * (sorted.length - 1))));
  return sorted[index];
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
