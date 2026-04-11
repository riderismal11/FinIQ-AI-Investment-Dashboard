import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Language, Portfolio, RiskProfile } from '../types';
import {
  buildPortfolio,
  getPortfolioCumulativeReturnFromYahoo,
  getRiskFreeRateFromYahoo,
  getSymbolCumulativeReturnFromYahoo,
} from '../services/financeService';
import { formatPercent } from '../utils/format';

interface HistoricalComparatorProps {
  portfolio: Portfolio;
  language: Language;
}

type ComparisonRow = { label: string; returnPct: number; finalAmount: number };

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const HistoricalComparator: React.FC<HistoricalComparatorProps> = ({ portfolio, language }) => {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComparisonRow[]>([]);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const startDate = `${currentYear}-01-01`;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    const compare = async () => {
      try {
        const period1 = startDate;
        const period2 = toISODate(today);
        const amount = portfolio.totalAmount || 0;
        const riskFreeRate = await getRiskFreeRateFromYahoo(controller.signal);

        const strategies: Array<{ key: string; type: 'portfolio' | 'baseline' | 'savings'; riskProfile?: RiskProfile; symbol?: string }> = [
          { key: 'conservative', type: 'portfolio', riskProfile: 'conservative' },
          { key: 'moderate', type: 'portfolio', riskProfile: 'moderate' },
          { key: 'aggressive', type: 'portfolio', riskProfile: 'aggressive' },
          { key: 'sp500', type: 'baseline', symbol: '^GSPC' },
          { key: 'savings', type: 'savings' },
        ];

        const results = await Promise.all(
          strategies.map(async (strategy) => {
            if (strategy.type === 'portfolio' && strategy.riskProfile) {
              const strategyPortfolio = buildPortfolio(1, strategy.riskProfile, portfolio.timeHorizon || 1);
              const cumulativeReturn = await getPortfolioCumulativeReturnFromYahoo(strategyPortfolio, period1, period2, controller.signal);
              return {
                label: strategy.riskProfile,
                returnPct: cumulativeReturn * 100,
                finalAmount: amount * (1 + cumulativeReturn),
              };
            }

            if (strategy.type === 'baseline' && strategy.symbol) {
              const cumulativeReturn = await getSymbolCumulativeReturnFromYahoo(strategy.symbol, period1, period2, controller.signal);
              return {
                label: 'S&P 500',
                returnPct: cumulativeReturn * 100,
                finalAmount: amount * (1 + cumulativeReturn),
              };
            }

            const years = Math.max(
              0,
              (new Date(`${period2}T00:00:00Z`).getTime() - new Date(`${period1}T00:00:00Z`).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
            );
            const finalAmount = amount * Math.pow(1 + riskFreeRate, years);
            return {
              label: language === 'en' ? 'Savings' : 'Ahorros',
              returnPct: amount > 0 ? ((finalAmount / amount) - 1) * 100 : 0,
              finalAmount,
            };
          }),
        );

        if (controller.signal.aborted || requestId !== requestIdRef.current) return;

        const labelMap: Record<string, string> = {
          conservative: language === 'en' ? 'Conservative' : 'Conservador',
          moderate: language === 'en' ? 'Moderate' : 'Moderado',
          aggressive: language === 'en' ? 'Aggressive' : 'Agresivo',
          'S&P 500': 'S&P 500',
        };

        setData(
          results.map((result) => ({
            label: labelMap[result.label] ?? result.label,
            returnPct: result.returnPct,
            finalAmount: result.finalAmount,
          })),
        );
      } catch (compareError) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setError(compareError instanceof Error ? compareError.message : 'Failed to compare history');
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    compare();

    return () => controller.abort();
  }, [language, portfolio.timeHorizon, portfolio.totalAmount, currentYear, today]);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">
            {language === 'en' ? 'Historical Comparator' : 'Comparador Historico'}
          </h3>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-2">
            {language === 'en' ? `Return YTD ${currentYear}` : `Retorno YTD ${currentYear}`}
          </p>
        </div>
      </div>

      <div className="flex-1 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-full px-6">
              <div className="h-4 bg-[#1e293b] rounded animate-pulse w-2/3 mb-4" />
              <div className="h-64 bg-[#131b2f] rounded animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
            <div className="text-error font-bold">{language === 'en' ? 'Failed to compare' : 'No se pudo comparar'}</div>
            <div className="text-[10px] text-text-muted max-w-sm">{error}</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: 900 }}
                angle={-18}
                textAnchor="end"
                height={54}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: 900 }}
                tickFormatter={(value: number) => formatPercent(value, 0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c1220',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  fontSize: '11px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  fontWeight: 'bold',
                  padding: '12px 16px',
                  color: '#f8fafc',
                }}
                formatter={(value: number, _name: string, props: { payload?: ComparisonRow }) => [
                  formatPercent(value, 1),
                  props.payload?.label ?? '',
                ]}
              />
              <Bar dataKey="returnPct" fill="#4F46E5" radius={[10, 10, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HistoricalComparator;
