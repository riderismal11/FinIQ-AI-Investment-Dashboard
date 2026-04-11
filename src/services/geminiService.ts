import { FinancialMetrics, Language, Portfolio } from '../types';

type ChatHistoryItem = { role: 'user' | 'model'; parts: [{ text: string }] };
type ChatResponse = { text?: string; functionCalls?: Array<{ name: string; args: Record<string, unknown> }> };

const MIN_AI_CALL_GAP_MS = 1000;
let lastAiCallAt = 0;

async function throttleAiCall(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, MIN_AI_CALL_GAP_MS - (now - lastAiCallAt));
  if (waitMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, waitMs));
  }
  lastAiCallAt = Date.now();
}

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export const generateInsights = async (
  portfolio: Portfolio,
  metrics: FinancialMetrics,
  language: Language,
): Promise<string> => {
  await throttleAiCall();

  const response = await fetch('/api/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolio, metrics, language }),
  });

  const payload = await parseJson<{ text?: string; error?: string }>(response).catch(() => ({} as { text?: string; error?: string }));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || 'Failed to generate insights');
  }

  return payload.text ?? 'No insights generated.';
};

export const chatWithBot = async (
  message: string,
  history: ChatHistoryItem[],
  language: Language,
  portfolio?: Portfolio,
  metrics?: FinancialMetrics,
): Promise<ChatResponse> => {
  await throttleAiCall();

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.trim(),
      history,
      language,
      portfolio,
      metrics,
    }),
  });

  const payload = await parseJson<ChatResponse & { error?: string }>(response).catch(() => ({} as ChatResponse & { error?: string }));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || 'Chat failed');
  }

  return payload;
};
