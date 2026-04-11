import React from 'react';
import { motion } from 'motion/react';
import { Zap, PieChart, ShieldCheck, Globe } from 'lucide-react';
import { Language } from '../types';

interface LoadingStateProps {
  language: Language;
  metricsError: string | null;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ language, metricsError }) => (
  <motion.div
    key="loading"
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    className="flex flex-col items-center justify-center py-24 md:py-40 text-center card border-white/5 shadow-none"
  >
    <div className="w-20 h-20 rounded-3xl bg-[#131b2f] border border-white/5 flex items-center justify-center mb-6 relative">
      <Zap size={40} className="text-primary" />
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary text-[#0a0f1a] rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce shadow-[0_0_10px_rgba(201,168,76,0.5)]">!</div>
    </div>
    <h2 className="text-2xl font-black mb-3 text-text-primary tracking-tight">
      {language === 'en' ? 'Loading market intelligence...' : 'Cargando inteligencia de mercado...'}
    </h2>
    {metricsError ? (
      <p className="text-error text-sm font-bold max-w-md">
        {metricsError}
      </p>
    ) : (
      <p className="text-text-secondary text-sm max-w-md">
        {language === 'en'
          ? 'Fetching real Yahoo Finance data to update your dashboard.'
          : 'Obteniendo datos reales de Yahoo Finance para actualizar tu panel.'}
      </p>
    )}
    <div className="mt-8 w-full max-w-md space-y-3">
      <div className="h-4 w-3/4 bg-[#1e293b] rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-[#1e293b] rounded animate-pulse" />
      <div className="h-4 w-5/6 bg-[#1e293b] rounded animate-pulse" />
    </div>
  </motion.div>
);

interface EmptyStateProps {
  language: Language;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ language }) => (
  <motion.div
    key="empty"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-24 md:py-40 text-center card border-white/5 shadow-none"
  >
    <div className="w-20 h-20 rounded-3xl bg-[#131b2f] border border-white/5 flex items-center justify-center mb-8 relative">
      <PieChart size={40} className="text-primary" />
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary text-[#0a0f1a] rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce shadow-[0_0_10px_rgba(201,168,76,0.5)]">!</div>
    </div>
    <h2 className="text-3xl font-black mb-4 text-text-primary tracking-tight">
      {language === 'en' ? 'Start Your Journey' : 'Comienza tu Viaje'}
    </h2>
    <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed font-medium">
      {language === 'en'
        ? 'Our AI assistant is waiting to help you build a professional investment strategy. Complete the 3-step onboarding to unlock your dashboard.'
        : 'Nuestro asistente de IA te espera para ayudarte a construir una estrategia profesional. Completa los 3 pasos para desbloquear tu panel.'}
    </p>
    <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
      <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-success" /> {language === 'en' ? 'Bank-Grade Security' : 'Seguridad Bancaria'}</span>
      <span className="flex items-center gap-2"><Globe size={14} className="text-primary" /> {language === 'en' ? 'Global Assets' : 'Activos Globales'}</span>
      <span className="flex items-center gap-2"><Zap size={14} className="text-secondary" /> {language === 'en' ? 'Real-time Data' : 'Datos en Tiempo Real'}</span>
    </div>
  </motion.div>
);
