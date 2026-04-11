import YahooFinance from 'yahoo-finance2';
import { serverConfig, type MarketDataRuntimeConfig } from './config.js';

// In-memory cache for market data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for quotes
const CACHE_TTL_HISTORY_MS = 60 * 60 * 1000; // 1 hour for historical data

class MarketDataCache {
  private quoteCache = new Map<string, CacheEntry<MarketDataQuote>>();
  private historyCache = new Map<string, CacheEntry<MarketDataHistoryResult>>();

  private getCacheKey(symbol: string, ...params: string[]): string {
    return params.length > 0 ? `${symbol}:${params.join(':')}` : symbol;
  }

  getQuote(symbol: string): MarketDataQuote | null {
    const entry = this.quoteCache.get(symbol);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
    if (entry) this.quoteCache.delete(symbol); // Expired
    return null;
  }

  setQuote(symbol: string, data: MarketDataQuote): void {
    this.quoteCache.set(symbol, { data, timestamp: Date.now() });
  }

  getHistory(symbol: string, period1: string, period2: string, interval: string): MarketDataHistoryResult | null {
    const key = this.getCacheKey(symbol, period1, period2, interval);
    const entry = this.historyCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_HISTORY_MS) {
      return entry.data;
    }
    if (entry) this.historyCache.delete(key); // Expired
    return null;
  }

  setHistory(symbol: string, period1: string, period2: string, interval: string, data: MarketDataHistoryResult): void {
    const key = this.getCacheKey(symbol, period1, period2, interval);
    this.historyCache.set(key, { data, timestamp: Date.now() });
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.quoteCache) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        this.quoteCache.delete(key);
      }
    }
    for (const [key, entry] of this.historyCache) {
      if (now - entry.timestamp >= CACHE_TTL_HISTORY_MS) {
        this.historyCache.delete(key);
      }
    }
  }
}

const marketDataCache = new MarketDataCache();

// Cleanup every 10 minutes
setInterval(() => marketDataCache.cleanup(), 10 * 60 * 1000);

type NormalizedHistoryQuote = {
  date?: Date | string;
  close?: number | null;
  adjClose?: number | null;
  adjclose?: number | null;
};

type AlpacaStockTradeResponse = {
  trade?: {
    p?: number;
  };
};

type AlpacaStockQuoteResponse = {
  quote?: {
    ap?: number;
    bp?: number;
  };
};

type AlpacaStockBarsResponse = {
  bars?: Array<{
    t?: string;
    c?: number;
  }>;
};

type AlpacaCryptoQuoteResponse = {
  quotes?: Record<string, {
    ap?: number;
    bp?: number;
  }>;
};

type AlpacaCryptoBarsResponse = {
  bars?:
    | Record<string, Array<{
        t?: string;
        c?: number;
      }>>
    | Array<{
        t?: string;
        c?: number;
      }>;
};

export type MarketDataQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  postMarketPrice?: number;
  preMarketPrice?: number;
  source: 'alpaca' | 'yahoo';
  isLive: boolean;
  market: string;
};

export type MarketDataHistoryRow = {
  date: string;
  close?: number | null;
  adjClose?: number | null;
  adjclose?: number | null;
};

export type MarketDataHistoryResult = {
  rows: MarketDataHistoryRow[];
  source: 'alpaca' | 'yahoo';
  isLive: boolean;
  market: string;
};

interface MarketDataProvider {
  readonly name: 'alpaca' | 'yahoo';
  getQuote(symbol: string): Promise<MarketDataQuote>;
  getHistory(symbol: string, period1: string, period2: string, interval: '1d' | '1wk' | '1mo'): Promise<MarketDataHistoryResult>;
}

const ALPACA_BASE_URL = 'https://data.alpaca.markets';
const ALPACA_CRYPTO_QUOTES = new Set(['USD', 'USDT', 'USDC', 'BTC', 'ETH']);

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toEpochSeconds(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}

function toIsoDateTime(isoDate: string, endOfDay = false): string {
  return `${isoDate}T${endOfDay ? '23:59:59Z' : '00:00:00Z'}`;
}

function normalizeDate(raw: string | Date | undefined): string | null {
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isCryptoLikeSymbol(symbol: string): boolean {
  const match = symbol.match(/^([A-Z0-9]+)-([A-Z0-9]+)$/);
  if (!match) return false;
  return ALPACA_CRYPTO_QUOTES.has(match[2]);
}

function mapAlpacaTimeframe(interval: '1d' | '1wk' | '1mo'): '1Day' | '1Week' | '1Month' {
  if (interval === '1wk') return '1Week';
  if (interval === '1mo') return '1Month';
  return '1Day';
}

function midpoint(ask?: number, bid?: number): number | null {
  if (Number.isFinite(ask) && Number.isFinite(bid)) {
    return ((ask ?? 0) + (bid ?? 0)) / 2;
  }
  if (Number.isFinite(ask)) return ask ?? null;
  if (Number.isFinite(bid)) return bid ?? null;
  return null;
}

function parseAlpacaSymbol(symbol: string, cryptoFeed: string): { providerSymbol: string; market: string; assetClass: 'stock' | 'crypto' } {
  if (symbol.startsWith('^') || symbol.includes('=')) {
    throw new Error(`Symbol ${symbol} is not supported by Alpaca free market data`);
  }

  if (isCryptoLikeSymbol(symbol)) {
    const [base, quote] = symbol.split('-');
    return {
      providerSymbol: `${base}/${quote}`,
      market: `alpaca-${cryptoFeed}-crypto`,
      assetClass: 'crypto',
    };
  }

  return {
    providerSymbol: symbol,
    market: `alpaca-${serverConfig.marketData.alpacaStockFeed}-stocks`,
    assetClass: 'stock',
  };
}

class YahooMarketDataProvider implements MarketDataProvider {
  readonly name = 'yahoo' as const;
  private readonly client = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

  async getQuote(symbol: string): Promise<MarketDataQuote> {
    const quote = await this.client.quote(symbol);
    if (!quote) {
      throw new Error(`Could not find ${symbol} via Yahoo Finance`);
    }

    return {
      symbol,
      shortName: quote.shortName,
      longName: quote.longName,
      regularMarketPrice: quote.regularMarketPrice,
      postMarketPrice: quote.postMarketPrice,
      preMarketPrice: quote.preMarketPrice,
      source: 'yahoo',
      isLive: false,
      market: 'yahoo-global',
    };
  }

  async getHistory(symbol: string, period1: string, period2: string, interval: '1d' | '1wk' | '1mo'): Promise<MarketDataHistoryResult> {
    const chart = await this.client.chart(symbol, {
      period1: toEpochSeconds(period1),
      period2: toEpochSeconds(period2),
      interval,
    });

    const quotes = Array.isArray((chart as { quotes?: NormalizedHistoryQuote[] }).quotes)
      ? (chart as { quotes: NormalizedHistoryQuote[] }).quotes
      : [];

    const rows = quotes
      .filter((quote) => quote?.date)
      .sort((left, right) => new Date(left.date as string | Date).getTime() - new Date(right.date as string | Date).getTime())
      .map((quote) => {
        const adjustedClose = quote.adjclose ?? quote.adjClose ?? null;
        return {
          date: new Date(quote.date as string | Date).toISOString(),
          close: quote.close ?? null,
          adjClose: adjustedClose,
          adjclose: adjustedClose,
        };
      });

    return {
      rows,
      source: 'yahoo',
      isLive: false,
      market: 'yahoo-global',
    };
  }
}

class AlpacaMarketDataProvider implements MarketDataProvider {
  readonly name = 'alpaca' as const;

  constructor(private readonly config: MarketDataRuntimeConfig) {}

  private async requestJson<T>(pathname: string, params: Record<string, string>): Promise<T> {
    const url = new URL(pathname, ALPACA_BASE_URL);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': this.config.alpacaApiKey ?? '',
        'APCA-API-SECRET-KEY': this.config.alpacaSecretKey ?? '',
      },
    });

    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    if (raw) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        payload = {};
      }
    }

    if (!response.ok) {
      const message = typeof payload.message === 'string'
        ? payload.message
        : typeof payload.code === 'string'
          ? payload.code
          : raw || `HTTP ${response.status}`;
      throw new Error(`Alpaca request failed: ${message}`);
    }

    return payload as T;
  }

  async getQuote(symbol: string): Promise<MarketDataQuote> {
    const parsed = parseAlpacaSymbol(symbol, this.config.alpacaCryptoFeed);

    if (parsed.assetClass === 'crypto') {
      const payload = await this.requestJson<AlpacaCryptoQuoteResponse>(
        `/v1beta3/crypto/${this.config.alpacaCryptoFeed}/latest/quotes`,
        { symbols: parsed.providerSymbol },
      );

      const quote = payload.quotes?.[parsed.providerSymbol];
      const price = midpoint(quote?.ap, quote?.bp);
      if (!Number.isFinite(price)) {
        throw new Error(`No Alpaca quote available for ${symbol}`);
      }

      return {
        symbol,
        shortName: symbol,
        longName: symbol,
        regularMarketPrice: price ?? undefined,
        source: 'alpaca',
        isLive: true,
        market: parsed.market,
      };
    }

    const tradePayload = await this.requestJson<AlpacaStockTradeResponse>(
      `/v2/stocks/${encodeURIComponent(parsed.providerSymbol)}/trades/latest`,
      { feed: this.config.alpacaStockFeed },
    );
    const tradePrice = tradePayload.trade?.p;

    if (Number.isFinite(tradePrice)) {
      return {
        symbol,
        shortName: symbol,
        longName: symbol,
        regularMarketPrice: tradePrice,
        source: 'alpaca',
        isLive: true,
        market: parsed.market,
      };
    }

    const quotePayload = await this.requestJson<AlpacaStockQuoteResponse>(
      `/v2/stocks/${encodeURIComponent(parsed.providerSymbol)}/quotes/latest`,
      { feed: this.config.alpacaStockFeed },
    );
    const quotePrice = midpoint(quotePayload.quote?.ap, quotePayload.quote?.bp);
    if (!Number.isFinite(quotePrice)) {
      throw new Error(`No Alpaca price available for ${symbol}`);
    }

    return {
      symbol,
      shortName: symbol,
      longName: symbol,
      regularMarketPrice: quotePrice ?? undefined,
      source: 'alpaca',
      isLive: true,
      market: parsed.market,
    };
  }

  async getHistory(symbol: string, period1: string, period2: string, interval: '1d' | '1wk' | '1mo'): Promise<MarketDataHistoryResult> {
    const parsed = parseAlpacaSymbol(symbol, this.config.alpacaCryptoFeed);
    const timeframe = mapAlpacaTimeframe(interval);

    if (parsed.assetClass === 'crypto') {
      const payload = await this.requestJson<AlpacaCryptoBarsResponse>(
        `/v1beta3/crypto/${this.config.alpacaCryptoFeed}/bars`,
        {
          symbols: parsed.providerSymbol,
          timeframe,
          start: toIsoDateTime(period1),
          end: toIsoDateTime(period2, true),
          sort: 'asc',
          limit: '10000',
        },
      );

      const rawBars = Array.isArray(payload.bars)
        ? payload.bars
        : payload.bars?.[parsed.providerSymbol] ?? [];

      const rows = rawBars
        .map((bar): MarketDataHistoryRow | null => {
          const date = normalizeDate(bar.t);
          if (!date || !Number.isFinite(bar.c)) return null;
          return {
            date,
            close: bar.c ?? null,
            adjClose: bar.c ?? null,
            adjclose: bar.c ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      return {
        rows,
        source: 'alpaca',
        isLive: true,
        market: parsed.market,
      };
    }

    const payload = await this.requestJson<AlpacaStockBarsResponse>(
      `/v2/stocks/${encodeURIComponent(parsed.providerSymbol)}/bars`,
      {
        timeframe,
        start: toIsoDateTime(period1),
        end: toIsoDateTime(period2, true),
        adjustment: 'all',
        feed: this.config.alpacaStockFeed,
        sort: 'asc',
        limit: '10000',
      },
    );

    const rows = (payload.bars ?? [])
      .map((bar): MarketDataHistoryRow | null => {
        const date = normalizeDate(bar.t);
        if (!date || !Number.isFinite(bar.c)) return null;
        return {
          date,
          close: bar.c ?? null,
          adjClose: bar.c ?? null,
          adjclose: bar.c ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return {
      rows,
      source: 'alpaca',
      isLive: true,
      market: parsed.market,
    };
  }
}

class MarketDataService {
  private readonly providers: MarketDataProvider[];

  constructor(private readonly config: MarketDataRuntimeConfig) {
    const yahooProvider = new YahooMarketDataProvider();
    const alpacaProvider = config.isAlpacaConfigured ? new AlpacaMarketDataProvider(config) : null;

    const ordered = config.primary === 'alpaca'
      ? [alpacaProvider, yahooProvider]
      : [yahooProvider, alpacaProvider];

    this.providers = ordered.filter((provider): provider is NonNullable<typeof provider> => provider !== null);
  }

  async getQuote(symbol: string): Promise<MarketDataQuote> {
    // Check cache first
    const cached = marketDataCache.getQuote(symbol);
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const quote = await provider.getQuote(symbol);
        marketDataCache.setQuote(symbol, quote); // Cache the result
        return quote;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(extractErrorMessage(error));
        console.warn(`[FinIQ] ${provider.name} quote failed for ${symbol}: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error(`No market data provider could resolve quote for ${symbol}`);
  }

  async getHistory(symbol: string, period1: string, period2: string, interval: '1d' | '1wk' | '1mo'): Promise<MarketDataHistoryResult> {
    // Check cache first
    const cached = marketDataCache.getHistory(symbol, period1, period2, interval);
    if (cached) {
      return cached;
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const history = await provider.getHistory(symbol, period1, period2, interval);
        marketDataCache.setHistory(symbol, period1, period2, interval, history); // Cache the result
        return history;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(extractErrorMessage(error));
        console.warn(`[FinIQ] ${provider.name} history failed for ${symbol}: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error(`No market data provider could resolve history for ${symbol}`);
  }
}

export const marketDataService = new MarketDataService(serverConfig.marketData);
