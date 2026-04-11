import React from 'react';
import { Portfolio, Language, RiskProfile, FinancialMetrics } from '../types';
import { Shield, TrendingUp, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency, formatPercent } from '../utils/format';

interface StrategyCardsProps {
  portfolio: Portfolio;
  metrics: FinancialMetrics;
  language: Language;
  customPortfolio?: Portfolio;
  onRestoreCustom?: () => void;
  onSelectStrategy: (risk: RiskProfile) => void;
  strategyAnnualCAGRs?: Record<RiskProfile, number>;
}

interface StrategyConfig {
  key: RiskProfile;
  label: { en: string; es: string };
  description: { en: string; es: string };
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

const strategies: StrategyConfig[] = [
  {
    key: 'conservative',
    label: { en: 'Conservative', es: 'Conservador' },
    description: { en: 'Capital preservation with stable income', es: 'Preservación de capital con ingresos estables' },
    icon: <Shield size={20} />,
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/30',
  },
  {
    key: 'moderate',
    label: { en: 'Moderate', es: 'Moderado' },
    description: { en: 'Balanced growth with managed risk', es: 'Crecimiento equilibrado con riesgo gestionado' },
    icon: <TrendingUp size={20} />,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
  },
  {
    key: 'aggressive',
    label: { en: 'Aggressive', es: 'Agresivo' },
    description: { en: 'Maximum growth potential, higher volatility', es: 'Máximo potencial de crecimiento, mayor volatilidad' },
    icon: <Zap size={20} />,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/30',
  },
];

export const StrategyCards: React.FC<StrategyCardsProps> = ({ portfolio, metrics, language, customPortfolio, onRestoreCustom, onSelectStrategy, strategyAnnualCAGRs }) => {
  const amount = portfolio.totalAmount;
  const horizon = portfolio.timeHorizon;

  if (portfolio.isCustom) {
    const projectedValue = amount + metrics.expectedReturn;
    const totalGain = metrics.expectedReturn;

    return (
      <div className="card border-2 border-primary/20 !p-6 sm:!p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Zap size={16} />
              </div>
              <h4 className="text-lg font-black text-text-primary">
                {language === 'en' ? 'AI Custom Strategy' : 'Estrategia Personalizada'}
              </h4>
            </div>
            <p className="text-[11px] font-medium text-text-secondary max-w-md ml-10">
                {language === 'en' 
                ? 'This portfolio has been dynamically tailored to your exact requests by FinIQ Assistant. It deviates from standard benchmarks.'
                : 'Este portafolio ha sido adaptado dinámicamente a tus peticiones por FinIQ. Difiere de los modelos estándar.'}
            </p>
          </div>
          
          <button 
            onClick={() => onSelectStrategy('moderate')}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#131b2f] hover:bg-[#1e293b] text-text-secondary hover:text-white px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 border border-white/5"
          >
            {language === 'en' ? 'Reset to Recommended' : 'Volver a Recomendadas'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10 ml-0 sm:ml-10">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {language === 'en' ? 'Target CAGR (Annual)' : 'CAGR Anual Objetivo'}
            </span>
            <div className="text-2xl font-black text-primary font-mono">
              {formatPercent(metrics.annualCAGR * 100)}
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {language === 'en' ? `${horizon}Y Value Projection` : `Proyección a ${horizon} Años`}
            </span>
            <div className="text-2xl font-black text-text-primary tracking-tight font-mono">
              {formatCurrency(projectedValue, { compact: projectedValue >= 100000 })}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {language === 'en' ? 'Calculated Gain' : 'Ganancia Calculada'}
            </span>
            <div className="text-xl font-bold text-success font-mono">
              +{formatCurrency(totalGain, { compact: totalGain >= 100000 })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!strategyAnnualCAGRs) {
    return (
      <div className="card flex flex-col gap-3">
        <div className="h-4 w-48 bg-[#1e293b] rounded" />
        <div className="h-4 w-32 bg-[#1e293b] rounded" />
        <div className="h-10 w-full bg-[#131b2f] rounded-lg animate-pulse" />
      </div>
    );
  }

  const strategyProjections = strategies.map((strategy) => {
    const annualCAGR = strategyAnnualCAGRs[strategy.key] ?? 0;
    const projectedValue = amount * Math.pow(1 + annualCAGR, horizon);
    const totalGain = projectedValue - amount;
    return { strategy, annualCAGR, projectedValue, totalGain };
  });

  const maxProjected = Math.max(...strategyProjections.map(p => p.projectedValue), amount);

  return (
    <div>
      {customPortfolio && !portfolio.isCustom && (
        <div className="mb-4 flex justify-end">
          <button 
            onClick={onRestoreCustom}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl transition-all"
          >
            <Zap size={14} />
            {language === 'en' ? 'Restore AI Custom Strategy' : 'Restaurar Estrategia de IA'}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategyProjections.map(({ strategy, annualCAGR, projectedValue, totalGain }) => {
        const isActive = portfolio.riskProfile === strategy.key && !portfolio.isCustom;
        const progressWidth = maxProjected > 0 ? (projectedValue / maxProjected) * 100 : 0;

        return (
          <button
            key={strategy.key}
            onClick={() => onSelectStrategy(strategy.key)}
            className={cn(
              "relative text-left rounded-[24px] p-6 border-2 transition-all duration-300 w-full",
              isActive
                ? `${strategy.bg} ${strategy.border} shadow-[0_4px_20px_rgba(0,0,0,0.2)]`
                : "bg-transparent border-transparent hover:border-white/10 hover:bg-white/5 hover:shadow-sm hover:-translate-y-1"
            )}
          >
            {isActive && (
              <div className="absolute -top-2.5 right-4">
                <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm", strategy.bg, strategy.color, `border ${strategy.border}`)}>
                  <CheckCircle2 size={10} />
                  {language === 'en' ? 'Your Strategy' : 'Tu Estrategia'}
                </div>
              </div>
            )}

            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors", isActive ? strategy.bg : "bg-[#131b2f] border border-white/5", isActive ? strategy.color : "text-text-secondary")}>
              {strategy.icon}
            </div>

            <h4 className="text-sm font-black text-text-primary mb-1">
              {strategy.label[language]}
            </h4>
            <p className="text-[10px] text-text-secondary font-bold mb-5 leading-relaxed">
              {strategy.description[language]}
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  {language === 'en' ? 'CAGR' : 'CAGR'}
                </span>
                <span className={cn("text-sm font-black font-mono", isActive ? strategy.color : "text-text-primary")}>
                    {formatPercent(annualCAGR * 100)}
                </span>
              </div>

              <div className="h-[2px] bg-border" />

              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  {language === 'en' ? `${horizon}Y Projection` : `Proyección ${horizon}A`}
                </span>
                <span className={cn("text-lg font-black tracking-tight font-mono", isActive ? strategy.color : "text-text-primary")}>
                  {formatCurrency(projectedValue, { compact: projectedValue >= 100000 })}
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#131b2f] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isActive ? strategy.bg : "bg-primary/15"
                  )}
                  style={{ width: `${Math.min(Math.max(progressWidth, 0), 100)}%` }}
                />
              </div>

              <div className="text-[10px] font-bold text-right font-mono">
                <span className="text-success">
                  +{formatCurrency(totalGain, { compact: totalGain >= 100000 })} {language === 'en' ? 'gain' : 'ganancia'}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
  );
};

export default StrategyCards;
