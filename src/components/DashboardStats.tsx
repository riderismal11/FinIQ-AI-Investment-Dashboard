import React from 'react';
import { Wallet, Calendar, ShieldCheck, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';
import { Language, RiskProfile } from '../types';

interface DashboardStatsProps {
  amount: number;
  horizon: number;
  riskProfile: RiskProfile;
  language: Language;
}

export const StatBadge = ({ icon, label, value, color = "text-text-primary" }: { icon: React.ReactNode, label: string, value: string, color?: string }) => (
  <div className="card flex items-center gap-4">
    <div className="min-w-12 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_0_0_10px_rgba(29,212,180,0.1)]">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-black text-text-muted uppercase tracking-wider mb-0.5 truncate">{label}</div>
      <div className={cn("text-lg md:text-xl font-black tracking-tight truncate font-mono", color)}>{value}</div>
    </div>
  </div>
);

export const DashboardStats: React.FC<DashboardStatsProps> = ({ amount, horizon, riskProfile, language }) => {
  const riskProfileLabel = {
    en: {
      conservative: 'CONSERVATIVE',
      moderate: 'MODERATE',
      aggressive: 'AGGRESSIVE',
    },
    es: {
      conservative: 'CONSERVADOR',
      moderate: 'MODERADO',
      aggressive: 'AGRESIVO',
    },
  }[language][riskProfile];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBadge 
        icon={<Wallet size={18} />} 
        label={language === 'en' ? 'Total Capital' : 'Capital Total'} 
        value={formatCurrency(amount, { compact: amount >= 100000 })} 
      />
      <StatBadge 
        icon={<Calendar size={18} />} 
        label={language === 'en' ? 'Time Horizon' : 'Horizonte'} 
        value={`${horizon} ${language === 'en' ? 'Years' : 'Años'}`} 
      />
      <StatBadge 
        icon={<ShieldCheck size={18} />} 
        label={language === 'en' ? 'Risk Profile' : 'Perfil de Riesgo'} 
        value={riskProfileLabel} 
      />
      <StatBadge 
        icon={<TrendingUp size={18} />} 
        label={language === 'en' ? 'Strategy' : 'Estrategia'} 
        value={language === 'en' ? 'OPTIMIZED' : 'OPTIMIZADA'} 
        color="text-success" 
      />
    </div>
  );
};
