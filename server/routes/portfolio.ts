import { Router } from 'express';
import { validatePortfolioPayload } from '../security.js';
import { marketDataService } from '../marketData.js';
import { extractErrorMessage } from '../lib/utils.js';

const router = Router();

/**
 * POST /api/portfolio/data
 * Fechs consolidated data for a list of assets in a portfolio.
 */
router.post('/data', async (req, res) => {
  const portfolioResult = validatePortfolioPayload(req.body?.portfolio);
  if (!portfolioResult.ok) {
    return res.status(400).json({ error: 'error' in portfolioResult ? portfolioResult.error : 'Invalid portfolio' });
  }

  const portfolio = portfolioResult.portfolio;
  const uniqueSymbols = [...new Set(portfolio.assets.map((a: { symbol: string }) => a.symbol.toUpperCase()))];

  try {
    // Fetch all quotes in parallel
    const quotesStart = Date.now();
    const quotesResults = await Promise.allSettled(
      uniqueSymbols.map(async (symbol) => {
        const quote = await marketDataService.getQuote(symbol);
        return { symbol, quote };
      })
    );

    const quotes: Record<string, { price: number; change?: number; name?: string }> = {};
    for (const result of quotesResults) {
      if (result.status === 'fulfilled') {
        const { symbol, quote } = result.value;
        quotes[symbol] = {
          price: quote.regularMarketPrice ?? 0,
          change: undefined, // Will be calculated separately if needed
          name: quote.longName || quote.shortName || symbol,
        };
      }
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

    return res.json({
      quotes,
      symbols: uniqueSymbols,
      fetchedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - quotesStart,
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error(`[FinIQ] Portfolio data fetch failed: ${message}`);
    return res.status(500).json({ error: 'Failed to fetch portfolio data', detail: message });
  }
});

export default router;
