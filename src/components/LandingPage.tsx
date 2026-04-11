import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  Cpu,
  Layers3,
  MessageCircle,
  Sparkles,
  UserRound,
  Workflow,
  Zap,
} from 'lucide-react';
import { Language } from '../types';
import { cn } from '../utils/cn';
import { AnimatedWrapper } from './landing/AnimatedWrapper';
import { CTAButton } from './landing/CTAButton';
import { Section } from './landing/Section';
import { LogoIcon } from '../components/Logo';
import './landing/landing.css';
import { HelpModal } from './landing/HelpModal';

interface LandingPageProps {
  language: Language;
  onStart: () => void;
}

type StorySectionId =
  | 'hero'
  | 'beginning'
  | 'tools'
  | 'idea'
  | 'solution'
  | 'stack'
  | 'process'
  | 'reality'
  | 'impact'
  | 'future'
  | 'brand'
  | 'final';

const tools = ['Python', 'SQL', 'Excel', 'Power BI', 'Tableau'] as const;
const aiStack = [
  'Claude',
  'ChatGPT',
  'Antigravity',
  'Cursor',
  'Codex',
  'Ollama',
  'OpenCloud',
  'Google AI Studio',
  'Gemini API',
] as const;
const processCards = ['Build', 'Refine', 'Compound'] as const;

const content = {
  en: {
    cta: 'Launch App',
    header: 'Scroll story',
    heroEyebrow: 'From data analysis to AI product',
    heroTitle: 'FINIQ',
    heroSubtitle: 'From raw data to AI-guided portfolio insight.',
    heroBody: 'Three questions. One generated dashboard.',
    heroHint: 'Scroll to move through the story',
    heroSignal: 'Data / Finance / AI',
    heroFlow: '3 question flow',
    heroSurface: 'Dashboard ready',
    nav: {
      hero: 'Intro',
      beginning: 'Start',
      tools: 'Tools',
      idea: 'Idea',
      solution: 'Solution',
      stack: 'AI stack',
      process: 'Process',
      reality: 'Execution',
      impact: 'Impact',
      future: 'Future',
      brand: 'Brand',
      final: 'Launch',
    },
    beginning: {
      eyebrow: 'The Beginning',
      title: 'This started with data.',
      lines: [
        'Two data-driven projects.',
        '20+ years of financial analysis, risk modeling, and portfolio insights.',
      ],
      cards: [
        {
          label: 'Project 01',
          title: 'Raw inputs',
          body: 'Structured financial datasets using SQL and PostgreSQL. Modeled long-term growth and portfolio performance.',
        },
        {
          label: 'Project 02',
          title: 'Clear patterns',
          body: 'Interactive dashboards comparing risk, return, and correlations. Patterns across assets and investor profiles.',
        },
      ] as const,
      signal: 'Data becomes direction.',
      signalBody: ['The process was still manual.', 'Powerful — but slow and not accessible.'],
    },
    tools: {
      eyebrow: 'The Tools',
      title: 'The analyst toolkit.',
      lines: ['Python, SQL, Excel, Power BI, Tableau.', 'Every tool shaped how I see data — and what I wanted to build.'],
    },
    idea: {
      eyebrow: 'The Idea',
      title: 'Then came the shift...',
      lines: [
        'What if financial analysis could be automated?',
        'What if insight could be generated instantly?',
      ],
      note: 'AI made it possible.',
    },
    solution: {
      eyebrow: 'The Solution',
      title: 'FinIQ is the result.',
      lines: ['A system built to turn analysis into interaction.'],
      steps: [
        ['Chatbot', 'Start with a conversation.'],
        ['3 questions', 'Capture capital, horizon, and risk.'],
        ['AI analysis', 'Turn answers into structure.'],
        ['Dashboard', 'Reveal the portfolio instantly.'],
      ] as const,
    },
    stack: {
      eyebrow: 'AI Stack',
      title: 'AI was not just a tool — it became the development engine.',
      lines: [
        'From idea to system.',
        'Claude, ChatGPT, Antigravity, Cursor, Codex.',
        'Ollama, OpenCloud, Google AI Studio, Gemini API.',
      ],
    },
    process: {
      eyebrow: 'The Process',
      title: 'Built step by step.',
      lines: ['Guided by iteration and AI-assisted development.', 'Like a snowball.'],
    },
    reality: {
      eyebrow: 'Execution',
      title: 'From analysis to product.',
      lines: ['Designed and directed end-to-end development.', 'Prompt engineering. Model evaluation. AI workflows.'],
      points: [
        'Designed and directed the end-to-end development of a full-stack investment intelligence platform using advanced AI prompting techniques — including conversational onboarding, real-time data integration, and multi-profile portfolio strategies.',
        'Built using iterative prompt engineering, multi-turn problem decomposition, and model evaluation to deliver a production-grade system with historical benchmarking, sector analysis, and a secured backend.',
      ],
    },
    impact: {
      eyebrow: 'Impact',
      title: 'This project represents more than a tool.',
      lines: [
        'It shows how AI can transform financial analysis — making it faster, scalable, and accessible.',
      ],
      cards: ['Faster financial analysis', 'Scalable financial systems', 'Accessible investment intelligence'] as const,
    },
    future: {
      eyebrow: 'Future',
      title: 'This is just the starting point.',
      lines: ['FinIQ can evolve into:'],
      items: ['Multi-user platform', 'Automated portfolio intelligence', 'Real-time AI-driven decision support'] as const,
    },
    brand: {
      eyebrow: 'Personal Brand',
      title: 'Rider Ismal Novas Guzman',
      lines: ['Business & Data Analytics student', 'Building AI-powered solutions for financial analysis'],
      tagline: 'Data thinking. Product mindset. AI execution.',
      portfolio: 'Portfolio',
      linkedin: 'LinkedIn',
    },
    final: {
      eyebrow: 'Ready',
      title: 'This is where data, AI, and product thinking come together.',
      lines: ['Experience it yourself.'],
    },
  },
  es: {
    cta: 'Launch App',
    header: 'Historia scroll',
    heroEyebrow: 'Del analisis de datos al producto con IA',
    heroTitle: 'FINIQ',
    heroSubtitle: 'De datos crudos a inteligencia de portafolio guiada por IA.',
    heroBody: 'Tres preguntas. Un dashboard generado.',
    heroHint: 'Desplazate para recorrer la historia',
    heroSignal: 'Datos / Finanzas / IA',
    heroFlow: 'Flujo de 3 preguntas',
    heroSurface: 'Dashboard listo',
    nav: {
      hero: 'Intro',
      beginning: 'Inicio',
      tools: 'Herramientas',
      idea: 'Idea',
      solution: 'Solucion',
      stack: 'Stack IA',
      process: 'Proceso',
      reality: 'Ejecucion',
      impact: 'Impacto',
      future: 'Futuro',
      brand: 'Marca',
      final: 'Lanzar',
    },
    beginning: {
      eyebrow: 'El Inicio',
      title: 'Todo empezo con datos.',
      lines: [
        'Dos proyectos orientados a datos.',
        'Mas de 20 anos de analisis financiero, modelado de riesgo e insights de portafolio.',
      ],
      cards: [
        {
          label: 'Proyecto 01',
          title: 'Entradas en bruto',
          body: 'Datasets financieros estructurados con SQL y PostgreSQL. Crecimiento a largo plazo y rendimiento de portafolios.',
        },
        {
          label: 'Proyecto 02',
          title: 'Patrones claros',
          body: 'Dashboards interactivos comparando riesgo, retorno y correlaciones. Patrones entre activos y perfiles de inversor.',
        },
      ] as const,
      signal: 'Los datos se vuelven direccion.',
      signalBody: ['El proceso seguia siendo manual.', 'Poderoso — pero lento y poco accesible.'],
    },
    tools: {
      eyebrow: 'Las Herramientas',
      title: 'El toolkit del analista.',
      lines: ['Python, SQL, Excel, Power BI, Tableau.', 'Cada herramienta moldeo como veo los datos — y lo que queria construir.'],
    },
    idea: {
      eyebrow: 'La Idea',
      title: 'Entonces llego el cambio...',
      lines: [
        'Y si el analisis financiero pudiera automatizarse?',
        'Y si el insight pudiera generarse al instante?',
      ],
      note: 'La IA lo hizo posible.',
    },
    solution: {
      eyebrow: 'La Solucion',
      title: 'FinIQ es el resultado.',
      lines: ['Un sistema disenado para convertir analisis en interaccion.'],
      steps: [
        ['Chatbot', 'Todo empieza en una conversacion.'],
        ['3 preguntas', 'Capital, horizonte y riesgo.'],
        ['Analisis IA', 'Las respuestas se vuelven estructura.'],
        ['Dashboard', 'El portafolio aparece al instante.'],
      ] as const,
    },
    stack: {
      eyebrow: 'Stack IA',
      title: 'La IA no fue solo una herramienta — fue el motor de desarrollo.',
      lines: [
        'De idea a sistema.',
        'Claude, ChatGPT, Antigravity, Cursor, Codex.',
        'Ollama, OpenCloud, Google AI Studio, Gemini API.',
      ],
    },
    process: {
      eyebrow: 'El Proceso',
      title: 'Construido paso a paso.',
      lines: ['Guiado por iteracion y desarrollo asistido por IA.', 'Como una bola de nieve.'],
    },
    reality: {
      eyebrow: 'Ejecucion',
      title: 'Del analisis al producto.',
      lines: ['Desarrollo de sistema de inicio a fin.', 'Ingenieria de prompts. Evaluacion de modelos. Workflows con IA.'],
      points: [
        'Diseñe y dirigi el desarrollo de una plataforma de inteligencia de inversion full-stack usando tecnicas avanzadas de prompting de IA — incluyendo onboarding conversacional, integracion de datos en tiempo real y estrategias multi-perfil.',
        'Construido con ingenieria de prompts iterativa, descomposicion de problemas multi-turno y evaluacion de modelos para entregar un sistema de grado produccion con benchmarking historico, analisis de sector y backend seguro.',
      ],
    },
    impact: {
      eyebrow: 'Impacto',
      title: 'Este proyecto representa mas que una herramienta.',
      lines: [
        'Muestra como la IA puede transformar el analisis financiero — haciendolo mas rapido, escalable y accesible.',
      ],
      cards: ['Analisis financiero mas rapido', 'Sistemas financieros escalables', 'Inteligencia de inversion accesible'] as const,
    },
    future: {
      eyebrow: 'Futuro',
      title: 'Este es apenas el punto de partida.',
      lines: ['FinIQ puede evolucionar hacia:'],
      items: ['Plataforma multi-usuario', 'Inteligencia de portafolio automatizada', 'Soporte de decision impulsado por IA en tiempo real'] as const,
    },
    brand: {
      eyebrow: 'Marca Personal',
      title: 'Rider Ismal Novas Guzman',
      lines: ['Estudiante de Business & Data Analytics', 'Construyendo soluciones impulsadas por IA para analisis financiero'],
      tagline: 'Pensamiento de datos. Mindset de producto. Ejecucion con IA.',
      portfolio: 'Portfolio',
      linkedin: 'LinkedIn',
    },
    final: {
      eyebrow: 'Listo',
      title: 'Aqui convergen los datos, la IA y el pensamiento de producto.',
      lines: ['Vive la experiencia.'],
    },
  },
} as const;

export function LandingPage({ language, onStart }: LandingPageProps) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [activeSection, setActiveSection] = useState<StorySectionId>('hero');
  const c = content[language];
  const [showHelp, setShowHelp] = useState(false);

  const primaryHaloY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -180]);
  const secondaryHaloY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 140]);
  const heroVisualY = useTransform(scrollYProgress, [0, 0.24], [0, reduceMotion ? 0 : -58]);
  const heroVisualScale = useTransform(scrollYProgress, [0, 0.24], [1, reduceMotion ? 1 : 0.97]);

  const navItems = useMemo(
    () =>
      [
        ['hero', c.nav.hero],
        ['beginning', c.nav.beginning],
        ['tools', c.nav.tools],
        ['idea', c.nav.idea],
        ['solution', c.nav.solution],
        ['stack', c.nav.stack],
        ['process', c.nav.process],
        ['reality', c.nav.reality],
        ['impact', c.nav.impact],
        ['future', c.nav.future],
        ['brand', c.nav.brand],
        ['final', c.nav.final],
      ] as const,
    [c.nav],
  );

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-story-section]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) return;

        const nextId = visibleEntries[0].target.getAttribute('data-story-section') as StorySectionId | null;
        if (nextId) {
          setActiveSection(nextId);
        }
      },
      {
        threshold: [0.25, 0.45, 0.7],
        rootMargin: '-12% 0px -38% 0px',
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: StorySectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing-shell">
      <motion.div aria-hidden className="landing-background landing-background--primary" style={{ y: primaryHaloY }} />
      <motion.div aria-hidden className="landing-background landing-background--secondary" style={{ y: secondaryHaloY }} />

      <div className="landing-progress" aria-hidden>
        <motion.span style={{ scaleX: scrollYProgress, originX: 0 }} />
      </div>

      <header className="landing-topbar">
        <div className="landing-wordmark">
          <LogoIcon className="w-6 h-6 text-[#6be9d0]" />
          <div className="landing-wordmark__copy">
            <strong>FINIQ</strong>
            <span>{c.header}</span>
          </div>
        </div>

        <CTAButton onClick={onStart} size="sm">
          {c.cta}
        </CTAButton>
      </header>

        <aside className="landing-rail hidden xl:flex" aria-label="Story sections">
        {navItems.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className={cn('landing-rail__button', activeSection === id && 'is-active')}
            aria-label={String(label)}
          >
            <span className="landing-rail__dot" />
            <span className="landing-rail__label">{label}</span>
          </button>
        ))}
      </aside>

      <main className="relative z-10">
        <section
          id="hero"
          data-story-section="hero"
          className="landing-screen relative overflow-hidden px-6 pb-16 pt-30 md:px-10 lg:px-16 lg:pb-20 lg:pt-32"
        >
          <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-18">
            <div className="max-w-[34rem] space-y-8">
              <AnimatedWrapper y={12}>
                <div className="landing-pill">
                  <Sparkles size={14} className="text-[#6be9d0]" />
                  <span>{c.heroEyebrow}</span>
                </div>
              </AnimatedWrapper>

              <AnimatedWrapper delay={0.06}>
                <h1 className="text-6xl font-semibold tracking-[-0.08em] text-white md:text-8xl lg:text-[8rem]">
                  {c.heroTitle}
                </h1>
              </AnimatedWrapper>

              <AnimatedWrapper delay={0.12}>
                <p className="max-w-[28rem] text-xl leading-8 text-white/84 md:text-2xl">
                  {c.heroSubtitle}
                </p>
              </AnimatedWrapper>

              <AnimatedWrapper delay={0.18}>
                <p className="landing-copy max-w-[24rem] text-base leading-7 md:text-lg">
                  {c.heroBody}
                </p>
              </AnimatedWrapper>

              <AnimatedWrapper delay={0.24}>
                <div className="flex flex-wrap items-center gap-4">
                  <CTAButton onClick={onStart} size="lg">
                    {c.cta}
                  </CTAButton>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    <span className="h-px w-10 bg-white/12" />
                    <span>{c.heroHint}</span>
                  </div>
                </div>
              </AnimatedWrapper>

              <AnimatedWrapper delay={0.3}>
                <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <ChevronDown size={14} />
                  <span>{c.heroSignal}</span>
                </div>
              </AnimatedWrapper>
            </div>

            <AnimatedWrapper delay={0.18} className="relative">
              <motion.div className="landing-hero-stage" style={{ y: heroVisualY, scale: heroVisualScale }}>
                <div className="landing-hero-stage__halo" />

                <motion.div
                  className="landing-hero-panel w-full max-w-[580px] p-7 md:p-8"
                  style={{ top: 18, left: 0 }}
                  animate={reduceMotion ? undefined : { y: [-6, 8, -6] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="landing-hero-panel__topline">
                    <BarChart3 size={14} className="text-[#6be9d0]" />
                    <span>{c.heroSurface}</span>
                  </div>

                  <div className="mt-6 landing-dot-grid">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="mt-6 landing-meter">
                    {[64, 82, 91].map((value, index) => (
                      <div key={value} className="landing-meter__row">
                        <span>{['Data', 'Model', 'Reveal'][index]}</span>
                        <div className="landing-meter__bar">
                          <motion.span
                            className="landing-meter__fill"
                            initial={{ scaleX: 0, originX: 0 }}
                            whileInView={{ scaleX: value / 100 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ delay: 0.28 + index * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <span>{value}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="landing-hero-panel right-0 top-[210px] w-[74%] p-6 md:w-[70%]"
                  animate={reduceMotion ? undefined : { y: [10, -10, 10] }}
                  transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="landing-hero-panel__topline">
                    <MessageCircle size={14} className="text-[#f0c879]" />
                    <span>{c.heroFlow}</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {['Capital', 'Timeline', 'Risk'].map((label, index) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                      >
                        <div className="text-sm font-semibold text-white">{label}</div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">0{index + 1}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="landing-hero-panel bottom-0 left-[18%] flex w-[52%] items-center justify-between gap-4 px-5 py-4"
                  animate={reduceMotion ? undefined : { y: [-5, 6, -5] }}
                  transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{c.heroSurface}</div>
                    <div className="mt-1 text-lg font-semibold text-white">Signal locked in</div>
                  </div>
                  <div className="landing-chip bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.22em]">
                    <span className="landing-chip__dot" />
                    Live
                  </div>
                </motion.div>
              </motion.div>
              {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
            </AnimatedWrapper>
          </div>
        </section>

        <Section
          id="beginning"
          index="01"
          eyebrow={c.beginning.eyebrow}
          title={c.beginning.title}
          lines={c.beginning.lines}
          layout="sticky"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {c.beginning.cards.map((card, index) => (
              <AnimatedWrapper key={card.label} delay={0.08 + index * 0.08} y={16}>
                <div className="landing-stack-card">
                  <div className="landing-section-meta">
                    <span>0{index + 1}</span>
                    <span className="h-px w-8 bg-white/12" />
                    <span>{card.label}</span>
                  </div>
                  <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {card.title}
                  </p>
                  <p className="mt-3 max-w-[18rem] text-sm leading-6 text-slate-300">
                    {card.body}
                  </p>
                </div>
              </AnimatedWrapper>
            ))}

            <AnimatedWrapper delay={0.24} className="md:col-span-2">
              <div className="landing-signal-card grid gap-6 rounded-[32px] p-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:p-8">
                <div>
                  <div className="landing-section-meta">
                    <span>Input</span>
                    <span className="h-px w-8 bg-white/12" />
                    <span>Interpret</span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{c.beginning.signal}</p>
                </div>
                <div className="hidden h-px w-16 bg-gradient-to-r from-transparent via-[#6be9d0] to-transparent md:block" />
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Insight</div>
                  {c.beginning.signalBody.map((line) => (
                    <p key={line} className="mt-2 text-lg font-semibold text-white">{line}</p>
                  ))}
                </div>
              </div>
            </AnimatedWrapper>
          </div>
        </Section>

        <Section
          id="tools"
          index="02"
          eyebrow={c.tools.eyebrow}
          title={c.tools.title}
          lines={c.tools.lines}
          layout="split"
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {tools.map((tool, index) => (
                <AnimatedWrapper key={tool} delay={0.06 + index * 0.05} y={14}>
                  <div className="landing-chip h-full justify-between rounded-[24px] px-5 py-5 text-left">
                    <span>{tool}</span>
                    <span className="landing-chip__dot" />
                  </div>
                </AnimatedWrapper>
              ))}
            </div>

            <AnimatedWrapper delay={0.34} y={16}>
              <div className="landing-stack-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="landing-section-meta">
                      <Layers3 size={14} className="text-[#6be9d0]" />
                      <span>Stack</span>
                    </div>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">
                      The tools were already telling a product story.
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Analyst to builder
                  </div>
                </div>
              </div>
            </AnimatedWrapper>
          </div>
        </Section>

        <Section
          id="idea"
          index="03"
          eyebrow={c.idea.eyebrow}
          title={c.idea.title}
          lines={c.idea.lines}
          layout="centered"
          visualClassName="mt-10"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {c.idea.lines.map((line, index) => (
              <AnimatedWrapper key={line} delay={0.12 + index * 0.08} y={14}>
                <div className="landing-question-card h-full">
                  <div className="landing-section-meta">
                    <span>Question 0{index + 1}</span>
                  </div>
                  <p className="mt-5 max-w-[18rem] text-2xl font-semibold tracking-[-0.05em] text-white md:text-3xl">
                    {line}
                  </p>
                </div>
              </AnimatedWrapper>
            ))}
          </div>

          <AnimatedWrapper delay={0.28} y={16}>
            <div className="mt-8 flex justify-center">
              <div className="landing-chip rounded-[24px] px-6 py-4">
                <Zap size={14} className="text-[#f0c879]" />
                <span className="font-semibold">{c.idea.note}</span>
              </div>
            </div>
          </AnimatedWrapper>
        </Section>

        <Section
          id="solution"
          index="04"
          eyebrow={c.solution.eyebrow}
          title={c.solution.title}
          lines={c.solution.lines}
          layout="sticky"
        >
          <div className="grid gap-4">
            {c.solution.steps.map(([label, detail], index) => (
              <AnimatedWrapper key={label} delay={0.08 + index * 0.06} y={18}>
                <div className="landing-step">
                  <div className="flex items-start justify-between gap-5">
                    <div className="space-y-3">
                      <div className="landing-step__number">0{index + 1}</div>
                      <div>
                        <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      {index === 0 ? 'Input' : index === 1 ? 'Collect' : index === 2 ? 'Generate' : 'Reveal'}
                    </div>
                  </div>
                </div>
              </AnimatedWrapper>
            ))}
          </div>
        </Section>

        <Section
          id="stack"
          index="05"
          eyebrow={c.stack.eyebrow}
          title={c.stack.title}
          lines={c.stack.lines}
          layout="split"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {aiStack.map((item, index) => (
              <AnimatedWrapper key={item} delay={0.06 + index * 0.05} y={14}>
                <motion.div
                  className="landing-chip h-full justify-between rounded-[24px] px-5 py-5"
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex items-center gap-3">
                    <Cpu size={16} className="text-[#6be9d0]" />
                    <span>{item}</span>
                  </div>
                  <span className="landing-chip__dot" />
                </motion.div>
              </AnimatedWrapper>
            ))}
          </div>
        </Section>

        <Section
          id="process"
          index="06"
          eyebrow={c.process.eyebrow}
          title={c.process.title}
          lines={c.process.lines}
          layout="split"
        >
          <div className="grid gap-4">
            {processCards.map((card, index) => (
              <AnimatedWrapper key={card} delay={0.08 + index * 0.08} y={16}>
                <div className="landing-stack-card">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="landing-section-meta">
                        <Workflow size={14} className="text-[#f0c879]" />
                        <span>Stage 0{index + 1}</span>
                      </div>
                      <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{card}</p>
                    </div>
                    <div className="text-4xl font-semibold tracking-[-0.06em] text-white/16">0{index + 1}</div>
                  </div>
                </div>
              </AnimatedWrapper>
            ))}
          </div>
        </Section>

        <Section
          id="reality"
          index="07"
          eyebrow={c.reality.eyebrow}
          title={c.reality.title}
          lines={c.reality.lines}
          layout="split"
        >
          <div className="grid gap-4">
            {c.reality.points.map((point, index) => (
              <AnimatedWrapper key={index} delay={0.08 + index * 0.08} y={16}>
                <div className="landing-stack-card">
                  <div className="landing-section-meta">
                    <UserRound size={14} className="text-[#1dd4b4]" />
                    <span>Achievement 0{index + 1}</span>
                  </div>
                  <p className="mt-4 text-[14.5px] leading-[1.7] text-slate-300">
                    {point}
                  </p>
                </div>
              </AnimatedWrapper>
            ))}
          </div>
        </Section>

        <Section
          id="impact"
          index="08"
          eyebrow={c.impact.eyebrow}
          title={c.impact.title}
          lines={c.impact.lines}
          layout="centered"
          visualClassName="mt-10"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {c.impact.cards.map((card, index) => (
              <AnimatedWrapper key={card} delay={0.08 + index * 0.08} y={14}>
                <div className="landing-future-card h-full text-center">
                  <div className="landing-section-meta justify-center">
                    <Zap size={14} className="text-[#f0c879]" />
                    <span>0{index + 1}</span>
                  </div>
                  <p className="mt-4 text-xl font-semibold tracking-[-0.04em] text-white">{card}</p>
                </div>
              </AnimatedWrapper>
            ))}
          </div>
        </Section>

        <Section
          id="future"
          index="09"
          eyebrow={c.future.eyebrow}
          title={c.future.title}
          lines={c.future.lines}
          layout="split"
        >
          <div className="grid gap-4">
            {c.future.items.map((card, index) => (
              <AnimatedWrapper key={card} delay={0.08 + index * 0.08} y={14}>
                <div className="landing-future-card">
                  <div className="landing-section-meta">
                    <span>Next</span>
                    <span className="h-px w-8 bg-white/12" />
                    <span>0{index + 1}</span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{card}</p>
                </div>
              </AnimatedWrapper>
            ))}
          </div>
        </Section>

        <Section
          id="brand"
          index="10"
          eyebrow={c.brand.eyebrow}
          title={c.brand.title}
          lines={c.brand.lines}
          layout="split"
        >
          <div className="grid gap-4">
            <AnimatedWrapper delay={0.08} y={14}>
              <div className="landing-founder-card">
                <div className="landing-section-meta">
                  <span>Founder</span>
                  <span className="h-px w-8 bg-white/12" />
                  <span>Identity</span>
                </div>
                <p className="mt-5 max-w-[20rem] text-3xl font-semibold tracking-[-0.05em] text-white">
                  {c.brand.tagline}
                </p>
              </div>
            </AnimatedWrapper>

            <div className="grid gap-4">
              {[
                [c.brand.portfolio, 'https://riderismal11.github.io/portfolio/'],
                [c.brand.linkedin, 'https://www.linkedin.com/in/rider-novas'],
              ].map(([label, href], index) => (
                <AnimatedWrapper key={label} delay={0.16 + index * 0.06} y={14}>
                  <a href={href} target="_blank" rel="noreferrer" className="landing-link-chip">
                    <span className="landing-link">{label}</span>
                    <ArrowUpRight size={16} className="text-slate-400" />
                  </a>
                </AnimatedWrapper>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="final"
          index="11"
          eyebrow={c.final.eyebrow}
          title={c.final.title}
          lines={c.final.lines}
          layout="centered"
          visualClassName="mt-10"
          className="pb-22"
        >
          <div className="mx-auto grid max-w-[940px] gap-5">
            <AnimatedWrapper delay={0.12} y={16}>
              <div className="landing-dual-card rounded-[32px] px-6 py-8 md:px-8">
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <div className="text-left">
                    <div className="landing-section-meta">
                      <MessageCircle size={14} className="text-[#6be9d0]" />
                      <span>Chatbot</span>
                    </div>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Conversation starts the flow.</p>
                  </div>
                  <div className="hidden h-px w-14 bg-gradient-to-r from-transparent via-[#6be9d0] to-transparent md:block" />
                  <div className="text-left md:text-right">
                    <div className="landing-section-meta md:justify-end">
                      <BarChart3 size={14} className="text-[#f0c879]" />
                      <span>Dashboard</span>
                    </div>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Insight lands in the app.</p>
                  </div>
                </div>
              </div>
            </AnimatedWrapper>

            <AnimatedWrapper delay={0.18} y={16}>
              <div className="flex justify-center">
                <CTAButton onClick={onStart} size="lg">
                  {c.cta}
                </CTAButton>
              </div>
            </AnimatedWrapper>
          </div>
        </Section>
      </main>
    </div>
  );
}
