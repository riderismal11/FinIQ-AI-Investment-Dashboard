import React from 'react';
import { ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { Language } from '../types';

interface BrokeragesProps {
  language: Language;
}

export const Brokerages: React.FC<BrokeragesProps> = ({ language }) => {
  const brokers = [
    { name: 'Interactive Brokers', type: { en: 'Professional', es: 'Profesional' }, fee: { en: 'Low', es: 'Bajas' }, icon: 'IB', url: 'https://www.interactivebrokers.com' },
    { name: 'Charles Schwab', type: { en: 'Full Service', es: 'Servicio Total' }, fee: { en: 'Zero', es: 'Cero' }, icon: 'CS', url: 'https://www.schwab.com' },
    { name: 'Fidelity', type: { en: 'Balanced', es: 'Balanceado' }, fee: { en: 'Zero', es: 'Cero' }, icon: 'FD', url: 'https://www.fidelity.com' },
    { name: 'Robinhood', type: { en: 'Beginner', es: 'Inicial' }, fee: { en: 'Zero', es: 'Cero' }, icon: 'RH', url: 'https://robinhood.com' },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary">
            <ShieldCheck size={18} />
          </div>
          <h3 className="text-sm font-bold m-0">{language === 'en' ? 'Execution Platforms' : 'Plataformas de Ejecucion'}</h3>
        </div>
        <div className="text-[10px] font-bold text-text-muted flex items-center gap-1 bg-[#131b2f] border border-border px-2.5 py-1 rounded-full">
          <Zap size={10} className="text-primary" />
          {language === 'en' ? 'TRUSTED PARTNERS' : 'SOCIOS CONFIABLES'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {brokers.map((broker) => (
          <button
            key={broker.name}
            onClick={() => window.open(broker.url, '_blank', 'noopener,noreferrer')}
            className="bg-[#131b2f] border border-white/5 rounded-2xl p-5 group hover:border-white/10 hover:bg-[#1e293b] hover:shadow-md transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/50 flex flex-col w-full hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4 w-full">
              <div className="text-lg font-black text-text-primary">{broker.icon}</div>
              <ExternalLink size={14} className="text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <div className="text-sm font-bold text-text-primary mb-1.5">{broker.name}</div>
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{broker.type[language]}</span>
              <span className="text-[10px] font-bold text-primary">{broker.fee[language]} {language === 'en' ? 'FEES' : 'COMIS.'}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-5 bg-[#131b2f] border border-border rounded-2xl flex items-start gap-4">
        <div className="mt-0.5 text-primary"><Zap size={18} /></div>
        <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
          {language === 'en'
            ? 'FinIQ is an intelligence platform, not a brokerage. We recommend these established platforms for executing your investment strategy based on your profile.'
            : 'FinIQ es una plataforma de inteligencia, no un broker. Recomendamos estas plataformas para ejecutar tu estrategia de inversion segun tu perfil.'}
        </p>
      </div>
    </div>
  );
};
