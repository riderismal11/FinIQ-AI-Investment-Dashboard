export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type Language = 'en' | 'es';

export interface Asset {
  symbol: string;
  name: string;
  allocation: number;
  type: string;
  amount?: number;
  price?: number;
  change?: number;
}

export interface Portfolio {
  assets: Asset[];
  riskProfile: RiskProfile;
  totalAmount: number;
  timeHorizon: number;
  isCustom?: boolean;
}

export interface FinancialMetrics {
  expectedReturn: number;
  annualCAGR: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  var95: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface SessionData {
  amount: number;
  horizon: number;
  riskProfile: RiskProfile;
  language: Language;
  questionNumber: number;
  portfolio?: Portfolio;
  metrics?: FinancialMetrics;
  customPortfolio?: Portfolio;
}
