import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Portfolio, Language } from '../types';
import { getAssetYtdReturnPercent } from '../services/financeService';
import { compactLabel, formatPercent } from '../utils/format';

interface SectorPerformanceBarsProps {
  portfolio: Portfolio;
  language: Language;
}

export const SectorPerformanceBars: React.FC<SectorPerformanceBarsProps> = ({ portfolio, language }) => {
  const allocKey = useMemo(() => {
    const allocs = portfolio.assets
      .slice()
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
      .map(a => `${a.symbol}:${a.allocation.toFixed(6)}:${a.type ?? ''}`)
      .join('|');
    return `${portfolio.isCustom ? 'custom' : portfolio.riskProfile}::${allocs}`;
  }, [portfolio.assets, portfolio.isCustom, portfolio.riskProfile]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bars, setBars] = useState<Array<{ label: string; valuePct: number }>>([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const uniqueSymbols = [...new Set(portfolio.assets.map(a => a.symbol))];
        const ytdPairs = await Promise.all(
          uniqueSymbols.map(async (sym) => [sym.toUpperCase(), await getAssetYtdReturnPercent(sym, controller.signal)] as const)
        );
        const ytdBySymbol = ytdPairs.reduce((acc, [sym, ytd]) => {
          acc[sym] = ytd; // decimal
          return acc;
        }, {} as Record<string, number>);

        const grouped: Record<string, { weightedReturn: number; weight: number }> = {};
        for (const a of portfolio.assets) {
          const type = a.type ?? 'Other';
          if (!grouped[type]) grouped[type] = { weightedReturn: 0, weight: 0 };
          const r = ytdBySymbol[a.symbol.toUpperCase()];
          if (!Number.isFinite(r)) continue;
          grouped[type].weightedReturn += a.allocation * r;
          grouped[type].weight += a.allocation;
        }

        const nextBars = Object.entries(grouped)
          .map(([type, v]) => ({
            label: type,
            valuePct: v.weight > 0 ? v.weightedReturn / v.weight * 100 : 0,
          }))
          .sort((a, b) => b.valuePct - a.valuePct);

        setBars(nextBars);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load sector performance';
        if (!controller.signal.aborted) setError(msg);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [allocKey]);

  return (
    <div className="card h-[360px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          {language === 'en' ? 'Sector Performance' : 'Rendimiento por Sector'}
        </h3>
        <div className="text-[9px] font-black text-primary bg-primary/5 border border-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
          {language === 'en' ? 'YTD' : 'YTD'}
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
            <div className="text-error font-bold">{language === 'en' ? 'Failed to load' : 'No se pudo cargar'}</div>
            <div className="text-[10px] text-text-muted max-w-sm">{error}</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: '900' }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-24}
                textAnchor="end"
                height={64}
                tickFormatter={(label: string) => compactLabel(label, 12)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: '900' }}
                tickFormatter={(v: number) => formatPercent(v, 0)}
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
                formatter={(value: number) => [formatPercent(value, 1), 'YTD']}
              />
              <Bar dataKey="valuePct" fill="#1dd4b4" radius={[10, 10, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SectorPerformanceBars;

