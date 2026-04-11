import { Router } from 'express';
import { validateSymbol, validatePeriod, validateInterval } from '../security.js';
import { marketDataService } from '../marketData.js';
import { extractErrorMessage, isSymbolNotFoundError } from '../lib/utils.js';

const router = Router();

/**
 * GET /api/finance/quote/:symbol
 * Fetches real-time or delayed quote data for a symbol.
 */
router.get('/quote/:symbol', async (req, res) => {
  const symbolResult = validateSymbol(req.params.symbol);
  if (!symbolResult.ok) {
    return res.status(400).json({ error: 'error' in symbolResult ? symbolResult.error : 'Invalid symbol' });
  }

  try {
    const quote = await marketDataService.getQuote(symbolResult.symbol);
    res.setHeader('X-Market-Data-Source', quote.source);
    res.setHeader('X-Market-Data-Live', String(quote.isLive));
    res.setHeader('X-Market-Data-Market', quote.market);
    // Cache for 5 minutes (300 seconds)
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.json(quote);
  } catch (error) {
    const message = extractErrorMessage(error);
    if (isSymbolNotFoundError(error)) {
      return res.status(404).json({
        error: `Could not find ${symbolResult.symbol}. Please try a valid ticker.`,
      });
    }
    console.error(`[FinIQ] Quote failed for ${symbolResult.symbol}: ${message}`);
    return res.status(500).json({ error: 'Failed to fetch financial data', detail: message });
  }
});

/**
 * GET /api/finance/history/:symbol
 * Fetches historical price data for a symbol.
 */
router.get('/history/:symbol', async (req, res) => {
  const symbolResult = validateSymbol(req.params.symbol);
  if (!symbolResult.ok) {
    return res.status(400).json({ error: 'error' in symbolResult ? symbolResult.error : 'Invalid symbol' });
  }

  const periodResult = validatePeriod(req.query.period1, req.query.period2);
  if (!periodResult.ok) {
    return res.status(400).json({ error: 'error' in periodResult ? periodResult.error : 'Invalid period' });
  }

  const interval = validateInterval(req.query.interval);

  try {
    const history = await marketDataService.getHistory(symbolResult.symbol, periodResult.p1, periodResult.p2, interval);
    res.setHeader('X-Market-Data-Source', history.source);
    res.setHeader('X-Market-Data-Live', String(history.isLive));
    res.setHeader('X-Market-Data-Market', history.market);
    // Cache historical data for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
    return res.json(history.rows);
  } catch (error) {
    const message = extractErrorMessage(error);
    if (isSymbolNotFoundError(error)) {
      return res.status(404).json({
        error: `Could not find ${symbolResult.symbol}. Please try a valid ticker.`,
      });
    }
    console.error(`[FinIQ] History failed for ${symbolResult.symbol}: ${message}`);
    return res.status(500).json({ error: 'Failed to fetch historical data', detail: message });
  }
});

export default router;
