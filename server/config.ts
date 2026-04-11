import 'dotenv/config';

type EnvMap = Record<string, string | undefined>;

export type AiProviderKind = 'gemini' | 'openai-compatible' | 'local' | 'opencode';

export interface AiRuntimeConfig {
  provider: AiProviderKind;
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
  isConfigured: boolean;
}

export type MarketDataProviderKind = 'alpaca' | 'yahoo';

export interface MarketDataRuntimeConfig {
  primary: MarketDataProviderKind;
  fallback: MarketDataProviderKind;
  alpacaApiKey: string | null;
  alpacaSecretKey: string | null;
  alpacaStockFeed: 'iex' | 'sip';
  alpacaCryptoFeed: string;
  isAlpacaConfigured: boolean;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  disableHmr: boolean;
  ai: AiRuntimeConfig;
  marketData: MarketDataRuntimeConfig;
  secretValues: string[];
}

function readNumberEnv(env: EnvMap, key: string, fallback: number): number {
  const raw = env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStringEnv(env: EnvMap, key: string, fallback: string): string {
  const raw = env[key]?.trim();
  return raw ? raw : fallback;
}

function trimToNull(raw: string | undefined): string | null {
  const value = raw?.trim();
  return value ? value : null;
}

function normalizeAiProvider(env: EnvMap): AiProviderKind {
  const raw = env.AI_PROVIDER?.trim().toLowerCase();

  switch (raw) {
    case 'gemini':
    case 'google':
      return 'gemini';
    case 'openai':
    case 'openai-compatible':
    case 'compatible':
    case 'cloud':
    case 'gateway':
    case 'openrouter':
    case 'groq':
    case 'together':
    case 'deepseek':
    case 'mistral':
    case 'azure-openai':
      return 'openai-compatible';
    case 'opencode':
    case 'open-code':
    case 'open code':
      return 'opencode';
    case 'local':
    case 'fallback':
    case 'offline':
      return 'local';
    default:
      break;
  }
  if (trimToNull(env.AI_OPENCODE_API_KEY)) return 'opencode';
  if (trimToNull(env.GEMINI_API_KEY)) return 'gemini';
  if (trimToNull(env.AI_BASE_URL)) return 'openai-compatible';
  if (trimToNull(env.AI_API_KEY)) return 'gemini';
  return 'local';
}

function resolveAiApiKey(env: EnvMap, provider: AiProviderKind): string | null {
  const genericKey = trimToNull(env.AI_API_KEY);
  if (genericKey) return genericKey;
  if (provider === 'gemini') return trimToNull(env.GEMINI_API_KEY);
  if (provider === 'opencode') return trimToNull(env.AI_OPENCODE_API_KEY);
  return null;
}

function resolveAiModel(env: EnvMap, provider: AiProviderKind): string {
  const genericModel = trimToNull(env.AI_MODEL);
  if (genericModel) return genericModel;

  if (provider === 'gemini') {
    return readStringEnv(env, 'GEMINI_MODEL', 'gemini-2.0-flash-lite');
  }

  if (provider === 'opencode') {
    return trimToNull(env.AI_OPENCODE_MODEL) ?? 'opencode-default-model';
  }

  if (provider === 'openai-compatible') {
    return 'gpt-4o-mini';
  }

  return 'local-fallback';
}

function resolveAiBaseUrl(env: EnvMap, provider: AiProviderKind): string | null {
  const explicit = trimToNull(env.AI_BASE_URL);
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  if (provider === 'opencode') {
    const explicitOC = trimToNull(env.AI_OPENCODE_BASE_URL);
    if (explicitOC) return explicitOC.replace(/\/+$/, '');
    return 'https://opencode.ai/zen/v1';
  }

  if (provider === 'openai-compatible') {
    return 'https://api.openai.com/v1';
  }

  return null;
}

function normalizeMarketDataPrimary(env: EnvMap): MarketDataProviderKind {
  const raw = env.MARKET_DATA_PRIMARY?.trim().toLowerCase();
  if (raw === 'alpaca' || raw === 'yahoo') return raw;
  if (trimToNull(env.ALPACA_API_KEY) && trimToNull(env.ALPACA_SECRET_KEY)) return 'alpaca';
  return 'yahoo';
}

function resolveMarketDataFallback(primary: MarketDataProviderKind): MarketDataProviderKind {
  return primary === 'alpaca' ? 'yahoo' : 'alpaca';
}

export function getServerConfig(env: EnvMap = process.env): ServerConfig {
  const nodeEnv = readStringEnv(env, 'NODE_ENV', 'development');
  const provider = normalizeAiProvider(env);
  const apiKey = resolveAiApiKey(env, provider);
  const marketDataPrimary = normalizeMarketDataPrimary(env);
  const alpacaApiKey = trimToNull(env.ALPACA_API_KEY);
  const alpacaSecretKey = trimToNull(env.ALPACA_SECRET_KEY);
  const alpacaStockFeed = env.ALPACA_STOCK_FEED?.trim().toLowerCase() === 'sip' ? 'sip' : 'iex';

  const ai: AiRuntimeConfig = {
    provider,
    apiKey,
    model: resolveAiModel(env, provider),
    baseUrl: resolveAiBaseUrl(env, provider),
    isConfigured: provider !== 'local' && Boolean(apiKey),
  };

  const marketData: MarketDataRuntimeConfig = {
    primary: marketDataPrimary,
    fallback: resolveMarketDataFallback(marketDataPrimary),
    alpacaApiKey,
    alpacaSecretKey,
    alpacaStockFeed,
    alpacaCryptoFeed: readStringEnv(env, 'ALPACA_CRYPTO_FEED', 'us'),
    isAlpacaConfigured: Boolean(alpacaApiKey && alpacaSecretKey),
  };

  const secretValues = [trimToNull(env.AI_API_KEY), trimToNull(env.GEMINI_API_KEY), alpacaApiKey, alpacaSecretKey]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  return {
    port: readNumberEnv(env, 'PORT', 3000),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    disableHmr: env.DISABLE_HMR === 'true',
    ai,
    marketData,
    secretValues,
  };
}

export const serverConfig = getServerConfig();
