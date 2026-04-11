import React, { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { FinancialMetrics, Language, Portfolio } from '../types';
import { generateInsights } from '../services/geminiService';

interface AIInsightsProps {
  portfolio: Portfolio;
  metrics: FinancialMetrics;
  language: Language;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ portfolio, metrics, language }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateInsights(portfolio, metrics, language);
      setInsights(result);
    } catch {
      setError(language === 'en' ? 'Failed to load insights.' : 'Error al cargar los analisis.');
    } finally {
      setLoading(false);
    }
  }, [language, metrics, portfolio]);

  return (
    <div className="card relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Sparkles size={80} className="text-primary" />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            {language === 'en' ? 'AI Investment Analysis' : 'Analisis de Inversion IA'}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {insights && !loading && (
              <div className="text-[9px] font-black text-success flex items-center gap-2 bg-success/10 border border-success/20 px-3 py-1 rounded-full uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {language === 'en' ? 'Generated' : 'Generado'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#131b2f] border border-border rounded-[24px] p-8 min-h-[160px] relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="animate-spin text-primary" size={28} />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              {language === 'en' ? 'Generating Intelligence...' : 'Generando Inteligencia...'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex items-center gap-3 text-error p-5 bg-error/10 rounded-2xl border border-error/20 w-full">
              <AlertCircle size={20} />
              <p className="text-xs font-bold">{error}</p>
            </div>
            <button onClick={fetchInsights} className="btn-primary flex items-center gap-2">
              <RefreshCw size={14} />
              {language === 'en' ? 'Retry' : 'Reintentar'}
            </button>
          </div>
        ) : insights ? (
          <div className="markdown-body prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed font-medium">
            <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{insights}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#1e293b] flex items-center justify-center">
              <Sparkles size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-text-primary mb-2">
                {language === 'en' ? 'AI-Powered Analysis Ready' : 'Analisis IA Listo'}
              </p>
              <p className="text-[11px] text-text-muted font-medium max-w-sm">
                {language === 'en'
                  ? 'Click generate to receive a personalized investment analysis powered by AI.'
                  : 'Haz clic en generar para recibir un analisis personalizado impulsado por IA.'}
              </p>
            </div>
            <button onClick={fetchInsights} className="btn-primary flex items-center gap-2">
              <Sparkles size={14} />
              {language === 'en' ? 'Generate Analysis' : 'Generar Analisis'}
            </button>
          </div>
        )}
      </div>

      {insights && !loading && !error && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider italic">
            {language === 'en'
              ? '* AI analysis based on current market conditions and your risk profile.'
              : '* Analisis de IA basado en condiciones actuales y tu perfil de riesgo.'}
          </p>
          <button onClick={fetchInsights} className="text-[10px] font-black text-primary flex items-center gap-2 hover:translate-x-1 transition-transform uppercase tracking-widest">
            <RefreshCw size={12} />
            {language === 'en' ? 'Regenerate' : 'Regenerar'}
          </button>
        </div>
      )}
    </div>
  );
};
