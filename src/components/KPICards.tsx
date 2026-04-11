import React from 'react';
import { FinancialMetrics, Language, Portfolio } from '../types';
import { TrendingUp, TrendingDown, Activity, Target, Zap } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency, formatPercent } from '../utils/format';

interface KPICardsProps {
  metrics: FinancialMetrics;
  language: Language;
  portfolio: Portfolio;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics, language, portfolio }) => {
  const years = portfolio.timeHorizon || 0;
  const expectedGain = metrics.expectedReturn;

  const cards = [
    {
      label: language === 'en' ? 'Expected Return' : 'Retorno Esperado',
      value: formatCurrency(expectedGain, { compact: expectedGain >= 1_000_000 }),
      sub: language === 'en' ? `${years}Y projected gain` : `${years}A ganancia proyectada`,
      icon: <TrendingUp size={16} />,
      color: 'text-success',
      bg: 'bg-success/5',
      borderGradient: 'from-success/80'
    },
    {
      label: language === 'en' ? 'Annual CAGR' : 'CAGR Anual',
      value: formatPercent(metrics.annualCAGR * 100),
      sub: language === 'en' ? 'From historical data' : 'De datos históricos',
      icon: <Target size={16} />,
      color: 'text-primary',
      bg: 'bg-primary/5',
      borderGradient: 'from-primary/80'
    },
    {
      label: language === 'en' ? 'Volatility' : 'Volatilidad',
      value: formatPercent(metrics.volatility * 100),
      sub: language === 'en' ? 'Risk Level' : 'Nivel de Riesgo',
      icon: <Activity size={16} />,
      color: 'text-warning',
      bg: 'bg-warning/5',
      borderGradient: 'from-warning/80'
    },
    {
      label: language === 'en' ? 'Sharpe Ratio' : 'Ratio de Sharpe',
      value: metrics.sharpeRatio.toFixed(2),
      sub: language === 'en' ? 'Efficiency' : 'Eficiencia',
      icon: <Zap size={16} />,
      color: 'text-secondary',
      bg: 'bg-secondary/5',
      borderGradient: 'from-secondary/80'
    },
    {
      label: language === 'en' ? 'Max Drawdown' : 'Caída Máxima',
      value: formatPercent(metrics.maxDrawdown * 100),
      sub: language === 'en' ? 'Worst Case' : 'Peor Caso',
      icon: <TrendingDown size={16} />,
      color: 'text-error',
      bg: 'bg-error/5',
      borderGradient: 'from-error/80'
    }
  ];

  const fitValueClass = (value: string) =>
    value.length > 12 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="card group relative overflow-hidden min-h-[136px] flex flex-col justify-between border-t-0 p-5 rounded-[24px]" style={{ animationDelay: `${i * 50}ms` }}>
          <div className={cn("absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r to-transparent", card.borderGradient)} />
          <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform group-hover:scale-110", card.bg)} />
          
          <div className="flex justify-between items-start mb-4">
            <div className={cn("p-2.5 rounded-xl bg-[#131b2f] border border-white/5 text-text-secondary group-hover:bg-primary group-hover:text-[#0a0f1a] transition-all duration-300 shadow-sm")}>
              {card.icon}
            </div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.15em] text-right leading-tight max-w-[56%]">{card.sub}</span>
          </div>
          
          <div className="space-y-1">
            <div className="text-[10px] font-black text-text-secondary uppercase tracking-[0.12em]">{card.label}</div>
            <div className={cn("font-black text-text-primary tracking-tight leading-none font-mono", fitValueClass(card.value), card.color)}>{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
