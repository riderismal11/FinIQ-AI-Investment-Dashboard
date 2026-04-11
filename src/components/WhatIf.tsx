import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { FinancialMetrics, Portfolio, Language } from '../types';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/format';

interface WhatIfProps {
  portfolio: Portfolio;
  language: Language;
  metrics: FinancialMetrics;
}

export const WhatIf: React.FC<WhatIfProps> = ({ portfolio, language, metrics }) => {
  const [scenario, setScenario] = useState<'bull' | 'bear' | 'stagnant'>('bull');

  const scenarioReturns = useMemo(() => {
    // Educational scenarios derived from observed historical metrics (not a guarantee).
    const bullPct = metrics.annualCAGR * 100 + metrics.volatility * 100 * 0.25;
    const bearPct = -(metrics.maxDrawdown * 100);
    const stagnantPct = metrics.annualCAGR * 100 * 0.1;
    const maxAbs = Math.max(Math.abs(bullPct), Math.abs(bearPct), Math.abs(stagnantPct), 0.0001);

    return {
      bull: { pct: bullPct, width: (Math.abs(bullPct) / maxAbs) * 100 },
      bear: { pct: bearPct, width: (Math.abs(bearPct) / maxAbs) * 100 },
      stagnant: { pct: stagnantPct, width: (Math.abs(stagnantPct) / maxAbs) * 100 },
    } as const;
  }, [metrics.annualCAGR, metrics.maxDrawdown, metrics.volatility]);

  const scenarios = {
    bull: {
      label: language === 'en' ? 'Bull Market' : 'Mercado Alcista',
      return: `${scenarioReturns.bull.pct >= 0 ? '+' : ''}${scenarioReturns.bull.pct.toFixed(1)}%`,
      color: 'text-success',
      bg: 'bg-success/5',
      border: 'border-success/20',
      desc: language === 'en' ? 'Optimistic scenario derived from historical CAGR.' : 'Escenario optimista derivado del CAGR histórico.'
    },
    bear: {
      label: language === 'en' ? 'Bear Market' : 'Mercado Bajista',
      return: `${scenarioReturns.bear.pct >= 0 ? '+' : ''}${scenarioReturns.bear.pct.toFixed(1)}%`,
      color: 'text-error',
      bg: 'bg-error/5',
      border: 'border-error/20',
      desc: language === 'en' ? 'Downside scenario aligned with observed max drawdown.' : 'Escenario de caída alineado con el drawdown máximo observado.'
    },
    stagnant: {
      label: language === 'en' ? 'Stagnant' : 'Estancado',
      return: `${scenarioReturns.stagnant.pct >= 0 ? '+' : ''}${scenarioReturns.stagnant.pct.toFixed(1)}%`,
      color: 'text-warning',
      bg: 'bg-warning/5',
      border: 'border-warning/20',
      desc: language === 'en' ? 'Low-growth scenario based on weak historical drift.' : 'Escenario de bajo crecimiento basado en la deriva histórica.'
    }
  } as const;

  const totalValue = portfolio.assets.reduce((sum, asset) => sum + (asset.amount || 0), 0);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <RefreshCw size={14} className="text-primary" />
          {language === 'en' ? 'Scenario Simulator' : 'Simulador de Escenarios'}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
        {(['bull', 'bear', 'stagnant'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={cn(
              "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
              scenario === s 
                ? `${scenarios[s].bg} ${scenarios[s].color} ${scenarios[s].border} shadow-sm` 
                : "bg-[#131b2f] border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary"
            )}
          >
            {scenarios[s].label}
          </button>
        ))}
      </div>

      <div className={cn(
        "border rounded-2xl p-4 relative overflow-hidden transition-all duration-500",
        scenarios[scenario].bg,
        scenarios[scenario].border
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
            {language === 'en' ? 'Projected Outcome' : 'Resultado Proyectado'}
          </div>
          <div className={cn("text-xl font-black tracking-tight", scenarios[scenario].color)}>
            {scenarios[scenario].return}
          </div>
        </div>
        
        <div className="text-xs text-text-secondary mb-3 leading-relaxed font-medium">
          {scenarios[scenario].desc} {language === 'en' ? 'Your portfolio would reach' : 'Su portafolio alcanzaría'}{' '}
          <strong className="text-text-primary font-black">
            {formatCurrency(Math.round(totalValue * (1 + scenarioReturns[scenario].pct / 100)), { compact: true, maxFractionDigits: 1 })}
          </strong>{' '}
          {language === 'en' ? 'in this scenario.' : 'en este escenario.'}
        </div>

        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-out",
              scenario === 'bull' ? "bg-success" :
              scenario === 'bear' ? "bg-error" :
              "bg-warning"
            )} 
            style={{ width: `${Math.min(100, Math.max(5, scenarioReturns[scenario].width))}%` }} 
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="border-t border-[rgba(29,212,180,0.1)] my-3"></div>
        <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">
          {language === 'en' ? 'All Scenarios' : 'Todos los Escenarios'}
        </div>
        
        <div className="flex flex-col gap-1.5">
          {(['bull', 'bear', 'stagnant'] as const).map((s) => {
            const isActive = scenario === s;
            const finalValue = totalValue * (1 + scenarioReturns[s].pct / 100);
            const colors = {
              bull: '#1dd4b4',
              bear: '#ef4444',
              stagnant: '#94a3b8'
            } as const;

            return (
              <div
                key={s}
                className="h-[52px] rounded-md px-3 py-2 flex flex-col justify-center"
                style={{
                  borderLeft: isActive ? '2px solid #1dd4b4' : '3px solid ' + colors[s],
                  paddingLeft: '12px',
                  background: isActive ? 'rgba(29, 212, 180, 0.07)' : 'rgba(255,255,255,0.03)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-black uppercase tracking-wider" style={{ color: colors[s] }}>
                    {s === 'bull' ? 'BULL MARKET' : s === 'bear' ? 'BEAR MARKET' : 'STAGNANT'}
                  </span>
                  <span className="text-[0.7rem] font-black" style={{ color: colors[s] }}>
                    {scenarioReturns[s].pct >= 0 ? '+' : ''}{scenarioReturns[s].pct.toFixed(1)}%
                  </span>
                </div>
                <span className="text-[0.7rem] text-[#94a3b8]">
                  {formatCurrency(Math.round(finalValue), { compact: true, maxFractionDigits: 1 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 flex items-center gap-1">
          <span>⚠</span>
          {language === 'en' ? 'Disclaimer' : 'Aviso Legal'}
        </div>
        
        <div 
          className="rounded-md px-3 py-2.5"
          style={{ 
            background: 'rgba(255, 193, 7, 0.04)',
            borderLeft: '2px solid rgba(255, 193, 7, 0.3)'
          }}
        >
          <div className="text-[0.68rem] text-[#94a3b8] leading-relaxed">
            {language === 'en' 
              ? 'Past performance does not guarantee future results.' 
              : 'El rendimiento pasado no garantiza resultados futuros.'}
          </div>
          <div className="text-[0.68rem] text-[#94a3b8] leading-relaxed mt-1">
            {language === 'en' 
              ? 'This is not financial advice. Data sourced from Yahoo Finance & Alpaca.' 
              : 'Esto no es asesoramiento financiero. Datos obtenidos de Yahoo Finance y Alpaca.'}
          </div>
        </div>
      </div>
    </div>
  );
};
