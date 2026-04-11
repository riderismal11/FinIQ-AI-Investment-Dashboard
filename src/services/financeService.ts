import { Asset, FinancialMetrics, Portfolio, RiskProfile } from '../types';

type QuoteResponse = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  postMarketPrice?: number;
  preMarketPrice?: number;
};

type HistoryRow = {
  date: string;
  close?: number | null;
  adjClose?: number | null;
  adjclose?: number | null;
};

type PricePoint = { date: string; price: number };
type CacheEntry<T> = { ts: number; value: T };

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TRADING_DAYS_PER_YEAR = 252;
const MONTHLY_TRADING_DAYS = 21;
const DEFAULT_RISK_FREE_RATE = 0.045;

const quoteCache = new Map<string, CacheEntry<QuoteResponse>>();
const historyCache = new Map<string, CacheEntry<HistoryRow[]>>();
const priceSeriesCache = new Map<string, CacheEntry<PricePoint[]>>();
const warnedFallbacks = new Set<string>();
let riskFreeRateCache: CacheEntry<number> | null = null;

const ESTIMATED_YTD_RETURN_PERCENT: Record<string, number> = {
  BND: 3.2,
  AGG: 3.5,
  TLT: -1.2,
  SHY: 4.1,
  HYG: 8.4,
  LQD: 5.8,
  VTI: 9.8,
  VOO: 10.2,
  SPY: 10.1,
  IVV: 10.2,
  QQQ: 14.5,
  VGT: 16.2,
  XLK: 15.5,
  ARKK: 11.5,
  NVDA: 45.6,
  AAPL: 18.9,
  MSFT: 22.2,
  GOOGL: 15.8,
  AMZN: 18.3,
  META: 25.1,
  TSLA: 22.5,
  AMD: 25.7,
  NFLX: 25.9,
  JNJ: 1.2,
  PG: 8.7,
  SCHD: 10.5,
  VYM: 9.8,
  KO: 5.2,
  VEA: 6.3,
  VWO: 6.9,
  EEM: 6.7,
  EFA: 6.5,
  SMH: 28.1,
  GLD: 7.5,
  SLV: 8.3,
  IAU: 7.4,
  DBA: 5.1,
  USO: 6.2,
  'BTC-USD': 65.2,
  'ETH-USD': 52.8,
  'SOL-USD': 85.3,
  VNQ: 8.6,
};

const ESTIMATED_VOLATILITY_DECIMAL: Record<string, number> = {
  BND: 0.052,
  AGG: 0.048,
  TLT: 0.165,
  SHY: 0.025,
  HYG: 0.088,
  LQD: 0.072,
  VTI: 0.161,
  VOO: 0.158,
  SPY: 0.159,
  IVV: 0.158,
  QQQ: 0.228,
  VGT: 0.245,
  XLK: 0.235,
  ARKK: 0.455,
  NVDA: 0.551,
  AAPL: 0.255,
  MSFT: 0.248,
  GOOGL: 0.283,
  AMZN: 0.308,
  META: 0.382,
  TSLA: 0.653,
  AMD: 0.485,
  NFLX: 0.381,
  JNJ: 0.143,
  PG: 0.125,
  SCHD: 0.112,
  VYM: 0.118,
  KO: 0.115,
  VEA: 0.162,
  VWO: 0.205,
  EEM: 0.202,
  EFA: 0.165,
  SMH: 0.353,
  GLD: 0.132,
  SLV: 0.288,
  IAU: 0.131,
  DBA: 0.148,
  USO: 0.382,
  'BTC-USD': 0.725,
  'ETH-USD': 0.853,
  'SOL-USD': 1.052,
  VNQ: 0.225,
};

const BASE_PORTFOLIOS: Record<RiskProfile, Asset[]> = {
  conservative: [
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 0.35, type: 'Bond' },
    { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', allocation: 0.15, type: 'Bond' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', allocation: 0.1, type: 'Bond' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 0.15, type: 'Stock' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', allocation: 0.1, type: 'Stock' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', allocation: 0.05, type: 'Commodity' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', allocation: 0.05, type: 'Dividend' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', allocation: 0.05, type: 'Dividend' },
  ],
  moderate: [
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 0.25, type: 'Stock' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', allocation: 0.1, type: 'Stock' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', allocation: 0.15, type: 'Growth' },
    { symbol: 'VGT', name: 'Vanguard Information Technology ETF', allocation: 0.1, type: 'Growth' },
    { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', allocation: 0.1, type: 'International' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', allocation: 0.05, type: 'Commodity' },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 0.15, type: 'Bond' },
    { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', allocation: 0.1, type: 'Dividend' },
  ],
  aggressive: [
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', allocation: 0.2, type: 'Growth' },
    { symbol: 'SMH', name: 'VanEck Semiconductor ETF', allocation: 0.1, type: 'Growth' },
    { symbol: 'VGT', name: 'Vanguard Information Technology ETF', allocation: 0.1, type: 'Growth' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', allocation: 0.1, type: 'Growth' },
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 0.1, type: 'Growth' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', allocation: 0.1, type: 'Growth' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', allocation: 0.05, type: 'Growth' },
    { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', allocation: 0.15, type: 'Emerging' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', allocation: 0.05, type: 'Commodity' },
    { symbol: 'BTC-USD', name: 'Bitcoin', allocation: 0.05, type: 'Crypto' },
  ],
};

function warnOnce(key: string, message: string): void {
  if (warnedFallbacks.has(key)) return;
  warnedFallbacks.add(key);
  console.warn(message);
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToDigits(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function cacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.ts < FIVE_MINUTES_MS;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function getEstimatedVolatility(symbol: string): number {
  const normalized = safeSymbol(symbol);
  const estimated = ESTIMATED_VOLATILITY_DECIMAL[normalized];
  if (estimated !== undefined) {
    warnOnce(`volatility:${normalized}`, `[FinIQ] Using estimated volatility fallback for ${normalized}.`);
    return estimated;
  }

  const fallback = (seededRandom(`${normalized}:vol`) * 0.2) + 0.08;
  warnOnce(`volatility:${normalized}`, `[FinIQ] Using generated volatility fallback for ${normalized}.`);
  return fallback;
}

export async function getAssetYtdReturnPercent(symbol: string, signal?: AbortSignal): Promise<number> {
  const normalized = safeSymbol(symbol);
  const estimated = ESTIMATED_YTD_RETURN_PERCENT[normalized];
  if (estimated !== undefined) {
    warnOnce(`return:${normalized}`, `[FinIQ] Using estimated return fallback for ${normalized}.`);
    return estimated / 100;
  }

  const fallback = (seededRandom(`${normalized}:return`) * 30) - 10;
  warnOnce(`return:${normalized}`, `[FinIQ] Using generated return fallback for ${normalized}.`);
  return roundToDigits(fallback, 2) / 100;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function percentile(values: number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(probability * (sorted.length - 1))));
  return sorted[index];
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchQuote(symbol: string, signal?: AbortSignal): Promise<QuoteResponse> {
  const normalized = safeSymbol(symbol);
  const cached = quoteCache.get(normalized);
  if (cacheValid(cached)) {
    return cached.value;
  }

  const response = await fetch(`/api/finance/quote/${encodeURIComponent(normalized)}`, { signal });
  const payload = await parseJsonResponse<QuoteResponse & { error?: string }>(response).catch(() => ({ error: 'Failed to parse quote response' } as QuoteResponse & { error?: string }));
  if (!response.ok) {
    throw new Error(payload.error || `Failed to fetch quote for ${normalized}`);
  }

  quoteCache.set(normalized, { ts: Date.now(), value: payload });
  return payload;
}

export async function fetchHistory(
  symbol: string,
  period1: string,
  period2: string,
  signal?: AbortSignal,
  interval: '1d' | '1wk' | '1mo' = '1d',
): Promise<HistoryRow[]> {
  const normalized = safeSymbol(symbol);
  const key = `${normalized}:${period1}:${period2}:${interval}`;
  const cached = historyCache.get(key);
  if (cacheValid(cached)) {
    return cached.value;
  }

  const response = await fetch(
    `/api/finance/history/${encodeURIComponent(normalized)}?period1=${encodeURIComponent(period1)}&period2=${encodeURIComponent(period2)}&interval=${interval}`,
    { signal },
  );
  const payload = await parseJsonResponse<Array<HistoryRow> & { error?: string }>(response).catch(() => [] as Array<HistoryRow> & { error?: string });
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || `Failed to fetch history for ${normalized}`);
  }

  historyCache.set(key, { ts: Date.now(), value: payload as HistoryRow[] });
  return payload as HistoryRow[];
}

function assertAllocationTotal(assets: Asset[]): void {
  const totalPercent = assets.reduce((sum, asset) => sum + (asset.allocation * 100), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Portfolio allocations must sum to 100%. Received ${totalPercent.toFixed(4)}%.`);
  }
}

function normalizeAllocationsToOne(assets: Asset[]): Asset[] {
  if (assets.length === 0) return [];

  const sanitized = assets.map((asset) => ({
    ...asset,
    symbol: safeSymbol(asset.symbol),
    allocation: Number.isFinite(asset.allocation) ? asset.allocation : 0,
  }));

  const total = sanitized.reduce((sum, asset) => sum + asset.allocation, 0);
  if (!Number.isFinite(total) || total <= 0) {
    const equalAllocation = 1 / sanitized.length;
    const equalized = sanitized.map((asset, index) => ({
      ...asset,
      allocation: index === sanitized.length - 1
        ? 1 - (equalAllocation * (sanitized.length - 1))
        : equalAllocation,
    }));
    assertAllocationTotal(equalized);
    return equalized;
  }

  const normalized = sanitized.map((asset) => ({ ...asset, allocation: asset.allocation / total }));
  const drift = 1 - normalized.reduce((sum, asset) => sum + asset.allocation, 0);
  normalized[normalized.length - 1].allocation += drift;
  assertAllocationTotal(normalized);
  return normalized;
}

export function calculateExpectedGain(initialAmount: number, annualCagr: number, years: number): number {
  const amount = Number.isFinite(initialAmount) ? initialAmount : 0;
  const cagr = Number.isFinite(annualCagr) ? annualCagr : 0;
  const horizon = Number.isFinite(years) && years > 0 ? years : 0;
  const finalValue = amount * Math.pow(1 + cagr, horizon);
  return roundToCents(finalValue - amount);
}

export function recalculatePortfolio(assets: Asset[], totalAmount: number): Asset[] {
  const normalized = normalizeAllocationsToOne(assets);
  const safeAmount = Number.isFinite(totalAmount) ? totalAmount : 0;

  const withAmounts = normalized.map((asset) => ({
    ...asset,
    amount: roundToCents(asset.allocation * safeAmount),
  }));

  const amountDrift = roundToCents(safeAmount - withAmounts.reduce((sum, asset) => sum + (asset.amount || 0), 0));
  if (Math.abs(amountDrift) >= 0.01 && withAmounts.length > 0) {
    withAmounts[withAmounts.length - 1].amount = roundToCents((withAmounts[withAmounts.length - 1].amount || 0) + amountDrift);
  }

  assertAllocationTotal(withAmounts);
  return withAmounts;
}

export function upsertAssetAllocation(
  assets: Asset[],
  targetSymbol: string,
  targetAllocation: number,
  overrides?: Partial<Pick<Asset, 'name' | 'type'>>,
): Asset[] {
  const normalizedTarget = safeSymbol(targetSymbol);
  const clampedTarget = Math.max(0, Math.min(1, Number.isFinite(targetAllocation) ? targetAllocation : 0));
  const currentAssets = assets.map((asset) => ({ ...asset, symbol: safeSymbol(asset.symbol) }));

  const existingIndex = currentAssets.findIndex((asset) => asset.symbol === normalizedTarget);
  const existingAsset = existingIndex >= 0 ? currentAssets[existingIndex] : null;
  const remainingAssets = existingIndex >= 0
    ? currentAssets.filter((_, index) => index !== existingIndex)
    : currentAssets;

  const remainingTotal = remainingAssets.reduce((sum, asset) => sum + asset.allocation, 0);
  const remainingTarget = 1 - clampedTarget;

  const reweightedRemaining = remainingAssets.map((asset) => ({
    ...asset,
    allocation: remainingTotal > 0 ? asset.allocation * (remainingTarget / remainingTotal) : 0,
  }));

  const nextTargetAsset: Asset = existingAsset
    ? {
        ...existingAsset,
        allocation: clampedTarget,
        name: overrides?.name ?? existingAsset.name,
        type: overrides?.type ?? existingAsset.type,
      }
    : {
        symbol: normalizedTarget,
        name: overrides?.name ?? normalizedTarget,
        allocation: clampedTarget,
        type: overrides?.type ?? 'Custom',
      };

  return normalizeAllocationsToOne([...reweightedRemaining, nextTargetAsset]);
}

export const buildPortfolio = (
  amount: number,
  riskProfile: RiskProfile,
  horizon: number,
  customAssets?: Asset[],
): Portfolio => {
  const sourceAssets = customAssets?.length
    ? customAssets.map((asset) => ({ ...asset }))
    : BASE_PORTFOLIOS[riskProfile].map((asset) => ({ ...asset }));

  const normalizedAssets = recalculatePortfolio(sourceAssets, amount);

  return {
    assets: normalizedAssets,
    totalAmount: Number.isFinite(amount) ? amount : 0,
    timeHorizon: Number.isFinite(horizon) ? horizon : 0,
    riskProfile,
    isCustom: Boolean(customAssets?.length),
  };
};

export function calculateMetricsFallback(portfolio: Portfolio): FinancialMetrics {
  warnOnce('metrics:fallback', '[FinIQ] Using estimated portfolio metrics fallback instead of Yahoo Finance data.');

  let annualCagr = portfolio.assets.reduce((sum, asset) => {
    const annualReturn = asset.change !== undefined ? asset.change / 100 : roundToDigits((seededRandom(`${asset.symbol}:return`) * 30 - 10), 2) / 100;
    return sum + (asset.allocation * annualReturn);
  }, 0);

  annualCagr = Math.max(-0.20, Math.min(annualCagr, 0.25));

  const volatility = Math.sqrt(
    portfolio.assets.reduce((sum, asset) => {
      const estimatedVolatility = getEstimatedVolatility(asset.symbol);
      return sum + ((asset.allocation * estimatedVolatility) ** 2);
    }, 0),
  );

  const sharpeRatio = volatility > 0 ? (annualCagr - DEFAULT_RISK_FREE_RATE) / volatility : 0;
  const maxDrawdown = Math.min(0.95, volatility * 1.5);
  const monthlyVar = Math.max(0, 1.645 * (volatility / Math.sqrt(TRADING_DAYS_PER_YEAR)) * Math.sqrt(MONTHLY_TRADING_DAYS));

  return {
    expectedReturn: calculateExpectedGain(portfolio.totalAmount, annualCagr, portfolio.timeHorizon),
    annualCAGR: roundToDigits(annualCagr, 4),
    sharpeRatio: roundToDigits(sharpeRatio, 2),
    volatility: roundToDigits(volatility, 4),
    maxDrawdown: roundToDigits(maxDrawdown, 4),
    var95: roundToDigits(monthlyVar, 4),
  };
}

export const generateHistoricalData = (portfolio: Portfolio): { name: string; value: number; sp500: number }[] => {
  warnOnce('historical:fallback', '[FinIQ] Using generated historical data fallback instead of Yahoo Finance data.');
  const metrics = calculateMetricsFallback(portfolio);
  const totalValue = portfolio.totalAmount;
  const monthlyPortfolioReturn = Math.pow(1 + metrics.annualCAGR, 1 / 12) - 1;
  const monthlySp500Return = Math.pow(1 + 0.08, 1 / 12) - 1;
  const now = new Date();

  return Array.from({ length: 13 }, (_, offset) => {
    const monthsAgo = 12 - offset;
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const noise = (seededRandom(`historical:${portfolio.riskProfile}:${monthsAgo}`) - 0.5) * 0.015;
    const portfolioValue = totalValue * Math.pow(1 + monthlyPortfolioReturn + noise, offset);
    const benchmarkValue = totalValue * Math.pow(1 + monthlySp500Return + (noise * 0.7), offset);
    return {
      name: date.toLocaleDateString('en-US', { month: 'short' }),
      value: Math.round(portfolioValue),
      sp500: Math.round(benchmarkValue),
    };
  });
};

export const getRiskReturnData = (portfolio: Portfolio) => {
  warnOnce('scatter:fallback', '[FinIQ] Using estimated risk/return data fallback instead of Yahoo Finance data.');
  return portfolio.assets.map((asset) => ({
    name: asset.symbol,
    risk: getEstimatedVolatility(asset.symbol) * 100,
    return: asset.change !== undefined ? asset.change : roundToDigits((seededRandom(`${asset.symbol}:return`) * 30 - 10), 2),
    size: asset.allocation * 1000,
  }));
};

export async function getAdjCloseSeries(
  symbol: string,
  period1: string,
  period2: string,
  signal?: AbortSignal,
): Promise<PricePoint[]> {
  const normalized = safeSymbol(symbol);
  const key = `${normalized}:${period1}:${period2}`;
  const cached = priceSeriesCache.get(key);
  if (cacheValid(cached)) {
    return cached.value;
  }

  const history = await fetchHistory(normalized, period1, period2, signal);
  const points = history
    .map((row) => {
      const price = Number(row.adjClose ?? row.adjclose ?? row.close);
      const date = row.date ? new Date(row.date) : null;
      if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(price) || price <= 0) {
        return null;
      }
      return { date: toISODate(date), price };
    })
    .filter((point): point is PricePoint => point !== null)
    .sort((left, right) => left.date.localeCompare(right.date));

  const deduped = new Map<string, number>();
  for (const point of points) {
    deduped.set(point.date, point.price);
  }

  const normalizedPoints = [...deduped.entries()]
    .map(([date, price]) => ({ date, price }))
    .sort((left, right) => left.date.localeCompare(right.date));

  priceSeriesCache.set(key, { ts: Date.now(), value: normalizedPoints });
  return normalizedPoints;
}

function unionDates(seriesList: PricePoint[][]): string[] {
  if (seriesList.length === 0) return [];
  const allDates = new Set<string>();
  for (const series of seriesList) {
    for (const point of series) {
      allDates.add(point.date);
    }
  }
  return [...allDates].sort((left, right) => left.localeCompare(right));
}

export async function computeWeightedPortfolioDailyReturns(
  portfolio: Portfolio,
  period1: string,
  period2: string,
  signal?: AbortSignal,
): Promise<{ alignedDates: string[]; dailyReturns: number[] }> {
  const uniqueSymbols = [...new Set(portfolio.assets.map((asset) => safeSymbol(asset.symbol)))];
  if (uniqueSymbols.length === 0) {
    return { alignedDates: [], dailyReturns: [] };
  }

  const settled = await Promise.allSettled(
    uniqueSymbols.map(async (symbol) => ({
      symbol,
      series: await getAdjCloseSeries(symbol, period1, period2, signal),
    })),
  );

  const seriesBySymbol = new Map<string, PricePoint[]>();
  const includedSeries: PricePoint[][] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.series.length > 1) {
      seriesBySymbol.set(result.value.symbol, result.value.series);
      includedSeries.push(result.value.series);
    } else if (result.status === 'rejected') {
      console.warn(`[FinIQ] Yahoo history fetch failed: ${extractErrorMessage(result.reason)}`);
    }
  }

  const alignedDates = unionDates(includedSeries);
  if (alignedDates.length < 2) {
    return { alignedDates: [], dailyReturns: [] };
  }

  const priceMaps = new Map<string, Map<string, number>>();
  for (const [symbol, series] of seriesBySymbol.entries()) {
    priceMaps.set(symbol, new Map(series.map((point) => [point.date, point.price])));
  }

  const allocationBySymbol = portfolio.assets.reduce<Record<string, number>>((accumulator, asset) => {
    const symbol = safeSymbol(asset.symbol);
    accumulator[symbol] = (accumulator[symbol] ?? 0) + asset.allocation;
    return accumulator;
  }, {});

  const lastValidPrices = new Map<string, number>();
  for (const [symbol, priceMap] of priceMaps.entries()) {
    const firstPrice = priceMap.get(alignedDates[0]);
    if (typeof firstPrice === 'number' && firstPrice > 0) {
      lastValidPrices.set(symbol, firstPrice);
    }
  }

  const dailyReturns: number[] = [];
  for (let index = 1; index < alignedDates.length; index += 1) {
    let weightedReturn = 0;
    let activeWeight = 0;
    const currentDate = alignedDates[index];

    for (const symbol of seriesBySymbol.keys()) {
      const priceMap = priceMaps.get(symbol);
      const currentPrice = priceMap?.get(currentDate);
      const previousPrice = lastValidPrices.get(symbol);

      if (typeof currentPrice === 'number' && currentPrice > 0) {
        if (typeof previousPrice === 'number' && previousPrice > 0) {
          const symbolReturn = (currentPrice / previousPrice) - 1;
          const weight = allocationBySymbol[symbol] ?? 0;
          weightedReturn += weight * symbolReturn;
          activeWeight += weight;
        }
        lastValidPrices.set(symbol, currentPrice);
      }
    }

    dailyReturns.push(activeWeight > 0 ? weightedReturn / activeWeight : 0);
  }

  return { alignedDates, dailyReturns };
}

export async function getRiskFreeRateFromYahoo(signal?: AbortSignal): Promise<number> {
  if (cacheValid(riskFreeRateCache)) {
    return riskFreeRateCache.value;
  }

  try {
    const quote = await fetchQuote('^TNX', signal);
    const rawValue = [quote.regularMarketPrice, quote.postMarketPrice, quote.preMarketPrice]
      .find((value) => Number.isFinite(value));
    if (!Number.isFinite(rawValue)) {
      throw new Error('Risk-free rate quote unavailable');
    }

    const rate = rawValue > 15 ? rawValue / 1000 : rawValue > 1 ? rawValue / 100 : rawValue;
    if (!Number.isFinite(rate) || rate <= 0 || rate > 0.2) {
      throw new Error('Risk-free rate quote out of range');
    }

    riskFreeRateCache = { ts: Date.now(), value: rate };
    return rate;
  } catch {
    warnOnce('riskFreeRate', '[FinIQ] risk-free rate fallback used (default 4.5%).');
    riskFreeRateCache = { ts: Date.now(), value: DEFAULT_RISK_FREE_RATE };
    return DEFAULT_RISK_FREE_RATE;
  }
}

export async function calculatePortfolioMetricsFromYahoo(
  portfolio: Portfolio,
  opts?: { period1?: string; period2?: string; riskFreeRate?: number; signal?: AbortSignal },
): Promise<FinancialMetrics> {
  try {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 365 * 5);

    const period1 = opts?.period1 ?? toISODate(start);
    const period2 = opts?.period2 ?? toISODate(end);
    const riskFreeRate = opts?.riskFreeRate ?? await getRiskFreeRateFromYahoo(opts?.signal);
    const { alignedDates, dailyReturns } = await computeWeightedPortfolioDailyReturns(portfolio, period1, period2, opts?.signal);

    if (dailyReturns.length === 0 || alignedDates.length < 2) {
      throw new Error('Unable to calculate portfolio metrics from Yahoo Finance data.');
    }

    let normalizedValue = 1;
    const normalizedValues: number[] = [1];
    for (const dailyReturn of dailyReturns) {
      normalizedValue *= (1 + dailyReturn);
      normalizedValues.push(normalizedValue);
    }

    const firstDate = new Date(`${alignedDates[0]}T00:00:00Z`);
    const lastDate = new Date(`${alignedDates[alignedDates.length - 1]}T00:00:00Z`);
    const yearsObserved = Math.max(
      1 / 365.25,
      (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    let annualCagr = Math.pow(normalizedValues[normalizedValues.length - 1], 1 / yearsObserved) - 1;

    if (portfolio.riskProfile === 'conservative') {
      annualCagr = Math.max(0.03, Math.min(annualCagr, 0.075));
    } else if (portfolio.riskProfile === 'moderate') {
      annualCagr = Math.max(0.05, Math.min(annualCagr, 0.115));
    } else if (portfolio.riskProfile === 'aggressive') {
      annualCagr = Math.max(0.08, Math.min(annualCagr, 0.185));
    } else {
      annualCagr = Math.max(-0.20, Math.min(annualCagr, 0.25));
    }

    const volatility = stddev(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    let sharpeRatio = volatility > 0 ? (annualCagr - riskFreeRate) / volatility : 0;
    sharpeRatio = Math.max(-1.0, Math.min(sharpeRatio, 2.8));

    let peak = normalizedValues[0];
    let maxDrawdown = 0;
    for (const value of normalizedValues) {
      peak = Math.max(peak, value);
      const drawdown = (value / peak) - 1;
      maxDrawdown = Math.max(maxDrawdown, Math.abs(Math.min(drawdown, 0)));
    }

    const fifthPercentile = percentile(dailyReturns, 0.05);
    const dailyLoss = Math.max(0, -fifthPercentile);
    const monthlyVar = dailyLoss * Math.sqrt(MONTHLY_TRADING_DAYS);

    return {
      expectedReturn: calculateExpectedGain(portfolio.totalAmount, annualCagr, portfolio.timeHorizon),
      annualCAGR: roundToDigits(annualCagr, 4),
      sharpeRatio: roundToDigits(sharpeRatio, 2),
      volatility: roundToDigits(volatility, 4),
      maxDrawdown: roundToDigits(maxDrawdown, 4),
      var95: roundToDigits(monthlyVar, 4),
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    warnOnce('metrics:yahoo-unavailable', `[FinIQ] Yahoo portfolio metrics unavailable. Falling back to estimated metrics: ${extractErrorMessage(error)}`);
    return calculateMetricsFallback(portfolio);
  }
}
