/**
 * Centralized constants for FinIQ server.
 * All magic numbers should be defined here.
 */

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 150;
export const RATE_LIMIT_AI_MAX_REQUESTS = 25;

// Cache settings
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const INSIGHTS_CACHE_MAX_SIZE = 500;
export const ASSET_RETURN_CACHE_MAX_SIZE = 200;

// Validation
export const MIN_INVESTMENT_AMOUNT = 100;
export const MAX_INVESTMENT_AMOUNT = 100000000;
export const MAX_PORTFOLIO_ASSETS = 50;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_ITEMS = 20;
export const MAX_TIME_HORIZON_YEARS = 100;

// Financial calculations
export const TRADING_DAYS_PER_YEAR = 252;
export const MONTHLY_TRADING_DAYS = 21;
export const DEFAULT_RISK_FREE_RATE = 0.045;
export const MAX_DATE_RANGE_DAYS = 365 * 15; // 15 years

// AI
export const MIN_AI_CALL_GAP_MS = 1000;
export const AI_INSIGHTS_MAX_TOKENS = 1100;
export const AI_CHAT_MAX_TOKENS = 500;

// Security
export const MAX_SYMBOL_LENGTH = 12;
export const MAX_ASSET_NAME_LENGTH = 80;
export const MAX_ASSET_TYPE_LENGTH = 40;
