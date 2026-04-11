import crypto from 'crypto';
import type { SanitizedHistoryItem } from './security.js';
import { serverConfig } from './config.js';
import { getRemoteAiProvider } from './ai/provider.js';
import type { FinancialMetrics, IntentResult, Language, Portfolio } from './ai/types.js';
import { marketDataService } from './marketData.js';

type GoalAsset = {
  symbol: string;
  name: string;
  type: string;
  annualReturn: number;
};

type GoalPortfolioAsset = {
  symbol: string;
  name: string;
  allocation: number;
  type: string;
};

/**
 * Strips AI "thinking" / reasoning text from the beginning of a response.
 * Returns the cleaned text, or empty string if no valid analysis found (triggers fallback).
 */
function stripAIThinking(raw: string): string {
  console.log("=== STRIP AI THINKING ===");
  console.log("RAW TEXT:", JSON.stringify(raw));
  let text = raw.trim();
  if (!text) {
    console.log("RETURNING EMPTY (was falsy)");
    return '';
  }

  const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
  if (thinkRegex.test(text)) {
    const stripped = text.replace(thinkRegex, '').trim();
    if (stripped) {
      text = stripped;
    } else {
      // Emergency fallback: If the model put EVERYTHING inside <think>,
      // extract the inner reasoning content rather than returning empty.
      const match = text.match(thinkRegex);
      if (match && match[1]) {
        text = match[1].trim();
      }
    }
  }

  // Already clean — starts with ## heading that has substantial content after it
  if (/^##\s/.test(text)) {
    const firstNewline = text.indexOf('\n');
    if (firstNewline > 0) {
      const contentAfterFirstHeading = text.slice(firstNewline + 1).trim();
      // Check if there's a second ## heading soon after (thinking pattern)
      const secondHeadingMatch = contentAfterFirstHeading.match(/^##\s/m);
      if (secondHeadingMatch && secondHeadingMatch.index !== undefined && secondHeadingMatch.index < 80) {
        // First heading has short content and is followed by another heading — likely thinking
        // Skip to find the last cluster
      } else if (contentAfterFirstHeading.length > 30) {
        // First heading has substantial content — it's the real analysis
        return text;
      }
    }
  }

  const lines = text.split('\n');

  // Find all ## heading lines with their indices
  const headings: { index: number; contentAfter: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      // Find content after this heading (until next heading or end)
      let contentAfter = '';
      for (let j = i + 1; j < lines.length; j++) {
        if (/^##\s+/.test(lines[j].trim())) break;
        contentAfter += lines[j] + '\n';
      }
      headings.push({ index: i, contentAfter: contentAfter.trim() });
    }
  }

  if (headings.length === 0) return text;

  // Find clusters: consecutive headings where the gap between them is short (<50 chars)
  // A cluster of headings with short content = thinking/planning
  // A cluster of headings with long content = actual analysis
  const clusters: { startIndex: number; endIndex: number; avgContentLen: number }[] = [];
  let clusterStart = 0;

  for (let i = 1; i < headings.length; i++) {
    const gapLen = headings[i - 1].contentAfter.length;
    if (gapLen > 50) {
      // Long content between these headings — end current cluster, start new one
      const cluster = headings.slice(clusterStart, i);
      const avgLen = cluster.reduce((sum, h) => sum + h.contentAfter.length, 0) / cluster.length;
      clusters.push({ startIndex: clusterStart, endIndex: i - 1, avgContentLen: avgLen });
      clusterStart = i;
    }
  }
  // Last cluster
  const lastCluster = headings.slice(clusterStart);
  const avgLen = lastCluster.reduce((sum, h) => sum + h.contentAfter.length, 0) / lastCluster.length;
  clusters.push({ startIndex: clusterStart, endIndex: headings.length - 1, avgContentLen: avgLen });

  // Find the cluster with the highest average content length (the actual analysis)
  let bestCluster = clusters[0];
  for (const cluster of clusters) {
    if (cluster.avgContentLen > bestCluster.avgContentLen) {
      bestCluster = cluster;
    }
  }

  // Return from the first heading of the best cluster
  const startLine = headings[bestCluster.startIndex].index;
  const result = lines.slice(startLine).join('\n').trim();
  console.log("FINAL STRIPPED TEXT:", JSON.stringify(result));
  return result;
}

const CACHE_TTL = 5 * 60 * 1000;
const insightsCache = new Map<string, { text: string; ts: number }>();
const assetReturnCache = new Map<string, { annualReturn: number; ts: number }>();

const KNOWN_ASSETS: Record<string, { name: string; type: string }> = {
  GLD: { name: 'SPDR Gold Shares', type: 'Commodity' },
  SLV: { name: 'iShares Silver Trust', type: 'Commodity' },
  IAU: { name: 'iShares Gold Trust', type: 'Commodity' },
  USO: { name: 'United States Oil Fund', type: 'Commodity' },
  DBA: { name: 'Invesco DB Agriculture Fund', type: 'Commodity' },
  'BTC-USD': { name: 'Bitcoin', type: 'Crypto' },
  'ETH-USD': { name: 'Ethereum', type: 'Crypto' },
  'SOL-USD': { name: 'Solana', type: 'Crypto' },
  BND: { name: 'Vanguard Total Bond Market ETF', type: 'Bond' },
  AGG: { name: 'iShares Core U.S. Aggregate Bond ETF', type: 'Bond' },
  TLT: { name: 'iShares 20+ Year Treasury Bond ETF', type: 'Bond' },
  SHY: { name: 'iShares 1-3 Year Treasury Bond ETF', type: 'Bond' },
  HYG: { name: 'iShares iBoxx $ High Yield Corporate Bond ETF', type: 'Bond' },
  LQD: { name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF', type: 'Bond' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', type: 'Stock' },
  VOO: { name: 'Vanguard S&P 500 ETF', type: 'Stock' },
  VTI: { name: 'Vanguard Total Stock Market ETF', type: 'Stock' },
  IVV: { name: 'iShares Core S&P 500 ETF', type: 'Stock' },
  QQQ: { name: 'Invesco QQQ Trust', type: 'Growth' },
  VGT: { name: 'Vanguard Information Technology ETF', type: 'Growth' },
  SMH: { name: 'VanEck Semiconductor ETF', type: 'Growth' },
  XLK: { name: 'Technology Select Sector SPDR Fund', type: 'Growth' },
  ARKK: { name: 'ARK Innovation ETF', type: 'Growth' },
  AAPL: { name: 'Apple Inc.', type: 'Stock' },
  MSFT: { name: 'Microsoft Corporation', type: 'Stock' },
  GOOGL: { name: 'Alphabet Inc.', type: 'Stock' },
  AMZN: { name: 'Amazon.com Inc.', type: 'Stock' },
  NVDA: { name: 'NVIDIA Corporation', type: 'Stock' },
  META: { name: 'Meta Platforms Inc.', type: 'Stock' },
  TSLA: { name: 'Tesla Inc.', type: 'Stock' },
  AMD: { name: 'Advanced Micro Devices', type: 'Stock' },
  NFLX: { name: 'Netflix Inc.', type: 'Stock' },
  SCHD: { name: 'Schwab U.S. Dividend Equity ETF', type: 'Dividend' },
  VYM: { name: 'Vanguard High Dividend Yield ETF', type: 'Dividend' },
  JNJ: { name: 'Johnson & Johnson', type: 'Dividend' },
  PG: { name: 'Procter & Gamble Co.', type: 'Dividend' },
  KO: { name: 'Coca-Cola Co.', type: 'Dividend' },
  VEA: { name: 'Vanguard FTSE Developed Markets ETF', type: 'International' },
  VWO: { name: 'Vanguard FTSE Emerging Markets ETF', type: 'Emerging' },
  EFA: { name: 'iShares MSCI EAFE ETF', type: 'International' },
  EEM: { name: 'iShares MSCI Emerging Markets ETF', type: 'Emerging' },
  VNQ: { name: 'Vanguard Real Estate ETF', type: 'REIT' },
};

function portfolioHash(portfolio: Portfolio, metrics: FinancialMetrics, language: Language): string {
  return crypto
    .createHash('md5')
    .update(
      JSON.stringify({
        assets: portfolio.assets.map((asset) => `${asset.symbol}:${asset.allocation}`).sort(),
        riskProfile: portfolio.riskProfile,
        totalAmount: portfolio.totalAmount,
        timeHorizon: portfolio.timeHorizon,
        metrics,
        language,
        provider: serverConfig.ai.provider,
        model: serverConfig.ai.model,
      }),
    )
    .digest('hex');
}

function calculateAnnualReturn(points: Array<{ date: Date; price: number }>): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || first.price <= 0 || last.price <= 0) {
    throw new Error('Insufficient price history');
  }

  const years = Math.max(
    1 / 365.25,
    (last.date.getTime() - first.date.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  return Math.pow(last.price / first.price, 1 / years) - 1;
}

async function getAssetAnnualReturnFromMarketData(symbol: string): Promise<number> {
  const cached = assetReturnCache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.annualReturn;
  }

  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);

  const history = await marketDataService.getHistory(
    symbol,
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
    '1d',
  );

  const points = history.rows
    .map((quote) => {
      const rawPrice = quote.adjclose ?? quote.adjClose ?? quote.close;
      const price = Number(rawPrice);
      const date = quote.date ? new Date(quote.date) : null;
      if (!date || Number.isNaN(date.getTime()) || !Number.isFinite(price) || price <= 0) {
        return null;
      }
      return { date, price };
    })
    .filter((point): point is { date: Date; price: number } => point !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  if (points.length < 2) {
    throw new Error(`Insufficient market data history for ${symbol}`);
  }

  const annualReturn = calculateAnnualReturn(points);
  assetReturnCache.set(symbol, { annualReturn, ts: Date.now() });
  return annualReturn;
}

function resolveAssetName(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const nameMap: Record<string, string> = {
    gold: 'GLD',
    oro: 'GLD',
    silver: 'SLV',
    plata: 'SLV',
    bitcoin: 'BTC-USD',
    btc: 'BTC-USD',
    ethereum: 'ETH-USD',
    eth: 'ETH-USD',
    solana: 'SOL-USD',
    sol: 'SOL-USD',
    bonds: 'BND',
    bonos: 'BND',
    treasury: 'TLT',
    treasuries: 'TLT',
    oil: 'USO',
    petroleo: 'USO',
    'real estate': 'VNQ',
    reit: 'VNQ',
    'bienes raices': 'VNQ',
    apple: 'AAPL',
    microsoft: 'MSFT',
    google: 'GOOGL',
    alphabet: 'GOOGL',
    amazon: 'AMZN',
    nvidia: 'NVDA',
    tesla: 'TSLA',
    meta: 'META',
    facebook: 'META',
    amd: 'AMD',
    netflix: 'NFLX',
    sp500: 'SPY',
    's&p': 'SPY',
    's&p 500': 'SPY',
    's & p': 'SPY',
    nasdaq: 'QQQ',
    tech: 'QQQ',
    tecnologia: 'QQQ',
    emerging: 'VWO',
    emergentes: 'VWO',
    international: 'VEA',
    internacional: 'VEA',
    dividends: 'SCHD',
    dividendos: 'SCHD',
  };

  if (nameMap[lower]) return nameMap[lower];

  const upper = lower.toUpperCase();
  if (KNOWN_ASSETS[upper]) return upper;

  for (const [key, ticker] of Object.entries(nameMap)) {
    if (lower === key || lower.startsWith(key + ' ') || lower.endsWith(' ' + key)) return ticker;
  }

  return null;
}

function sanitizeSymbol(input: string): string {
  return input
    .toUpperCase()
    .replace(/\s*(TO|A|EN|IN|INTO)\s+(MY|MI|THE|EL)\s+(PORTFOLIO|PORTAFOLIO)\s*/g, '')
    .replace(/\s*(AT|AL|WITH|CON)\s+\d+\s*%/g, '')
    .replace(/[^A-Z0-9\-\.]/g, '')
    .trim();
}

function finalizeGoalAllocations(
  assets: Array<Omit<GoalPortfolioAsset, 'allocation'> & { weight: number }>,
): GoalPortfolioAsset[] {
  const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
  const normalized = assets
    .filter((asset) => asset.weight > 0 && totalWeight > 0)
    .map((asset) => ({ ...asset, weight: asset.weight / totalWeight }));

  let remaining = 100;
  return normalized.map((asset, index) => {
    const allocation = index === normalized.length - 1 ? remaining : Math.round(asset.weight * 100);
    remaining -= allocation;
    return {
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      allocation,
    };
  });
}

async function getKnownAssetsWithRealReturns(): Promise<GoalAsset[]> {
  const results = await Promise.allSettled(
    Object.entries(KNOWN_ASSETS).map(async ([symbol, data]) => ({
      symbol,
      name: data.name,
      type: data.type,
      annualReturn: await getAssetAnnualReturnFromMarketData(symbol),
    })),
  );

  const available = results
    .filter((result): result is PromiseFulfilledResult<GoalAsset> => result.status === 'fulfilled')
    .map((result) => result.value)
    .sort((left, right) => right.annualReturn - left.annualReturn);

  if (available.length < 4) {
    throw new Error('Insufficient market data to build a goal-based portfolio');
  }

  return available;
}

async function buildGoalPortfolio(targetReturnPercent: number): Promise<{ assets: GoalPortfolioAsset[]; riskProfile: string }> {
  const targetReturn = targetReturnPercent / 100;
  const available = await getKnownAssetsWithRealReturns();
  const maxReturn = available[0].annualReturn;
  const minReturn = available[available.length - 1].annualReturn;

  let selected: Array<Omit<GoalPortfolioAsset, 'allocation'> & { weight: number }> = [];

  if (targetReturn >= maxReturn) {
    const topAssets = available.slice(0, 5);
    selected = topAssets.map((asset) => ({ ...asset, weight: 1 / topAssets.length }));
  } else if (targetReturn <= minReturn) {
    const bottomAssets = available.slice(-5);
    selected = bottomAssets.map((asset) => ({ ...asset, weight: 1 / bottomAssets.length }));
  } else {
    const above = available
      .filter((asset) => asset.annualReturn >= targetReturn)
      .sort((left, right) => left.annualReturn - right.annualReturn)
      .slice(0, 3);
    const below = available
      .filter((asset) => asset.annualReturn < targetReturn)
      .sort((left, right) => right.annualReturn - left.annualReturn)
      .slice(0, 3);

    const upperBucket = above.length > 0 ? above : available.slice(0, 3);
    const lowerBucket = below.length > 0 ? below : available.slice(-3);
    const upperAverage = upperBucket.reduce((sum, asset) => sum + asset.annualReturn, 0) / upperBucket.length;
    const lowerAverage = lowerBucket.reduce((sum, asset) => sum + asset.annualReturn, 0) / lowerBucket.length;
    const spread = upperAverage - lowerAverage;
    const upperWeight = spread > 0 ? Math.max(0, Math.min(1, (targetReturn - lowerAverage) / spread)) : 0.5;
    const lowerWeight = 1 - upperWeight;

    selected = [
      ...upperBucket.map((asset) => ({ ...asset, weight: upperWeight / upperBucket.length })),
      ...lowerBucket.map((asset) => ({ ...asset, weight: lowerWeight / lowerBucket.length })),
    ];
  }

  const riskProfile = targetReturn >= 0.15 ? 'aggressive' : targetReturn >= 0.08 ? 'moderate' : 'conservative';
  return {
    assets: finalizeGoalAllocations(selected),
    riskProfile,
  };
}

export async function smartFallback(
  message: string,
  language: Language,
  portfolio?: Portfolio,
  metrics?: FinancialMetrics,
  strictMode = false,
): Promise<IntentResult | null> {
  const isEn = language === 'en';
  const lower = message.toLowerCase();
  const functionCalls: IntentResult['functionCalls'] = [];

  const returnMatch =
    lower.match(/(\d+)\s*%\s*(annual|anual|return|retorno|rentabilidad|yearly|year|rendimiento|ganancia)/i) ||
    lower.match(/(return|retorno|rentabilidad|rendimiento|ganancia).{0,20}(\d+)\s*%/i) ||
    lower.match(/(?:want|quiero|need|necesito|get|obtener|achieve|lograr|target|objetivo).{0,30}(\d+)\s*%/i);

  if (returnMatch) {
    // Find the first captured group that is actually a numeric string.
    // Regex 1 has the number in group 1; regex 2 has it in group 2; regex 3 has it in group 1.
    const numStr = returnMatch.slice(1).find((g) => g !== undefined && /^\d+$/.test(g.trim())) ?? '';
    const targetReturn = parseInt(numStr, 10);
    if (targetReturn > 0 && targetReturn <= 100) {
      try {
        const goal = await buildGoalPortfolio(targetReturn);
        functionCalls.push({
          name: 'replacePortfolio',
          args: {
            assets: goal.assets,
            riskProfile: goal.riskProfile,
          },
        });
        const riskLabels: Record<Language, Record<string, string>> = {
          en: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
          es: { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' },
        };
        return {
          text: isEn
            ? `Building a portfolio targeting **${targetReturn}% annual return** using real market history. This implies a **${riskLabels.en[goal.riskProfile]}** profile, so the portfolio will lean more toward higher-growth assets and higher volatility.`
            : `Construyendo un portafolio con objetivo de **${targetReturn}% de retorno anual** usando historial real de mercado. Esto implica un perfil **${riskLabels.es[goal.riskProfile]}**, por lo que el portafolio se inclinara hacia activos de mayor crecimiento y mayor volatilidad.`,
          functionCalls,
        };
      } catch (error) {
        console.warn(`Goal portfolio builder failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        if (strictMode) return null;
        return {
          text: isEn
            ? 'I could not build a goal-based portfolio because live market data is unavailable right now.'
            : 'No pude construir un portafolio por objetivo porque los datos de mercado en vivo no estan disponibles en este momento.',
          functionCalls,
        };
      }
    }
  }

  const removeMatch =
    lower.match(/(?:remove|quit[ae]?|elimina|saca|drop|delete|borra)\s+(.+)/i) ||
    lower.match(/(?:no\s+(?:want|quiero))\s+(.+?)(?:\s+(?:in|en|from|de|del)\s+(?:my|mi|the|el)\s+(?:portfolio|portafolio))?$/i);

  if (removeMatch) {
    const assetInput = removeMatch[1].trim().replace(/[^a-zA-Z0-9\s\-]/g, '');
    const resolved = resolveAssetName(assetInput) || assetInput.toUpperCase();
    return {
      text: isEn
        ? `Removing **${resolved}** from your portfolio and rebalancing the remaining allocations.`
        : `Eliminando **${resolved}** de tu portafolio y rebalanceando las asignaciones restantes.`,
      functionCalls: [{ name: 'removeAsset', args: { symbol: resolved } }],
    };
  }

  const addMatch =
    lower.match(/(?:add|agrega|anade|a(?:n|\u00f1)ade|incluye|pon|mete|include)\s+(.+?)(?:\s+(?:at|al|a|with|con)\s+(\d+)\s*%)?$/i) ||
    lower.match(/(?:add|agrega|anade|a(?:n|\u00f1)ade)\s+(.+?)$/i);

  if (addMatch) {
    const assetInput = addMatch[1].trim();
    const resolved = resolveAssetName(assetInput);
    const allocation = addMatch[2] ? parseInt(addMatch[2], 10) : 10;

    if (resolved) {
      return {
        text: isEn
          ? `Adding **${KNOWN_ASSETS[resolved]?.name || resolved}** (${resolved}) at **${allocation}%** allocation.`
          : `Agregando **${KNOWN_ASSETS[resolved]?.name || resolved}** (${resolved}) al **${allocation}%** de asignacion.`,
        functionCalls: [{ name: 'addAsset', args: { symbol: resolved, allocation } }],
      };
    }

    const ticker = sanitizeSymbol(assetInput);
    if (ticker.length >= 1 && ticker.length <= 12) {
      return {
        text: isEn
          ? `Adding **${ticker}** at **${allocation}%** allocation.`
          : `Agregando **${ticker}** al **${allocation}%** de asignacion.`,
        functionCalls: [{ name: 'addAsset', args: { symbol: ticker, allocation } }],
      };
    }
  }

  const riskMatch =
    lower.match(/(?:change|switch|set|cambiar?|poner?)\s+(?:to|a|al|profile|perfil|risk|riesgo)?\s*(conservative|conservador|moderate|moderado|aggressive|agresivo)/i) ||
    lower.match(/(conservative|conservador|moderate|moderado|aggressive|agresivo)\s+(?:profile|perfil|risk|riesgo)/i);

  if (riskMatch) {
    const profileMap: Record<string, string> = {
      conservative: 'conservative',
      conservador: 'conservative',
      moderate: 'moderate',
      moderado: 'moderate',
      aggressive: 'aggressive',
      agresivo: 'aggressive',
    };
    const profile = profileMap[riskMatch[1].toLowerCase()] || 'moderate';
    const labels: Record<Language, Record<string, string>> = {
      en: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
      es: { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' },
    };
    return {
      text: isEn
        ? `Changing the risk profile to **${labels.en[profile]}**. The portfolio will be rebuilt with that level of risk in mind.`
        : `Cambiando el perfil de riesgo a **${labels.es[profile]}**. El portafolio sera reconstruido con ese nivel de riesgo en mente.`,
      functionCalls: [{ name: 'updateRiskProfile', args: { profile } }],
    };
  }

  const amountMatch =
    lower.match(/(?:invest|invertir|change|cambiar|set|poner|add|increase|aumentar)\s+.*?\$?\s*(\d[\d,]*)/i) ||
    lower.match(/\$\s*(\d[\d,]*)/);

  if (amountMatch && !addMatch) {
    const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
    if (amount >= 100) {
      return {
        text: isEn
          ? `Updating the investment amount to **$${amount.toLocaleString()}**.`
          : `Actualizando el monto de inversion a **$${amount.toLocaleString()}**.`,
        functionCalls: [{ name: 'updateInvestmentAmount', args: { amount } }],
      };
    }
  }

  const horizonMatch =
    lower.match(/(\d+)\s*(?:year|ano|a(?:n|\u00f1)o|yr)/i) ||
    lower.match(/(?:horizon|horizonte|time|tiempo)\s+.*?(\d+)/i);

  if (horizonMatch && !returnMatch) {
    const years = parseInt(horizonMatch[1], 10);
    if (years >= 1 && years <= 50) {
      return {
        text: isEn
          ? `Setting the investment horizon to **${years} years**.`
          : `Estableciendo el horizonte temporal a **${years} anos**.`,
        functionCalls: [{ name: 'updateTimeHorizon', args: { years } }],
      };
    }
  }

  if (/sharpe/i.test(lower)) {
    return {
      text: isEn
        ? `Your Sharpe ratio is **${metrics?.sharpeRatio.toFixed(2) ?? '-'}**. In simple terms, this shows how much return you are getting for each unit of risk. Values above about 1.0 are usually considered solid.`
        : `Tu ratio de Sharpe es **${metrics?.sharpeRatio.toFixed(2) ?? '-'}**. En palabras simples, muestra cuanto retorno obtienes por cada unidad de riesgo. Valores por encima de 1.0 suelen considerarse solidos.`,
      functionCalls,
    };
  }

  if (/risk|riesgo|volatil/i.test(lower)) {
    return {
      text: isEn
        ? `Your portfolio volatility is **${metrics ? (metrics.volatility * 100).toFixed(2) : '-'}%** and the max drawdown is **${metrics ? (metrics.maxDrawdown * 100).toFixed(2) : '-'}%**. That means this portfolio can experience noticeable swings, especially during market stress. Current profile: **${portfolio?.riskProfile ?? '-'}**.`
        : `La volatilidad de tu portafolio es **${metrics ? (metrics.volatility * 100).toFixed(2) : '-'}%** y el max drawdown es **${metrics ? (metrics.maxDrawdown * 100).toFixed(2) : '-'}%**. Eso significa que este portafolio puede tener movimientos visibles, especialmente en periodos de estres de mercado. Perfil actual: **${portfolio?.riskProfile ?? '-'}**.`,
      functionCalls,
    };
  }

  if (/return|cagr|rentabilidad|rendimiento|ganancia/i.test(lower)) {
    return {
      text: isEn
        ? `The estimated annual CAGR is **${metrics ? (metrics.annualCAGR * 100).toFixed(2) : '-'}%** and the projected gain is **$${metrics ? metrics.expectedReturn.toLocaleString() : '0'}** over the selected horizon. This is an estimate based on historical data, not a guarantee.`
        : `El CAGR anual estimado es **${metrics ? (metrics.annualCAGR * 100).toFixed(2) : '-'}%** y la ganancia proyectada es **$${metrics ? metrics.expectedReturn.toLocaleString() : '0'}** en el horizonte seleccionado. Esto es una estimacion basada en datos historicos, no una garantia.`,
      functionCalls,
    };
  }

  if (strictMode) return null;

  return {
    text: isEn
      ? "I can help you manage the portfolio in plain language. Try:\n- **I want 12% annual return**\n- **Add gold at 15%**\n- **Remove NVDA**\n- **Change to aggressive**\n- **Explain the portfolio risk**"
      : "Puedo ayudarte a gestionar el portafolio con lenguaje claro. Prueba:\n- **Quiero 12% de retorno anual**\n- **Agrega oro al 15%**\n- **Quita NVDA**\n- **Cambiar a agresivo**\n- **Explica el riesgo del portafolio**",
    functionCalls,
  };
}

function generateInsightsFallback(portfolio: Portfolio, metrics: FinancialMetrics, language: Language): string {
  const isEn = language === 'en';
  const riskMap: Record<string, { en: string; es: string }> = {
    conservative: { en: 'Conservative', es: 'Conservador' },
    moderate: { en: 'Moderate', es: 'Moderado' },
    aggressive: { en: 'Aggressive', es: 'Agresivo' },
  };
  const riskLabel = riskMap[portfolio.riskProfile]?.[language] ?? portfolio.riskProfile;
  const totalAmount = portfolio.totalAmount ?? 0;
  const horizon = portfolio.timeHorizon ?? 10;
  const volatility = metrics?.volatility ?? 0;
  const maxDrawdown = metrics?.maxDrawdown ?? 0;
  const cagr = metrics?.annualCAGR ?? 0;
  const expectedReturn = metrics?.expectedReturn ?? 0;

  return [
    isEn ? '## Why This Portfolio Fits' : '## Por Que Este Portafolio Encaja',
    isEn
      ? `You are investing **$${totalAmount.toLocaleString()}** with a **${riskLabel}** profile over **${horizon} years**. The allocation is built to match that risk level while keeping money spread across different assets instead of relying on one single position.`
      : `Estas invirtiendo **$${totalAmount.toLocaleString()}** con un perfil **${riskLabel}** durante **${horizon} anos**. La asignacion esta pensada para ese nivel de riesgo mientras distribuye el dinero entre distintos activos en lugar de depender de una sola posicion.`,
    '',
    isEn ? '## Main Risks' : '## Riesgos Principales',
    isEn
      ? `The portfolio volatility is **${(volatility * 100).toFixed(2)}%** and the historical max drawdown is **${(maxDrawdown * 100).toFixed(2)}%**. In plain terms, the portfolio can experience noticeable swings, and those swings matter more in shorter time horizons.`
      : `La volatilidad del portafolio es **${(volatility * 100).toFixed(2)}%** y el max drawdown historico es **${(maxDrawdown * 100).toFixed(2)}%**. En palabras simples, el portafolio puede tener movimientos visibles y esos movimientos pesan mas cuando el horizonte es corto.`,
    '',
    isEn ? '## Growth Outlook' : '## Perspectiva de Crecimiento',
    isEn
      ? `Based on the historical data available, the estimated CAGR is **${(cagr * 100).toFixed(2)}%** and the projected gain is **$${expectedReturn.toLocaleString()}** over the full horizon. These figures are useful planning estimates, but real future returns can be higher or lower.`
      : `Segun los datos historicos disponibles, el CAGR estimado es **${(cagr * 100).toFixed(2)}%** y la ganancia proyectada es **$${expectedReturn.toLocaleString()}** para todo el horizonte. Estas cifras sirven como referencia de planificacion, pero los retornos reales pueden ser mayores o menores.`,
    '',
    isEn ? '## Practical Next Steps' : '## Proximos Pasos Practicos',
    isEn
      ? '- Review whether this risk level still matches your comfort with losses.\n- Rebalance periodically so the target allocations stay close to plan.\n- Revisit assumptions if rates, income needs, or goals change.'
      : '- Revisa si este nivel de riesgo sigue encajando con tu tolerancia a perdidas.\n- Rebalancea periodicamente para mantener las asignaciones objetivo.\n- Vuelve a revisar los supuestos si cambian las tasas, tus ingresos o tus metas.',
  ].join('\n');
}

export async function generateInsightsServer(
  portfolio: Portfolio,
  metrics: FinancialMetrics,
  language: Language,
): Promise<string> {
  const fallback = generateInsightsFallback(portfolio, metrics, language);

  try {
    const hash = portfolioHash(portfolio, metrics, language);
    const cached = insightsCache.get(hash);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.text;
    }

    const remoteProvider = getRemoteAiProvider();
    if (!remoteProvider) {
      insightsCache.set(hash, { text: fallback, ts: Date.now() });
      return fallback;
    }

    const text = await remoteProvider.generateInsights({ portfolio, metrics, language });
    const cleaned = stripAIThinking(text);
    const normalized = cleaned.trim() || fallback;
    insightsCache.set(hash, { text: normalized, ts: Date.now() });
    return normalized;
  } catch (error) {
    console.warn(
      `Remote AI insights failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return fallback;
  }
}

export async function chatWithBotServer(
  message: string,
  history: SanitizedHistoryItem[],
  language: Language,
  portfolio?: Portfolio,
  metrics?: FinancialMetrics,
): Promise<{ text?: string; functionCalls?: Array<{ name: string; args: Record<string, unknown> }> }> {
  const strictIntent = await smartFallback(message, language, portfolio, metrics, true);
  if (strictIntent && strictIntent.functionCalls.length > 0) {
    return strictIntent;
  }

  const remoteProvider = getRemoteAiProvider();

  if (remoteProvider) {
    try {
      const response = await remoteProvider.chat({
        message,
        history,
        language,
        portfolio,
        metrics,
      });


      if ((response.text && response.text.trim()) || (response.functionCalls && response.functionCalls.length > 0)) {
        // Strip AI "thinking" from text responses
        if (response.text) {
          response.text = stripAIThinking(response.text);
        }
        return response;
      }
    } catch (error) {
      console.warn(
        `Remote AI chat failed with provider ${remoteProvider.name}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  return (await smartFallback(message, language, portfolio, metrics)) ?? { text: '' };
}
