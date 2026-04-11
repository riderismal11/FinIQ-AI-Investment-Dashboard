import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, RefreshCw, Send, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Asset, ChatMessage, Portfolio, RiskProfile, SessionData } from '../types';
import { chatWithBot } from '../services/geminiService';
import { fetchQuote, recalculatePortfolio, upsertAssetAllocation } from '../services/financeService';
import { LogoIcon } from './Logo';
import { cn } from '../utils/cn';

const DEEP_DIVE_MARKER = '[DEEP_DIVE]';
const MAX_CHAT_LENGTH = 300; // characters — anything longer gets forced to DEEP_DIVE

function parseDeepDive(text: string): { isDeepDive: boolean; summary: string; fullContent: string } {
  const trimmed = text.trim();
  if (!trimmed.startsWith(DEEP_DIVE_MARKER)) {
    return { isDeepDive: false, summary: text, fullContent: text };
  }
  const withoutMarker = trimmed.slice(DEEP_DIVE_MARKER.length).trim();
  const newlineIndex = withoutMarker.indexOf('\n');
  if (newlineIndex === -1) {
    return { isDeepDive: true, summary: withoutMarker || text, fullContent: withoutMarker };
  }
  const summary = withoutMarker.slice(0, newlineIndex).trim();
  const fullContent = withoutMarker.slice(newlineIndex + 1).trim();
  return {
    isDeepDive: true,
    summary: summary || 'View analysis',
    fullContent: fullContent || withoutMarker,
  };
}

function forceDeepDiveIfNeeded(text: string): string {
  const trimmed = text.trim();
  // Already has DEEP_DIVE — leave as is
  if (trimmed.startsWith(DEEP_DIVE_MARKER)) return trimmed;

  // Count text lines (skip blank lines)
  // Increase line limit for lists (like the fallback suggestions)
  const contentLines = trimmed.split('\n').filter((l) => l.trim().length > 0);
  const isLong = trimmed.length > MAX_CHAT_LENGTH || contentLines.length > 7;

  if (!isLong) return trimmed;

  // Generate a short summary from the first meaningful sentence or line
  const firstLine = contentLines[0] || trimmed.slice(0, 60);
  // Strip markdown formatting from summary for clean chat display
  const cleanSummary = firstLine
    .replace(/[#*_|`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return `${DEEP_DIVE_MARKER} ${cleanSummary}\n${trimmed}`;
}

interface ChatbotProps {
  session: SessionData;
  onUpdateSession: (data: Partial<SessionData>) => void;
  onExpandResponse?: (content: string | null) => void;
}

type ReplacePortfolioArgs = {
  assets: Array<{ symbol?: unknown; name?: unknown; allocation?: unknown; type?: unknown }>;
  riskProfile?: unknown;
};

const TICKER_REGEX = /^[\^A-Z0-9.\-]{1,12}$/i;

const QUESTIONS = {
  en: [
    "Hi! I'm FinIQ. I'll help you build a personalized investment portfolio. **How much are you looking to invest?** (e.g. $5,000)",
    'Got it. **When do you need this money?** (e.g. in 5 years, for retirement)',
    'Last question. If your investment dropped 20%, would you: **(A)** Sell, **(B)** Wait, or **(C)** Buy more?',
  ],
  es: [
    'Hola. Soy FinIQ. Te ayudare a construir un portafolio de inversion personalizado. **Cuanto dinero quieres invertir?** (ej. $5,000)',
    'Entendido. **Cuando necesitas este dinero?** (ej. en 5 anos, para retiro)',
    'Ultima pregunta. Si tu inversion baja 20%, que harias? **(A)** Vender, **(B)** Esperar, o **(C)** Comprar mas',
  ],
} as const;

const SUGGESTIONS = {
  en: [
    'I want 25% annual return',
    'Add gold to my portfolio',
    'Remove NVDA',
    'Explain my risk',
    'Change to aggressive',
    'Add BTC at 10%',
  ],
  es: [
    'Quiero 25% de rentabilidad anual',
    'Agrega oro a mi portafolio',
    'Quita NVDA',
    'Explica mi riesgo',
    'Cambiar a agresivo',
    'Agrega BTC al 10%',
  ],
} as const;

const RISK_PROFILE_LABELS = {
  en: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
  es: { conservative: 'Conservador', moderate: 'Moderado', aggressive: 'Agresivo' },
} as const;

function createMessage(role: 'user' | 'bot', content: string): ChatMessage {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date(),
  };
}

function sanitizeFreeformInput(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInvestmentAmount(input: string): number | null {
  const normalized = sanitizeFreeformInput(input).replace(/[^0-9.]/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount >= 100 ? amount : null;
}

function parseTimeHorizon(input: string): number | null {
  const normalized = sanitizeFreeformInput(input).replace(/[^0-9]/g, '');
  const years = Number.parseInt(normalized, 10);
  return Number.isFinite(years) && years >= 1 ? years : null;
}

function parseRiskAnswer(input: string): RiskProfile {
  const trimmed = sanitizeFreeformInput(input).toLowerCase();

  if (/^[a][.)\s]*$/.test(trimmed)) return 'conservative';
  if (/^[b][.)\s]*$/.test(trimmed)) return 'moderate';
  if (/^[c][.)\s]*$/.test(trimmed)) return 'aggressive';

  if (/\b(sell|vender)\b/i.test(trimmed)) return 'conservative';
  if (/\b(wait|esperar)\b/i.test(trimmed)) return 'moderate';
  if (/\b(buy more|comprar mas|invest more)\b/i.test(trimmed)) return 'aggressive';

  return 'moderate';
}

function isRiskProfile(value: unknown): value is RiskProfile {
  return value === 'conservative' || value === 'moderate' || value === 'aggressive';
}

function sanitizeSymbol(input: string): string {
  return input
    .toUpperCase()
    .replace(/\s*(TO|A|EN|IN|INTO)\s+(MY|MI|THE|EL)\s+(PORTFOLIO|PORTAFOLIO)\s*/g, '')
    .replace(/\s*(AT|AL|WITH|CON)\s+\d+\s*%/g, '')
    .split(' ')[0] // Take only the first word if multiple remain
    .replace(/[^A-Z0-9\-\.]/g, '')
    .trim();
}

export const Chatbot: React.FC<ChatbotProps> = ({ session, onUpdateSession, onExpandResponse }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMessages([createMessage('bot', QUESTIONS[session.language][0])]);
  }, [session.language]);

  useEffect(() => {
    setMessages((previous) =>
      previous.map((message) => {
        if (message.role !== 'bot') return message;
        const englishIndex = QUESTIONS.en.findIndex((question) => question === message.content);
        const spanishIndex = QUESTIONS.es.findIndex((question) => question === message.content);
        const questionIndex = englishIndex >= 0 ? englishIndex : spanishIndex;
        if (questionIndex < 0) return message;
        return { ...message, content: QUESTIONS[session.language][questionIndex] };
      }),
    );
  }, [session.language]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [isTyping, messages]);

  const appendBotMessage = (content: string): void => {
    setMessages((previous) => [...previous, createMessage('bot', content)]);
  };

  const appendUserMessage = (content: string): void => {
    setMessages((previous) => [...previous, createMessage('user', content)]);
  };

  const handleSend = async (textOverride?: string) => {
    const sanitizedInput = sanitizeFreeformInput(textOverride ?? input);
    if (!sanitizedInput || isTyping) return;

    setInput('');
    appendUserMessage(sanitizedInput);

    if (session.questionNumber <= 3) {
      await processOnboarding(sanitizedInput);
    } else {
      await processFollowUp(sanitizedInput);
    }
  };

  const processOnboarding = async (text: string) => {
    setIsTyping(true);
    await new Promise((resolve) => window.setTimeout(resolve, 600));

    if (session.questionNumber === 1) {
      const amount = parseInvestmentAmount(text);
      if (amount === null) {
        appendBotMessage(session.language === 'en' ? 'Please enter a valid amount (min $100).' : 'Por favor, introduce una cantidad valida (min $100).');
        setIsTyping(false);
        return;
      }

      onUpdateSession({ amount, questionNumber: 2 });
      appendBotMessage(QUESTIONS[session.language][1]);
      setIsTyping(false);
      return;
    }

    if (session.questionNumber === 2) {
      const horizon = parseTimeHorizon(text);
      if (horizon === null) {
        appendBotMessage(session.language === 'en' ? 'Please enter a valid number of years.' : 'Por favor, introduce un numero valido de anos.');
        setIsTyping(false);
        return;
      }

      onUpdateSession({ horizon, questionNumber: 3 });
      appendBotMessage(QUESTIONS[session.language][2]);
      setIsTyping(false);
      return;
    }

    const riskProfile = parseRiskAnswer(text);
    onUpdateSession({ riskProfile, questionNumber: 4 });
    appendBotMessage(
      session.language === 'en'
        ? `Profile set to **${RISK_PROFILE_LABELS.en[riskProfile]}**. Your personalized portfolio is ready. Check the dashboard.`
        : `Perfil configurado como **${RISK_PROFILE_LABELS.es[riskProfile]}**. Tu portafolio personalizado esta listo. Revisa el panel.`,
    );

    window.setTimeout(() => {
      appendBotMessage(
        session.language === 'en'
          ? "You can now ask me to:\n- **Set a target return**\n- **Add assets** like gold, Bitcoin, or bonds\n- **Remove assets** from your portfolio\n- **Change risk profile** or investment amount\n- **Explain your metrics** and strategy"
          : "Ahora puedes pedirme:\n- **Establecer un retorno objetivo**\n- **Agregar activos** como oro, Bitcoin o bonos\n- **Eliminar activos** de tu portafolio\n- **Cambiar perfil de riesgo** o monto de inversion\n- **Explicar tus metricas** y estrategia",
      );
    }, 1200);

    setIsTyping(false);
  };

  const processFollowUp = async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    // Clear any open Deep Dive panels when the user starts a new query
    onExpandResponse?.(null);

    if (!session.portfolio) {
      appendBotMessage(session.language === 'en' ? 'Complete the onboarding first.' : 'Completa primero el onboarding.');
      return;
    }

    setIsTyping(true);

    try {
      const history = messages.slice(-10).map((message) => ({
        role: message.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: message.content }] as [{ text: string }],
      }));

      const response = await chatWithBot(text, history, session.language, session.portfolio, session.metrics);

      if (response.functionCalls?.length) {
        // Track portfolio locally to avoid race conditions with sequential calls
        let workingPortfolio = session.portfolio;
        const descriptions: string[] = [];

        for (const call of response.functionCalls) {
          const result = await handleFunctionCall(call.name, call.args, workingPortfolio);
          if (result) {
            if (result.updatedPortfolio) workingPortfolio = result.updatedPortfolio;
            descriptions.push(result.description);
          }
        }

        // Apply all changes at once
        if (workingPortfolio !== session.portfolio) {
          onUpdateSession({
            portfolio: workingPortfolio,
            amount: workingPortfolio.totalAmount,
            riskProfile: workingPortfolio.riskProfile,
            horizon: workingPortfolio.timeHorizon,
          });
        }

        // Send ONE concise summary instead of multiple verbose messages
        if (descriptions.length > 0) {
          appendBotMessage(descriptions.join('\n'));
        }
      } else if (response.text) {
        // Auto-wrap long responses with DEEP_DIVE so they open in the expanded panel
        appendBotMessage(forceDeepDiveIfNeeded(response.text));
      } else {
        appendBotMessage(
          session.language === 'en'
            ? "I'm sorry, I couldn't process that. Try asking to **add** an asset, **change** your risk, or **explain** a metric."
            : 'Lo siento, no pude procesar eso. Prueba pidiendo **agregar** un activo, **cambiar** tu riesgo o **explicar** una métrica.'
        );
      }
    } catch (error) {
      appendBotMessage(
        error instanceof Error
          ? error.message
          : session.language === 'en'
            ? 'There was a problem contacting the AI service.'
            : 'Hubo un problema al contactar el servicio de IA.',
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleFunctionCall = async (
    name: string,
    args: Record<string, unknown>,
    currentPortfolio: Portfolio,
  ): Promise<{ updatedPortfolio?: Portfolio; description: string } | null> => {
    const lang = session.language;

    if (name === 'updateInvestmentAmount') {
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount < 100) {
        return { description: lang === 'en' ? 'Invalid amount (min $100).' : 'Monto invalido (min $100).' };
      }
      // Propagate the new amount so App recalculates the portfolio and metrics.
      onUpdateSession({ amount });
      return {
        description: lang === 'en'
          ? `Updated amount to **$${amount.toLocaleString()}**`
          : `Monto actualizado a **$${amount.toLocaleString()}**`,
      };
    }

    if (name === 'updateRiskProfile') {
      if (!isRiskProfile(args.profile)) {
        return { description: lang === 'en' ? 'Invalid risk profile.' : 'Perfil de riesgo invalido.' };
      }
      // Signal App.tsx to rebuild the portfolio with the correct strategy for this risk level.
      // We do NOT return an updatedPortfolio here to avoid bypassing the App-level rebuild logic.
      onUpdateSession({ riskProfile: args.profile });
      return {
        description: lang === 'en'
          ? `Risk profile → **${RISK_PROFILE_LABELS.en[args.profile]}**`
          : `Perfil de riesgo → **${RISK_PROFILE_LABELS.es[args.profile]}**`,
      };
    }

    if (name === 'updateTimeHorizon') {
      const horizon = Number(args.years);
      if (!Number.isFinite(horizon) || horizon < 1) {
        return { description: lang === 'en' ? 'Invalid time horizon.' : 'Horizonte temporal invalido.' };
      }
      return {
        updatedPortfolio: { ...currentPortfolio, timeHorizon: horizon },
        description: lang === 'en'
          ? `Horizon → **${horizon} years**`
          : `Horizonte → **${horizon} anos**`,
      };
    }

    if (name === 'addAsset') {
      const rawSymbol = sanitizeSymbol(String(args.symbol ?? ''));
      const allocationPercent = Number(args.allocation);

      if (!TICKER_REGEX.test(rawSymbol) || !Number.isFinite(allocationPercent) || allocationPercent <= 0 || allocationPercent > 100) {
        return {
          description: lang === 'en'
            ? `Invalid ticker: ${rawSymbol || 'empty'}. Please provide a valid stock symbol (e.g., AAPL).`
            : `Ticker invalido: ${rawSymbol || 'vacio'}. Por favor indica un simbolo valido (ej., AAPL).`
        };
      }

      try {
        const quote = await fetchQuote(rawSymbol);
        const assetName = quote.shortName || quote.longName || quote.symbol || rawSymbol;
        const allocationFraction = allocationPercent / 100;

        // Check if asset already exists
        const existing = currentPortfolio.assets.find(
          (a) => a.symbol.toUpperCase() === rawSymbol.toUpperCase()
        );
        if (existing) {
          return {
            description: lang === 'en'
              ? `**${assetName}** already in portfolio at ${(existing.allocation * 100).toFixed(1)}%`
              : `**${assetName}** ya esta en el portafolio al ${(existing.allocation * 100).toFixed(1)}%`,
          };
        }

        const updatedAssets = upsertAssetAllocation(
          [...currentPortfolio.assets], // clone to avoid mutating the tracked portfolio
          rawSymbol,
          allocationFraction,
          { name: assetName, type: 'Custom' }
        );
        const rebalancedAssets = recalculatePortfolio(updatedAssets, session.amount);

        return {
          updatedPortfolio: {
            ...currentPortfolio,
            assets: rebalancedAssets,
            totalAmount: session.amount,
            timeHorizon: session.horizon,
            riskProfile: session.riskProfile,
            isCustom: true,
          },
          description: lang === 'en'
            ? `+ **${assetName}** (${rawSymbol}) at **${allocationPercent}%**`
            : `+ **${assetName}** (${rawSymbol}) al **${allocationPercent}%**`,
        };
      } catch (error) {
        return {
          description: error instanceof Error && error.message
            ? error.message
            : lang === 'en'
              ? `Could not find ${rawSymbol}.`
              : `No se encontro ${rawSymbol}.`,
        };
      }
    }

    if (name === 'removeAsset') {
      const symbolToRemove = sanitizeSymbol(String(args.symbol ?? ''));
      const currentAssets = currentPortfolio.assets;
      const filteredAssets = currentAssets.filter(
        (asset) => asset.symbol.toUpperCase() !== symbolToRemove
      );

      if (filteredAssets.length === currentAssets.length) {
        return {
          description: lang === 'en'
            ? `**${symbolToRemove}** not found in portfolio`
            : `**${symbolToRemove}** no esta en el portafolio`,
        };
      }

      if (filteredAssets.length === 0) {
        return {
          description: lang === 'en'
            ? "Can't remove last asset"
            : 'No se puede eliminar el ultimo activo',
        };
      }

      const rebalancedAssets = recalculatePortfolio(filteredAssets, session.amount);
      return {
        updatedPortfolio: {
          ...currentPortfolio,
          assets: rebalancedAssets,
          totalAmount: session.amount,
          timeHorizon: session.horizon,
          riskProfile: session.riskProfile,
          isCustom: true,
        },
        description: lang === 'en'
          ? `- **${symbolToRemove}** removed`
          : `- **${symbolToRemove}** eliminado`,
      };
    }

    if (name === 'replacePortfolio') {
      const replaceArgs = args as ReplacePortfolioArgs;
      const nextAssets: Asset[] = Array.isArray(replaceArgs.assets)
        ? replaceArgs.assets
            .map((asset) => {
              const symbol = String(asset.symbol ?? '').toUpperCase().trim();
              const assetName = String(asset.name ?? symbol).trim();
              const allocation = Number(asset.allocation);
              const type = String(asset.type ?? 'Custom').trim();
              if (!TICKER_REGEX.test(symbol) || !Number.isFinite(allocation) || allocation <= 0) {
                return null;
              }
              return {
                symbol,
                name: assetName,
                allocation: allocation / 100,
                type,
              } satisfies Asset;
            })
            .filter((asset): asset is Asset => asset !== null)
        : [];

      const riskProfile = isRiskProfile(replaceArgs.riskProfile) ? replaceArgs.riskProfile : session.riskProfile;
      if (nextAssets.length === 0) {
        return {
          description: lang === 'en'
            ? 'Could not build a valid portfolio.'
            : 'No se pudo construir un portafolio valido.',
        };
      }

      const rebalancedAssets = recalculatePortfolio(nextAssets, session.amount);
      return {
        updatedPortfolio: {
          assets: rebalancedAssets,
          riskProfile,
          totalAmount: session.amount,
          timeHorizon: session.horizon,
          isCustom: true,
        },
        description: lang === 'en'
          ? `Portfolio rebuilt: **${rebalancedAssets.length} assets** (${RISK_PROFILE_LABELS.en[riskProfile]})`
          : `Portafolio reconstruido: **${rebalancedAssets.length} activos** (${RISK_PROFILE_LABELS.es[riskProfile]})`,
      };
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="p-6 border-b border-border flex items-center justify-between glass-effect sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-7 h-7 text-primary drop-shadow-[0_0_10px_rgba(29,212,180,0.25)]" />
          <div>
            <h1 className="text-sm font-black text-text-primary leading-none mb-1">{session.language === 'en' ? 'FinIQ Assistant' : 'Asistente FinIQ'}</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {session.language === 'en' ? 'Online' : 'En Linea'}
            </div>
          </div>
        </div>
        <div className="flex bg-[#0a0f1a] p-1 rounded-lg border border-border">
          <button
            className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold transition-all', session.language === 'en' ? 'bg-[#131b2f] text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
            onClick={() => onUpdateSession({ language: 'en' })}
            aria-label="Switch language to English"
          >
            EN
          </button>
          <button
            className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold transition-all', session.language === 'es' ? 'bg-[#131b2f] text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
            onClick={() => onUpdateSession({ language: 'es' })}
            aria-label="Cambiar idioma a Espanol"
          >
            ES
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-bg/50">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const parsed = message.role === 'bot' ? parseDeepDive(message.content) : null;
            const displayText = parsed?.isDeepDive ? parsed.summary : message.content;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn('flex flex-col max-w-[85%]', message.role === 'bot' ? 'items-start' : 'items-end ml-auto')}
              >
                <div
                  className={cn(
                    'px-4 py-3 rounded-[20px] text-sm leading-relaxed shadow-[0_4px_24px_rgba(0,0,0,0.1)]',
                    message.role === 'bot'
                      ? 'bg-[#131b2f] text-text-primary rounded-tl-none border-y border-r border-white/5 border-l-2 border-l-primary'
                      : 'bg-gradient-to-br from-primary to-primary-hover text-[#0a0f1a] font-medium rounded-tr-none shadow-[0_0_15px_rgba(29,212,180,0.15)]',
                  )}
                >
                  {displayText.split('**').map((part, index) => (
                    index % 2 === 1 ? <strong key={`${message.id}-${index}`} className="font-black">{part}</strong> : <React.Fragment key={`${message.id}-${index}`}>{part}</React.Fragment>
                  ))}
                </div>

                {parsed?.isDeepDive && onExpandResponse && (
                  <button
                    onClick={() => onExpandResponse(parsed.fullContent)}
                    className="mt-2 flex items-center gap-2 text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full hover:bg-primary/20 hover:border-primary/30 transition-all active:scale-95 uppercase tracking-wider shadow-[0_0_10px_rgba(29,212,180,0.1)]"
                  >
                    <Maximize2 size={12} />
                    {session.language === 'en' ? 'View Full Analysis' : 'Ver Análisis Completo'}
                  </button>
                )}

                <span className="text-[8px] text-text-muted font-black uppercase tracking-widest mt-2 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            );
          })}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-4 py-4 bg-[#131b2f] border-y border-r border-white/5 border-l-2 border-l-primary rounded-[20px] rounded-tl-none w-16 shadow-sm"
            >
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.3)] position-relative z-10">
        {session.questionNumber > 3 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {SUGGESTIONS[session.language].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                disabled={isTyping}
                className="text-[10px] font-bold text-text-primary bg-[#131b2f] px-4 py-2 rounded-full hover:bg-[#1e293b] hover:text-primary transition-all border border-border uppercase tracking-wide active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSend();
              }
            }}
            placeholder={session.language === 'en' ? 'Ask about your portfolio...' : 'Pregunta sobre tu portafolio...'}
            className="w-full bg-[#0a0f1a] border border-border rounded-2xl px-5 py-4 pr-14 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted text-text-primary font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
            disabled={isTyping}
          />
          <button
            onClick={() => handleSend()}
            disabled={isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-[#0a0f1a] rounded-xl flex items-center justify-center hover:bg-primary-hover transition-all active:scale-90 shadow-[0_0_15px_rgba(29,212,180,0.2)] hover:shadow-[0_0_25px_rgba(29,212,180,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><Sparkles size={10} /> {session.language === 'en' ? 'Smart Analysis' : 'Analisis Inteligente'}</span>
          <span className="flex items-center gap-1.5"><RefreshCw size={10} /> {session.language === 'en' ? 'Live Sync' : 'Sincronia Activa'}</span>
        </div>
      </div>
    </div>
  );
};
