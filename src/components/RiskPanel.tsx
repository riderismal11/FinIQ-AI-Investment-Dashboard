import React from 'react';
import { FinancialMetrics, Language, Portfolio } from '../types';
import { Shield, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency, formatPercent } from '../utils/format';

interface RiskPanelProps {
  metrics: FinancialMetrics;
  language: Language;
  portfolio: Portfolio;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ metrics, language, portfolio }) => {
  const vol = metrics.volatility; // decimal (e.g. 0.12 = 12%)
  const dd = metrics.maxDrawdown; // decimal (e.g. 0.20 = 20%)
  const annualReturn = metrics.annualCAGR;

  const returnLevel = annualReturn < 0.08 ? 'Low' : annualReturn < 0.15 ? 'Moderate' : 'High';
  const volLevel = vol < 0.10 ? 'Low' : vol < 0.20 ? 'Moderate' : 'High';
  const ddLevel = dd < 0.15 ? 'Low' : dd < 0.35 ? 'Moderate' : 'High';

  const riskLevel = (volLevel === 'High' || ddLevel === 'High' || returnLevel === 'High')
    ? 'High'
    : (volLevel === 'Moderate' || ddLevel === 'Moderate' || returnLevel === 'Moderate')
      ? 'Moderate'
      : 'Low';
  const riskColor = riskLevel === 'High' ? 'text-error' : riskLevel === 'Moderate' ? 'text-warning' : 'text-success';
  const riskBg = riskLevel === 'High' ? 'bg-error/5' : riskLevel === 'Moderate' ? 'bg-warning/5' : 'bg-success/5';
  const riskBorder = riskLevel === 'High' ? 'border-error/20' : riskLevel === 'Moderate' ? 'border-warning/20' : 'border-success/20';

  // Risk score from 0 (safest) to 1 (most volatile)
  let riskScore = (vol / 0.25) * 0.4 + (dd / 0.4) * 0.3 + (annualReturn / 0.20) * 0.3;
  if (!Number.isFinite(riskScore)) riskScore = 0.5;
  riskScore = Math.max(0, Math.min(1, riskScore));
  
  // Safe is left (0-33%), Balanced is middle (33-66%), Volatile is right (66-100%).
  const indicatorLeft = `${Math.round(riskScore * 100)}%`;
  const monthlyVaRAmount = (metrics.var95 || 0) * (portfolio.totalAmount || 0);
  const categoryCount = new Set(portfolio.assets.map(a => a.type).filter(Boolean)).size;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center gap-2.5 mb-8">
        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <Shield size={14} className="text-primary" />
          {language === 'en' ? 'Risk Intelligence' : 'Inteligencia de Riesgo'}
        </h3>
      </div>

      <div className="space-y-6 flex-1">
        <div className={cn("border rounded-[24px] p-6 transition-all duration-500", riskBg, riskBorder)}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{language === 'en' ? 'Assessment' : 'Evaluación'}</span>
            <span className={cn(
              "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border shadow-sm",
              riskBg, riskColor, riskBorder
            )}>
              {language === 'en' ? riskLevel : riskLevel === 'High' ? 'Alto' : riskLevel === 'Moderate' ? 'Moderado' : 'Bajo'}
            </span>
          </div>
          
          <div className="relative h-2 w-full bg-[#1e293b] rounded-full overflow-hidden flex">
            <div className="h-full bg-success/40" style={{ width: '33.33%' }} />
            <div className="h-full bg-warning/40" style={{ width: '33.33%' }} />
            <div className="h-full bg-error/40" style={{ width: '33.33%' }} />
            
            {/* Indicator */}
            <div 
              className={cn("absolute top-0 h-full w-1 bg-text-primary shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-1000 ease-out")}
              style={{ left: indicatorLeft }}
            />
          </div>
          
          <div className="mt-3 flex justify-between text-[9px] text-text-muted font-black uppercase tracking-widest">
            <span>{language === 'en' ? 'Safe' : 'Seguro'}</span>
            <span>{language === 'en' ? 'Balanced' : 'Balanceado'}</span>
            <span>{language === 'en' ? 'Volatile' : 'Volatil'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <RiskItem 
            icon={<CheckCircle2 size={16} />} 
            color="text-success"
            title={language === 'en' ? 'Diversification' : 'Diversificación'}
            desc={language === 'en' ? `Spread across ${categoryCount} categories.` : `Distribuido en ${categoryCount} categorías.`}
          />
          <RiskItem 
            icon={<DollarSign size={16} />} 
            color="text-primary"
            title={language === 'en' ? 'VaR (95%)' : 'VaR (95%)'}
            desc={language === 'en' 
              ? `Max monthly loss: ${formatCurrency(monthlyVaRAmount, { compact: monthlyVaRAmount >= 100000 })}`
              : `Pérdida máx mensual: ${formatCurrency(monthlyVaRAmount, { compact: monthlyVaRAmount >= 100000 })}`
            }
          />
          <RiskItem 
            icon={<AlertTriangle size={16} />} 
            color="text-warning"
            title={language === 'en' ? 'Max Drawdown' : 'Caída Máxima'}
            desc={language === 'en' 
              ? `Worst historical decline: ${formatPercent(metrics.maxDrawdown * 100)}`
              : `Peor caída histórica: ${formatPercent(metrics.maxDrawdown * 100)}`
            }
          />
        </div>
      </div>
    </div>
  );
};

const RiskItem = ({ icon, color, title, desc }: { icon: React.ReactNode, color: string, title: string, desc: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#131b2f] border border-border group hover:border-primary/20 hover:shadow-sm transition-all duration-300">
    <div className={cn("mt-0.5", color)}>{icon}</div>
    <div>
      <div className="text-[11px] font-black text-text-primary uppercase tracking-tight">{title}</div>
      <div className="text-[10px] text-text-secondary font-bold leading-relaxed mt-0.5">
        {desc}
      </div>
    </div>
  </div>
);
