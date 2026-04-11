import type { SanitizedHistoryItem, SanitizedMetrics, SanitizedPortfolio } from '../security.js';

export type Language = 'en' | 'es';
export type Portfolio = SanitizedPortfolio;
export type FinancialMetrics = SanitizedMetrics;

export interface AiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface IntentResult {
  text: string;
  functionCalls: AiFunctionCall[];
}

export interface AiInsightsRequest {
  portfolio: Portfolio;
  metrics: FinancialMetrics;
  language: Language;
}

export interface AiChatRequest {
  message: string;
  history: SanitizedHistoryItem[];
  language: Language;
  portfolio?: Portfolio;
  metrics?: FinancialMetrics;
}

export interface AiChatResponse {
  text?: string;
  functionCalls?: AiFunctionCall[];
}
