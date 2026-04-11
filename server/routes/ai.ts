import { Router } from 'express';
import {
  validatePortfolioPayload,
  validateMetricsPayload,
  validateLanguage,
  sanitizeMessage,
  hasPromptInjection,
  sanitizeHistory,
} from '../security.js';
import { generateInsightsServer, chatWithBotServer } from '../aiHandlers.js';
import { serverConfig } from '../config.js';
import { extractErrorMessage } from '../lib/utils.js';

const router = Router();

/**
 * GET /api/ai/status/opencode
 * Returns the status of the OpenCode AI provider.
 */
router.get('/status/opencode', (_req, res) => {
  const ai = serverConfig.ai;
  res.json({
    provider: ai?.provider ?? 'local',
    configured: ai?.isConfigured ?? false,
    model: ai?.model ?? null,
  });
});

/**
 * GET /api/ai/status
 * Returns general AI configuration status.
 */
router.get('/status', (_req, res) => {
  const ai = serverConfig.ai;
  res.json({
    provider: ai?.provider ?? 'local',
    configured: ai?.isConfigured ?? false,
    model: ai?.model ?? null,
  });
});

/**
 * POST /api/ai/insights
 * Generates AI-driven investment insights based on portfolio data.
 */
router.post('/insights', async (req, res) => {
  try {
    const portfolioResult = validatePortfolioPayload(req.body?.portfolio);
    if (!portfolioResult.ok) {
      return res.status(400).json({ error: 'error' in portfolioResult ? portfolioResult.error : 'Invalid portfolio' });
    }

    const metricsResult = validateMetricsPayload(req.body?.metrics);
    if (!metricsResult.ok) {
      return res.status(400).json({ error: 'error' in metricsResult ? metricsResult.error : 'Invalid metrics' });
    }

    const language = validateLanguage(req.body?.language);
    const text = await generateInsightsServer(portfolioResult.portfolio, metricsResult.metrics, language);
    return res.json({ text });
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error(`Insights error: ${message}`);
    return res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * POST /api/ai/chat
 * Handles real-time chat with the investment AI assistant.
 */
router.post('/chat', async (req, res) => {
  const sanitizedMessage = sanitizeMessage(req.body?.message);
  if (!sanitizedMessage.ok) {
    return res.status(400).json({ error: 'error' in sanitizedMessage ? sanitizedMessage.error : 'Invalid message' });
  }

  if (hasPromptInjection(sanitizedMessage.message)) {
    return res.status(400).json({
      error: 'Message not allowed. Please ask only about your portfolio and investments.',
    });
  }

  const portfolioResult = req.body?.portfolio === undefined ? undefined : validatePortfolioPayload(req.body.portfolio);
  if (portfolioResult && !portfolioResult.ok) {
    return res.status(400).json({ error: 'error' in portfolioResult ? portfolioResult.error : 'Invalid portfolio' });
  }

  const metricsResult = req.body?.metrics === undefined ? undefined : validateMetricsPayload(req.body.metrics);
  if (metricsResult && !metricsResult.ok) {
    return res.status(400).json({ error: 'error' in metricsResult ? metricsResult.error : 'Invalid metrics' });
  }

  try {
    const response = await chatWithBotServer(
      sanitizedMessage.message,
      sanitizeHistory(req.body?.history),
      validateLanguage(req.body?.language),
      portfolioResult?.ok ? portfolioResult.portfolio : undefined,
      metricsResult?.ok ? metricsResult.metrics : undefined,
    );
    return res.json(response);
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error(`Chat error: ${message}`);
    return res.status(500).json({ error: 'Failed to process chat' });
  }
});

export default router;
