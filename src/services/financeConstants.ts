import { RiskProfile, Asset } from '../types';

export const FIVE_MINUTES_MS = 5 * 60 * 1000;
export const TRADING_DAYS_PER_YEAR = 252;
export const MONTHLY_TRADING_DAYS = 21;
export const DEFAULT_RISK_FREE_RATE = 0.045;

/** 
 * Fallback data for assets when Yahoo Finance API is unavailable or throttled.
 * These are estimated historical snapshots used for demonstration continuity.
 */
export const ESTIMATED_YTD_RETURN_PERCENT: Record<string, number> = {
  BND: 3.2, AGG: 3.5, TLT: -1.2, SHY: 4.1, HYG: 8.4, LQD: 5.8, VTI: 9.8,
  VOO: 10.2, SPY: 10.1, IVV: 10.2, QQQ: 14.5, VGT: 16.2, XLK: 15.5, ARKK: 11.5,
  NVDA: 45.6, AAPL: 18.9, MSFT: 22.2, GOOGL: 15.8, AMZN: 18.3, META: 25.1,
  TSLA: 22.5, AMD: 25.7, NFLX: 25.9, JNJ: 1.2, PG: 8.7, SCHD: 10.5, VYM: 9.8,
  KO: 5.2, VEA: 6.3, VWO: 6.9, EEM: 6.7, EFA: 6.5, SMH: 28.1, GLD: 7.5,
  SLV: 8.3, IAU: 7.4, DBA: 5.1, USO: 6.2, 'BTC-USD': 65.2, 'ETH-USD': 52.8,
  'SOL-USD': 85.3, VNQ: 8.6,
};

export const ESTIMATED_VOLATILITY_DECIMAL: Record<string, number> = {
  BND: 0.052, AGG: 0.048, TLT: 0.165, SHY: 0.025, HYG: 0.088, LQD: 0.072,
  VTI: 0.161, VOO: 0.158, SPY: 0.159, IVV: 0.158, QQQ: 0.228, VGT: 0.245,
  XLK: 0.235, ARKK: 0.455, NVDA: 0.551, AAPL: 0.255, MSFT: 0.248, GOOGL: 0.283,
  AMZN: 0.308, META: 0.382, TSLA: 0.653, AMD: 0.485, NFLX: 0.381, JNJ: 0.143,
  PG: 0.125, SCHD: 0.112, VYM: 0.118, KO: 0.115, VEA: 0.162, VWO: 0.205,
  EEM: 0.202, EFA: 0.165, SMH: 0.353, GLD: 0.132, SLV: 0.288, IAU: 0.131,
  DBA: 0.148, USO: 0.382, 'BTC-USD': 0.725, 'ETH-USD': 0.853, 'SOL-USD': 1.052,
  VNQ: 0.225,
};

export const BASE_PORTFOLIOS: Record<RiskProfile, Asset[]> = {
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
