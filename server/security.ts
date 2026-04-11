/**
 * Security utilities: input validation, sanitization, and prompt-boundary helpers.
 * Used by the server to validate finance queries and sanitize AI inputs.
 */

import {
  MAX_SYMBOL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_ITEMS,
  MAX_ASSET_NAME_LENGTH,
  MAX_ASSET_TYPE_LENGTH,
  MAX_PORTFOLIO_ASSETS,
  MAX_TIME_HORIZON_YEARS,
  MAX_DATE_RANGE_DAYS,
  MIN_INVESTMENT_AMOUNT,
  MAX_INVESTMENT_AMOUNT,
} from './constants.js';

// Improved ticker regex - prevents consecutive dots and must start/end with alphanumeric
const TICKER_REGEX = /^[\^A-Z0-9][\^A-Z0-9.\-]{0,10}[\^A-Z0-9]$|^\^?[A-Z0-9]{1,12}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface SanitizedHistoryItem {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export interface SanitizedPortfolioAsset {
  symbol: string;
  name: string;
  allocation: number;
  type?: string;
  change?: number;
}

export interface SanitizedPortfolio {
  assets: SanitizedPortfolioAsset[];
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  totalAmount: number;
  timeHorizon: number;
  isCustom?: boolean;
}

export interface SanitizedMetrics {
  expectedReturn: number;
  annualCAGR: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  var95: number;
}

function sanitizePlainText(input: string, maxLength = MAX_MESSAGE_LENGTH): string {
  return input
    .normalize('NFKC')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeLabel(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return sanitizePlainText(input, maxLength);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// Ticker format: 1-12 chars, letters, ^, numbers, hyphen, dot (e.g. BTC-USD, BRK.B, ^GSPC)
export function validateSymbol(symbol: unknown): { ok: true; symbol: string } | { ok: false; error: string } {
  if (typeof symbol !== 'string') return { ok: false, error: 'Invalid symbol' };
  const trimmed = sanitizePlainText(symbol, MAX_SYMBOL_LENGTH).toUpperCase();
  if (!trimmed) return { ok: false, error: 'Symbol required' };
  if (trimmed.length > MAX_SYMBOL_LENGTH) return { ok: false, error: 'Symbol too long' };
  if (TICKER_REGEX.test(trimmed)) return { ok: true, symbol: trimmed };
  return { ok: false, error: 'Invalid symbol format' };
}

/** Validate period query params (YYYY-MM-DD) */
export function validatePeriod(period1: unknown, period2: unknown): { ok: true; p1: string; p2: string } | { ok: false; error: string } {
  const p1 = typeof period1 === 'string' ? period1.trim() : '';
  const p2 = typeof period2 === 'string' ? period2.trim() : '';
  if (!p1 || !p2) return { ok: false, error: 'period1 and period2 required' };
  if (!DATE_REGEX.test(p1) || !DATE_REGEX.test(p2)) return { ok: false, error: 'Invalid date format (use YYYY-MM-DD)' };
  const d1 = new Date(`${p1}T00:00:00Z`);
  const d2 = new Date(`${p2}T00:00:00Z`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return { ok: false, error: 'Invalid date' };
  if (d1 > d2) return { ok: false, error: 'period1 must be before period2' };
  const maxRangeDays = 365 * 15;
  const days = (d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000);
  if (days > maxRangeDays) return { ok: false, error: 'Date range too large' };
  return { ok: true, p1, p2 };
}

const ALLOWED_INTERVALS = new Set(['1d', '1wk', '1mo']);

export function validateInterval(interval: unknown): '1d' | '1wk' | '1mo' {
  if (typeof interval !== 'string') return '1d';
  const value = interval.toLowerCase();
  return ALLOWED_INTERVALS.has(value) ? (value as '1d' | '1wk' | '1mo') : '1d';
}

export function sanitizeMessage(input: unknown): { ok: true; message: string } | { ok: false; error: string } {
  if (typeof input !== 'string') return { ok: false, error: 'Message must be a string' };
  const message = sanitizePlainText(input, MAX_MESSAGE_LENGTH);
  if (!message) return { ok: false, error: 'Message cannot be empty' };
  return { ok: true, message };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /disregard\s+(your\s+)?(instructions|prompt)/i,
  /new\s+instructions\s*:/i,
  /system\s*:\s*/i,
  /\[INST\]|\[\/INST\]/i,
  /<\|[^|]+\|>/g,
  /act\s+as\s+(a\s+)?(different|new)/i,
  /pretend\s+you\s+are/i,
  /developer\s+mode/i,
  /jailbreak/i,
];

export function hasPromptInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

export function wrapUserInput(message: string): string {
  return `[USER_INPUT]: ${message}`;
}

function sanitizeHistoryText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const text = input
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
  return text || null;
}

export function sanitizeHistory(input: unknown): SanitizedHistoryItem[] {
  if (!Array.isArray(input)) return [];

  const sanitizedItems: SanitizedHistoryItem[] = [];

  for (const item of input.slice(-MAX_HISTORY_ITEMS)) {
    if (!item || typeof item !== 'object') continue;

    const role = (item as { role?: unknown }).role;
    const parts = (item as { parts?: unknown }).parts;

    if ((role !== 'user' && role !== 'model') || !Array.isArray(parts) || parts.length === 0) {
      continue;
    }

    const firstPart = parts[0];
    if (!firstPart || typeof firstPart !== 'object') continue;

    const rawText = sanitizeHistoryText((firstPart as { text?: unknown }).text);
    if (!rawText) continue;

    if (role === 'user' && hasPromptInjection(rawText)) continue;

    sanitizedItems.push({
      role,
      parts: [{ text: role === 'user' ? wrapUserInput(rawText) : rawText }],
    });
  }

  return sanitizedItems;
}

export function validateLanguage(lang: unknown): 'en' | 'es' {
  return lang === 'es' ? 'es' : 'en';
}

export function validateRiskProfile(value: unknown): 'conservative' | 'moderate' | 'aggressive' | null {
  return value === 'conservative' || value === 'moderate' || value === 'aggressive' ? value : null;
}

export function validatePortfolioPayload(input: unknown): { ok: true; portfolio: SanitizedPortfolio } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid portfolio payload' };
  }

  const raw = input as Record<string, unknown>;
  const riskProfile = validateRiskProfile(raw.riskProfile);
  const totalAmount = Number(raw.totalAmount);
  const timeHorizon = Number(raw.timeHorizon);
  const assets = Array.isArray(raw.assets) ? raw.assets : [];

  if (!riskProfile) return { ok: false, error: 'Invalid risk profile' };
  if (!Number.isFinite(totalAmount) || totalAmount < MIN_INVESTMENT_AMOUNT || totalAmount > MAX_INVESTMENT_AMOUNT) {
    return { ok: false, error: `Portfolio amount must be between $${MIN_INVESTMENT_AMOUNT} and $${MAX_INVESTMENT_AMOUNT}` };
  }
  if (!Number.isFinite(timeHorizon) || timeHorizon < 0 || timeHorizon > MAX_TIME_HORIZON_YEARS) {
    return { ok: false, error: `Time horizon must be between 0 and ${MAX_TIME_HORIZON_YEARS} years` };
  }
  if (assets.length === 0 || assets.length > MAX_PORTFOLIO_ASSETS) return { ok: false, error: 'Invalid asset list' };

  const sanitizedAssets: SanitizedPortfolioAsset[] = [];

  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') return { ok: false, error: 'Invalid asset entry' };
    const rawAsset = asset as Record<string, unknown>;
    const symbolResult = validateSymbol(rawAsset.symbol);
    if (!symbolResult.ok) {
      return { ok: false, error: 'error' in symbolResult ? symbolResult.error : 'Invalid symbol' };
    }

    const allocation = Number(rawAsset.allocation);
    if (!Number.isFinite(allocation) || allocation < 0 || allocation > 1) {
      return { ok: false, error: `Invalid allocation for ${symbolResult.symbol}` };
    }

    const change = rawAsset.change === undefined ? undefined : Number(rawAsset.change);
    if (change !== undefined && !Number.isFinite(change)) {
      return { ok: false, error: `Invalid change for ${symbolResult.symbol}` };
    }

    sanitizedAssets.push({
      symbol: symbolResult.symbol,
      name: sanitizeLabel(rawAsset.name, MAX_ASSET_NAME_LENGTH) || symbolResult.symbol,
      allocation,
      type: sanitizeLabel(rawAsset.type, MAX_ASSET_TYPE_LENGTH) || undefined,
      change,
    });
  }

  const totalAllocation = sanitizedAssets.reduce((sum, asset) => sum + asset.allocation, 0);
  if (Math.abs(totalAllocation - 1) > 0.0001) {
    return { ok: false, error: 'Portfolio allocations must sum to 100%' };
  }

  return {
    ok: true,
    portfolio: {
      assets: sanitizedAssets,
      riskProfile,
      totalAmount,
      timeHorizon,
      isCustom: raw.isCustom === true,
    },
  };
}

export function validateMetricsPayload(input: unknown): { ok: true; metrics: SanitizedMetrics } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid metrics payload' };
  }

  const raw = input as Record<string, unknown>;
  const metrics: SanitizedMetrics = {
    expectedReturn: Number(raw.expectedReturn),
    annualCAGR: Number(raw.annualCAGR),
    sharpeRatio: Number(raw.sharpeRatio),
    volatility: Number(raw.volatility),
    maxDrawdown: Number(raw.maxDrawdown),
    var95: Number(raw.var95),
  };

  if (!Object.values(metrics).every(isFiniteNumber)) {
    return { ok: false, error: 'Metrics must be finite numbers' };
  }

  return { ok: true, metrics };
}
