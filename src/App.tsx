import React, { startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Chatbot } from './components/Chatbot';
import { KPICards } from './components/KPICards';
import { Charts } from './components/Charts';
import { PortfolioTable } from './components/PortfolioTable';
import { AIInsights } from './components/AIInsights';
import { RiskPanel } from './components/RiskPanel';
import { WhatIf } from './components/WhatIf';
import { ChatAnalysisPanel } from './components/ChatAnalysisPanel';
import { Brokerages } from './components/Brokerages';

// Lazy load heavy chart components to improve initial load time
const HistoricalChart = React.lazy(() => import('./components/HistoricalChart'));
const RiskReturnChart = React.lazy(() => import('./components/RiskReturnChart'));
const StrategyCards = React.lazy(() => import('./components/StrategyCards'));
const SectorPerformanceBars = React.lazy(() => import('./components/SectorPerformanceBars'));
const HistoricalComparator = React.lazy(() => import('./components/HistoricalComparator'));
import { SessionData, Portfolio, FinancialMetrics, Language, RiskProfile } from './types';
import {
  buildPortfolio,
  calculateExpectedGain,
  calculatePortfolioMetricsFromYahoo,
  getAssetYtdReturnPercent,
  recalculatePortfolio,
} from './services/financeService';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, PieChart, ShieldCheck, Zap, Globe, TrendingUp, Calendar, Wallet, MessageCircle, X } from 'lucide-react';
import { Logo } from './components/Logo';
import { cn } from './utils/cn';
import { formatCurrency } from './utils/format';

// Keep-alive hook to prevent Render Free Tier cold starts
function useKeepAlive() {
  useEffect(() => {
    // Ping every 10 minutes to keep the server awake
    const pingInterval = setInterval(() => {
      fetch('/health', {
        method: 'GET',
        // Use keepalive to ensure the request completes even if page is unloading
        keepalive: true,
        // Use cache: 'no-store' to ensure we get a fresh response
        cache: 'no-store'
      }).catch(() => {
        // Silent fail - don't show errors to user
        console.log('[FinIQ] Keep-alive ping failed, will retry');
      });
    }, 10 * 60 * 1000); // 10 minutes

    // Initial ping when app loads
    fetch('/health', { cache: 'no-store' }).catch(() => {});

    return () => clearInterval(pingInterval);
  }, []);
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [session, setSession] = useState<SessionData>({
    amount: 0,
    horizon: 0,
    riskProfile: 'moderate',
    language: 'en',
    questionNumber: 1
  });
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [expandedChatResponse, setExpandedChatResponse] = useState<string | null>(null);

  const [strategyAnnualCAGRs, setStrategyAnnualCAGRs] = useState<Record<RiskProfile, number> | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const metricsRequestIdRef = useRef(0);
  const dashboardScrollRef = useRef<HTMLDivElement | null>(null);
  const chatAnalysisPanelRef = useRef<HTMLDivElement | null>(null);

  // Activate keep-alive to prevent cold starts
  useKeepAlive();
  const prevQuestionNumberRef = useRef(session.questionNumber);

  const updateSession = (data: Partial<SessionData>) => {
    setSession((prev) => {
      const next = { ...prev, ...data };
      const nextAmount = typeof next.amount === 'number' ? next.amount : 0;
      const nextHorizon = typeof next.horizon === 'number' ? next.horizon : 0;
      const nextRiskProfile = next.riskProfile;
      const amountChanged = typeof data.amount === 'number' && data.amount !== prev.amount;
      const horizonChanged = typeof data.horizon === 'number' && data.horizon !== prev.horizon;
      const riskChanged = typeof data.riskProfile !== 'undefined' && data.riskProfile !== prev.riskProfile;

      if (data.portfolio) {
        const normalizedPortfolio = {
          ...data.portfolio,
          assets: recalculatePortfolio(data.portfolio.assets, nextAmount),
          totalAmount: nextAmount,
          timeHorizon: nextHorizon,
          riskProfile: data.portfolio.riskProfile ?? nextRiskProfile,
        };

        return {
          ...next,
          portfolio: normalizedPortfolio,
          customPortfolio: normalizedPortfolio.isCustom ? normalizedPortfolio : prev.customPortfolio,
          metrics: undefined,
        };
      }

      if (data.questionNumber === 4 && !prev.portfolio) {
        const portfolio = buildPortfolio(nextAmount, nextRiskProfile, nextHorizon);
        return { ...next, portfolio, metrics: undefined };
      }

      if (!prev.portfolio) {
        return next;
      }

      if (riskChanged) {
        const portfolio = buildPortfolio(nextAmount, nextRiskProfile, nextHorizon);
        return {
          ...next,
          portfolio,
          metrics: undefined,
        };
      }

      if (amountChanged || horizonChanged) {
        const portfolio = prev.portfolio.isCustom
          ? {
              ...prev.portfolio,
              assets: recalculatePortfolio(prev.portfolio.assets, nextAmount),
              totalAmount: nextAmount,
              timeHorizon: nextHorizon,
              riskProfile: nextRiskProfile,
              isCustom: true,
            }
          : buildPortfolio(nextAmount, prev.portfolio.riskProfile as RiskProfile, nextHorizon);

        const nextMetrics = prev.metrics
          ? {
              ...prev.metrics,
              expectedReturn: calculateExpectedGain(nextAmount, prev.metrics.annualCAGR, nextHorizon),
            }
          : prev.metrics;

        return {
          ...next,
          portfolio,
          customPortfolio: portfolio.isCustom ? portfolio : prev.customPortfolio,
          metrics: nextMetrics,
        };
      }

      return next;
    });
  };

  const portfolioAllocKey = useMemo(() => {
    if (!session.portfolio) return '';
    const allocs = session.portfolio.assets
      .slice()
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
      .map(a => `${a.symbol}:${a.allocation.toFixed(6)}`)
      .join('|');
    return `${session.portfolio.isCustom ? 'custom' : session.portfolio.riskProfile}::${allocs}`;
  }, [session.portfolio]);

  useEffect(() => {
    if (!session.portfolio) return;
    if (session.questionNumber < 4) return;
    if (!session.portfolio.assets?.length) return;

    const portfolio = session.portfolio;
    const requestId = ++metricsRequestIdRef.current;
    const controller = new AbortController();

    setMetricsLoading(true);
    setMetricsError(null);

    (async () => {
      try {
        const metrics = await calculatePortfolioMetricsFromYahoo(portfolio, { signal: controller.signal });
        if (metricsRequestIdRef.current !== requestId) return;

        // Also refresh per-asset YTD performance for AI prompts and portfolio UI.
        const uniqueSymbols = [...new Set(portfolio.assets.map(a => a.symbol))];
        const ytdPairs = await Promise.all(
          uniqueSymbols.map(async (sym) => [sym.toUpperCase(), await getAssetYtdReturnPercent(sym, controller.signal)] as const)
        );
        if (metricsRequestIdRef.current !== requestId) return;
        const ytdBySymbol = ytdPairs.reduce((acc, [sym, ytd]) => {
          acc[sym] = ytd * 100; // percent for UI/prompt consistency
          return acc;
        }, {} as Record<string, number>);

        setSession(prev => ({
          ...prev,
          metrics: {
            ...metrics,
            expectedReturn: calculateExpectedGain(prev.amount, metrics.annualCAGR, prev.horizon),
          },
          portfolio: prev.portfolio
            ? {
                ...prev.portfolio,
                assets: prev.portfolio.assets.map(a => ({
                  ...a,
                  change: ytdBySymbol[a.symbol.toUpperCase()] ?? a.change,
                })),
              }
            : prev.portfolio,
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load finance data';
        if (metricsRequestIdRef.current !== requestId) return;
        setMetricsError(msg);
        setSession(prev => ({ ...prev, metrics: undefined }));
      } finally {
        if (metricsRequestIdRef.current === requestId) setMetricsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [portfolioAllocKey, session.questionNumber]);

  const strategyRequestIdRef = useRef(0);
  useEffect(() => {
    if (!session.portfolio) return;
    if (session.questionNumber < 4) return;
    if (session.portfolio.isCustom) return;
    if (strategyAnnualCAGRs) return;

    const requestId = ++strategyRequestIdRef.current;
    const controller = new AbortController();

    (async () => {
      try {
        const risks: RiskProfile[] = ['conservative', 'moderate', 'aggressive'];
        const results = await Promise.all(
          risks.map(async (risk) => {
            const strategyPortfolio = buildPortfolio(1, risk, 1);
            const m = await calculatePortfolioMetricsFromYahoo(strategyPortfolio, { signal: controller.signal });
            return [risk, m.annualCAGR] as const;
          })
        );
        if (strategyRequestIdRef.current !== requestId) return;
        const map = results.reduce((acc, [risk, cagr]) => {
          acc[risk] = cagr;
          return acc;
        }, {} as Record<RiskProfile, number>);
        setStrategyAnnualCAGRs(map);
      } catch (e) {
        console.warn('Failed to precompute strategy CAGR:', e);
      }
    })();

    return () => controller.abort();
  }, [session.portfolio?.isCustom, session.questionNumber, strategyAnnualCAGRs]);

  useEffect(() => {
    const prev = prevQuestionNumberRef.current;
    if (prev < 4 && session.questionNumber >= 4) {
      if (window.innerWidth < 1024) {
        setIsChatOpen(false);
      }
      dashboardScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      dashboardScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevQuestionNumberRef.current = session.questionNumber;
  }, [session.questionNumber]);

  useEffect(() => {
    if (!showLanding) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0 });
      });
    }
  }, [showLanding]);

  // Browser back-button support using hash-based navigation.
  // When entering the dashboard the URL becomes /#app.
  // Pressing "back" pops the hash and fires hashchange / popstate,
  // which returns the user to the landing page.
  useEffect(() => {
    // On mount, if the URL already has #app, show the dashboard.
    if (window.location.hash === '#app') {
      setShowLanding(false);
    }

    const onHashChange = () => {
      if (window.location.hash !== '#app') {
        setShowLanding(true);
        window.scrollTo({ top: 0, left: 0 });
      }
    };

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  const locale = session.language === 'en' ? 'en-US' : 'es-ES';
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
  }[session.language][session.riskProfile];

  const handleLaunchApp = () => {
    window.location.hash = 'app';
    startTransition(() => setShowLanding(false));
  };

  const appShell = (
    <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden bg-bg">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-card border-b border-border z-50">
        <Logo className="gap-2" textClassName="font-bold text-text-primary text-base" />
        <button
          aria-label={isChatOpen ? (session.language === 'en' ? 'Close chat' : 'Cerrar chat') : (session.language === 'en' ? 'Open chat' : 'Abrir chat')}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-2 rounded-lg bg-[#13131f] text-text-secondary hover:bg-[#1e293b] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {isChatOpen ? <X size={20} /> : <MessageCircle size={20} className="text-primary" />}
        </button>
      </div>

      {/* Left Panel: Chatbot */}
      <aside id="chat-panel" role="complementary" aria-label="Chatbot" className={cn(
        "fixed inset-0 lg:relative lg:inset-auto z-40 lg:z-30 w-full lg:w-[320px] xl:w-[380px] h-full shrink-0 border-r border-border bg-card transition-transform duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.2)]",
        isChatOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Chatbot
          session={session}
          onUpdateSession={updateSession}
          onExpandResponse={(content) => {
            setExpandedChatResponse(content);
            // Give React time to render the panel, then scroll to it
            setTimeout(() => {
              chatAnalysisPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
        />
        {/* Mobile Close Button */}
        <button 
          aria-label={session.language === 'en' ? 'Close chat' : 'Cerrar chat'}
          onClick={() => setIsChatOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 z-50 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
        >
          <X size={20} />
        </button>
      </aside>

      {/* Right Panel: Dashboard */}
      <main ref={dashboardScrollRef} className="flex-1 h-full overflow-y-auto custom-scrollbar bg-bg relative z-10">
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto space-y-8 pb-24">
          
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
                <LayoutDashboard size={12} />
                {session.language === 'en' ? 'Intelligence Dashboard' : 'Panel de Inteligencia'}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
                {session.language === 'en' ? 'Your Portfolio' : 'Tu Portafolio'}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-[#131b2f] border border-white/5 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#10B981] animate-[pulse_2s_ease-in-out_infinite]" />
                <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider">
                  {session.language === 'en' ? 'Market Live' : 'Mercado en Vivo'}
                </span>
              </div>
              <div className="text-[11px] font-bold text-text-secondary bg-[#131b2f] border border-white/5 px-4 py-2 rounded-full font-mono">
                {new Date().toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBadge icon={<Wallet size={18} />} label={session.language === 'en' ? 'Total Capital' : 'Capital Total'} value={formatCurrency(session.amount, { compact: session.amount >= 100000 })} />
            <StatBadge icon={<Calendar size={18} />} label={session.language === 'en' ? 'Time Horizon' : 'Horizonte'} value={`${session.horizon} ${session.language === 'en' ? 'Years' : 'Años'}`} />
            <StatBadge icon={<ShieldCheck size={18} />} label={session.language === 'en' ? 'Shield Check' : 'Perfil de Riesgo'} value={riskProfileLabel} />
            <StatBadge icon={<TrendingUp size={18} />} label={session.language === 'en' ? 'Strategy' : 'Estrategia'} value={session.language === 'en' ? 'OPTIMIZED' : 'OPTIMIZADA'} color="text-success" />
          </div>

          <AnimatePresence mode="wait">
            {session.portfolio ? (
              session.metrics && (session.portfolio.isCustom || strategyAnnualCAGRs) ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* KPI Cards */}
                  <KPICards metrics={session.metrics} language={session.language} portfolio={session.portfolio} />

                  {/* AI Chat Analysis Panel (Deep Dive) - Right after KPIs for visibility */}
                  <AnimatePresence>
                    {expandedChatResponse && (
                      <div ref={chatAnalysisPanelRef}>
                        <ChatAnalysisPanel
                          content={expandedChatResponse}
                          language={session.language}
                          onClose={() => setExpandedChatResponse(null)}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Strategy Comparison */}
                  <section>
                    <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                      <Zap size={14} className="text-secondary" />
                      {session.language === 'en' ? 'Strategy Comparison' : 'Comparación de Estrategias'}
                    </h3>
                    <Suspense fallback={<div className="h-32 bg-[#131b2f] rounded animate-pulse" />}>
                      <StrategyCards
                        portfolio={session.portfolio}
                        metrics={session.metrics}
                        language={session.language}
                        customPortfolio={session.customPortfolio}
                        strategyAnnualCAGRs={strategyAnnualCAGRs ?? undefined}
                        onRestoreCustom={() => session.customPortfolio && updateSession({ portfolio: session.customPortfolio })}
                        onSelectStrategy={(risk) => updateSession({ riskProfile: risk })}
                      />
                    </Suspense>
                  </section>

                  {/* Bento Grid Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Main Performance Chart - Spans 8 columns */}
                    <div className="xl:col-span-8">
                      <Suspense fallback={<div className="h-[420px] bg-[#131b2f] rounded animate-pulse" />}>
                        <HistoricalChart portfolio={session.portfolio} language={session.language} />
                      </Suspense>
                    </div>

                    {/* Risk Panel - Spans 4 columns */}
                    <div className="xl:col-span-4">
                      <RiskPanel metrics={session.metrics} language={session.language} portfolio={session.portfolio} />
                    </div>

                    {/* Allocation Donut - 6 columns */}
                    <div className="xl:col-span-6">
                      <Charts portfolio={session.portfolio} language={session.language} />
                    </div>

                    {/* Risk/Return Scatter - 6 columns */}
                    <div className="xl:col-span-6">
                      <Suspense fallback={<div className="h-[320px] bg-[#131b2f] rounded animate-pulse" />}>
                        <RiskReturnChart portfolio={session.portfolio} language={session.language} />
                      </Suspense>
                    </div>

                    {/* Sector Performance Bars - Full width */}
                    <div className="xl:col-span-12">
                      <Suspense fallback={<div className="h-[200px] bg-[#131b2f] rounded animate-pulse" />}>
                        <SectorPerformanceBars portfolio={session.portfolio} language={session.language} />
                      </Suspense>
                    </div>

                    {/* Table - Spans 8 columns */}
                    <div className="xl:col-span-8">
                      <PortfolioTable portfolio={session.portfolio} language={session.language} />
                    </div>

                    {/* What If - Spans 4 columns */}
                    <div className="xl:col-span-4 xl:self-start">
                      <WhatIf portfolio={session.portfolio} language={session.language} metrics={session.metrics} />
                    </div>

                    {/* Historical Comparator - Full width */}
                    <div className="xl:col-span-12 h-[420px]">
                      <Suspense fallback={<div className="h-[420px] bg-[#131b2f] rounded animate-pulse" />}>
                        <HistoricalComparator portfolio={session.portfolio} language={session.language} />
                      </Suspense>
                    </div>


                    {/* AI Insights - Full width */}
                    <div className="xl:col-span-12">
                      <AIInsights portfolio={session.portfolio} metrics={session.metrics} language={session.language} />
                    </div>

                    {/* Brokerages - Full width */}
                    <div className="xl:col-span-12">
                      <Brokerages language={session.language} />
                    </div>
                  </div>
                </motion.div>
              ) : (
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
                    {session.language === 'en' ? 'Loading market intelligence...' : 'Cargando inteligencia de mercado...'}
                  </h2>
                  {metricsError ? (
                    <p className="text-error text-sm font-bold max-w-md">
                      {metricsError}
                    </p>
                  ) : (
                    <p className="text-text-secondary text-sm max-w-md">
                      {session.language === 'en'
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
              )
            ) : (
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
                  {session.language === 'en' ? 'Start Your Journey' : 'Comienza tu Viaje'}
                </h2>
                <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed font-medium">
                  {session.language === 'en'
                    ? 'Our AI assistant is waiting to help you build a professional investment strategy. Complete the 3-step onboarding to unlock your dashboard.'
                    : 'Nuestro asistente de IA te espera para ayudarte a construir una estrategia profesional. Completa los 3 pasos para desbloquear tu panel.'}
                </p>
                <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                  <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-success" /> {session.language === 'en' ? 'Bank-Grade Security' : 'Seguridad Bancaria'}</span>
                  <span className="flex items-center gap-2"><Globe size={14} className="text-primary" /> {session.language === 'en' ? 'Global Assets' : 'Activos Globales'}</span>
                  <span className="flex items-center gap-2"><Zap size={14} className="text-secondary" /> {session.language === 'en' ? 'Real-time Data' : 'Datos en Tiempo Real'}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-bg">
      <AnimatePresence initial={false} mode="wait">
        {showLanding ? (
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 0.985, y: 18 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingPage language={session.language} onStart={handleLaunchApp} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 1.015, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="h-[100dvh]"
          >
            {appShell}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper components
const StatBadge = ({ icon, label, value, color = "text-text-primary" }: { icon: React.ReactNode, label: string, value: string, color?: string }) => (
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
