import React, { useEffect, useMemo, useState } from 'react';
import { Portfolio, Language } from '../types';
import { TrendingUp, TrendingDown, ExternalLink, Target } from 'lucide-react';
import { cn } from '../utils/cn';
import { getSymbolCumulativeReturnFromYahoo } from '../services/financeService';
import { compactLabel, formatCurrency, formatPercent } from '../utils/format';

interface PortfolioTableProps {
  portfolio: Portfolio;
  language: Language;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ portfolio, language }) => {
  const allocKey = useMemo(() => {
    const parts = portfolio.assets
      .slice()
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
      .map(a => `${a.symbol}:${a.allocation.toFixed(6)}`)
      .join('|');
    return `${portfolio.isCustom ? 'custom' : portfolio.riskProfile}::${parts}`;
  }, [portfolio.assets, portfolio.isCustom, portfolio.riskProfile]);

  const [ytdBySymbol, setYtdBySymbol] = useState<Record<string, number>>({});
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
        start.setMonth(0, 1); // YTD Default

        const period1 = start.toISOString().slice(0, 10);
        const period2 = end.toISOString().slice(0, 10);

        const uniqueSymbols = [...new Set(portfolio.assets.map(a => a.symbol))];
        const results = await Promise.all(
          uniqueSymbols.map(async (sym) => {
            const ret = await getSymbolCumulativeReturnFromYahoo(sym, period1, period2, controller.signal);
            return [sym.toUpperCase(), ret] as const;
          })
        );
        const map = results.reduce((acc, [sym, ytd]) => {
          acc[sym] = ytd;
          return acc;
        }, {} as Record<string, number>);
        setYtdBySymbol(map);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load performance';
        if (!controller.signal.aborted) {
          setError(msg);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [allocKey]);

  const getChange = (symbol: string, fallback?: number) => {
    const sym = symbol.toUpperCase();
    if (ytdBySymbol[sym] !== undefined) return ytdBySymbol[sym] * 100;
    if (fallback !== undefined) return fallback;
    return null;
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <Target size={14} className="text-primary" />
          {language === 'en' ? 'Portfolio Composition' : 'Composición del Portafolio'}
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-[9px] font-black text-text-primary bg-[#131b2f] border border-border px-3 py-1.5 rounded-xl uppercase tracking-widest h-[26px] flex items-center">
            {language === 'en' ? 'YTD DATA' : 'DATOS YTD'}
          </div>
          <div className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl uppercase tracking-widest h-[26px] flex items-center">
            {portfolio.assets.length} {language === 'en' ? 'Instruments' : 'Instrumentos'}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar -mx-6 px-6">
        {error && (
          <div className="mb-4 text-error text-[10px] font-bold">
            {language === 'en' ? 'Performance data unavailable.' : 'Datos de desempeño no disponibles.'}
          </div>
        )}
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-4 text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">{language === 'en' ? 'Asset' : 'Activo'}</th>
              <th className="pb-4 text-[10px] font-black text-text-muted uppercase tracking-[0.15em] text-right">{language === 'en' ? 'Allocation' : 'Asignación'}</th>
              <th className="pb-4 text-[10px] font-black text-text-muted uppercase tracking-[0.15em] text-right">{language === 'en' ? 'Amount' : 'Cantidad'}</th>
              <th className="pb-4 text-[10px] font-black text-text-muted uppercase tracking-[0.15em] text-right">
                {language === 'en' ? 'Performance' : 'Desempeño'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {portfolio.assets.map((asset, i) => (
              <tr key={i} className="group hover:bg-white/5 transition-all duration-200">
                <td className="py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#1e293b] border border-white/5 flex items-center justify-center text-[10px] font-black text-text-primary group-hover:border-primary/50 group-hover:shadow-[0_0_10px_rgba(29,212,180,0.2)] transition-all duration-300">
                      {asset.symbol.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-text-primary flex items-center gap-1.5 font-mono">
                        {asset.symbol}
                        <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                      <div className="text-[10px] text-text-secondary font-bold truncate max-w-[120px] uppercase tracking-wider">{compactLabel(asset.name, 18)}</div>
                    </div>
                  </div>
                </td>
                <td className="py-5 text-right">
                  <div className="text-sm font-black text-text-primary font-mono">{(asset.allocation * 100).toFixed(1)}%</div>
                  <div className="w-16 h-1 bg-[#1e293b] rounded-full ml-auto mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${asset.allocation * 100}%` }} />
                  </div>
                </td>
                <td className="py-5 text-right">
                  <div className="text-sm font-bold text-text-secondary tracking-tight font-mono" title={`$${asset.amount?.toLocaleString()}`}>
                    {formatCurrency(asset.amount || 0, { compact: true, maxFractionDigits: 1 })}
                  </div>
                </td>
                <td className="py-5 text-right">
                  <div className={cn(
                    "text-xs font-black flex items-center justify-end gap-1.5 font-mono",
                    (loading || (getChange(asset.symbol, asset.change) ?? 0) >= 0) ? "text-success" : "text-error"
                  )}>
                    {loading ? (
                      <span className="w-6 h-3 bg-[#1e293b] rounded animate-pulse" />
                    ) : getChange(asset.symbol, asset.change) === null ? (
                      <span className="text-text-muted">{language === 'en' ? 'N/A' : 'N/D'}</span>
                    ) : (
                      <>
                        {(getChange(asset.symbol, asset.change) ?? 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatPercent(Math.abs(getChange(asset.symbol, asset.change) ?? 0), 2)}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
