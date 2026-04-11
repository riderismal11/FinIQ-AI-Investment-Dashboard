import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Info, ShieldAlert } from 'lucide-react';
import { Language, Portfolio } from '../types';
import { getAssetAnnualizedVolatility, getSymbolCumulativeReturnFromYahoo } from '../services/financeService';
import { formatPercent } from '../utils/format';

interface RiskReturnChartProps {
  portfolio: Portfolio;
  language: Language;
}

interface ScatterPoint {
  name: string;
  risk: number;
  return: number;
  size: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const CustomTooltip = ({ active, payload, language }: TooltipProps & { language: Language }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-[#0c1220] border border-white/5 rounded-2xl shadow-lg p-4 min-w-[140px] text-[#f8fafc]">
      <div className="text-xs font-black text-text-primary mb-2">{point.name}</div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-text-muted font-bold">{language === 'en' ? 'Volatility' : 'Volatilidad'}</span>
          <span className="font-black text-text-secondary">{point.risk.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-text-muted font-bold">{language === 'en' ? 'Return' : 'Retorno'}</span>
          <span className={point.return >= 0 ? 'font-black text-success' : 'font-black text-error'}>
            {formatPercent(point.return, 1, true)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const RiskReturnChart: React.FC<RiskReturnChartProps> = ({ portfolio, language }) => {
  const allocKey = useMemo(() => {
    const allocations = portfolio.assets
      .slice()
      .sort((left, right) => left.symbol.localeCompare(right.symbol))
      .map((asset) => `${asset.symbol}:${asset.allocation.toFixed(6)}`)
      .join('|');
    return `${portfolio.isCustom ? 'custom' : portfolio.riskProfile}:${allocations}`;
  }, [portfolio.assets, portfolio.isCustom, portfolio.riskProfile]);

  const [data, setData] = useState<ScatterPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const end = new Date();
        const start = new Date(end);
        start.setMonth(0, 1);

        const period1 = start.toISOString().slice(0, 10);
        const period2 = end.toISOString().slice(0, 10);
        const uniqueSymbols = [...new Set(portfolio.assets.map((asset) => asset.symbol))];

        const results = await Promise.all(
          uniqueSymbols.map(async (symbol) => {
            const [volatility, cumulativeReturn] = await Promise.all([
              getAssetAnnualizedVolatility(symbol, { period1, period2, signal: controller.signal }),
              getSymbolCumulativeReturnFromYahoo(symbol, period1, period2, controller.signal),
            ]);
            return [symbol.toUpperCase(), volatility * 100, cumulativeReturn * 100] as const;
          }),
        );

        const volatilityBySymbol: Record<string, number> = {};
        const returnBySymbol: Record<string, number> = {};

        for (const [symbol, volatilityPct, returnPct] of results) {
          volatilityBySymbol[symbol] = volatilityPct;
          returnBySymbol[symbol] = returnPct;
        }

        setData(
          portfolio.assets.map((asset) => ({
            name: asset.symbol,
            risk: volatilityBySymbol[asset.symbol.toUpperCase()] ?? 0,
            return: returnBySymbol[asset.symbol.toUpperCase()] ?? 0,
            size: asset.allocation * 1000,
          })),
        );
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load risk/return data');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [allocKey]);

  return (
    <div className="card h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <ShieldAlert size={14} className="text-primary" />
            {language === 'en' ? 'Risk vs. Return' : 'Riesgo vs. Retorno'}
          </h3>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider !mt-2 flex items-center gap-2">
            <span>{language === 'en' ? 'Volatility vs. Return' : 'Volatilidad vs. Retorno'}</span>
            <span className="bg-[#131b2f] border border-border px-2 py-0.5 rounded-lg text-text-primary text-[9px] shadow-sm">
              {language === 'en' ? 'YTD DATA' : 'DATOS YTD'}
            </span>
          </p>
        </div>
        <Info size={14} className="text-text-muted cursor-help" />
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
            <div className="text-error font-bold">{language === 'en' ? 'Failed to load chart' : 'No se pudo cargar el grafico'}</div>
            <div className="text-[10px] text-text-muted max-w-sm">{error}</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 16, bottom: 18, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="risk"
                name="Risk"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: '900' }}
                tickFormatter={(value: number) => `${value.toFixed(0)}%`}
              />
              <YAxis
                type="number"
                dataKey="return"
                name="Return"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: '900' }}
                tickFormatter={(value: number) => `${value.toFixed(0)}%`}
              />
              <ZAxis type="number" dataKey="size" range={[150, 800]} />
              <Tooltip content={<CustomTooltip language={language} />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />
              <Scatter name="Assets" data={data} fill="#8884d8" animationDuration={1500}>
                {data.map((point, index) => (
                  <Cell key={`${point.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RiskReturnChart;
