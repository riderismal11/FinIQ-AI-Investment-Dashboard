/**
 * Utility functions for the FinIQ server.
 */

/**
 * Extracts a human-readable message from an unknown error object.
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Determines if an error corresponds to a "Symbol Not Found" scenario.
 */
export function isSymbolNotFoundError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('no alpaca') ||
    message.includes('no data') ||
    message.includes('404') ||
    message.includes('symbol may be delisted') ||
    message.includes('could not find') ||
    message.includes('unsupported') ||
    message.includes('unknown symbol')
  );
}

/**
 * Parses a host from an origin header.
 */
export function getOriginHost(originHeader: string): string | null {
  try {
    return new URL(originHeader).host;
  } catch {
    return null;
  }
}

/**
 * Checks if a response body contains a specific secret string.
 */
export function responseContainsSecret(body: unknown, secret: string | null): boolean {
  if (!secret) return false;
  try {
    if (typeof body === 'string') return body.includes(secret);
    return JSON.stringify(body).includes(secret);
  } catch {
    return false;
  }
}
