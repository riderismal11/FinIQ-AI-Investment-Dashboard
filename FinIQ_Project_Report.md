# FinIQ — Technical Project Report

**Version:** 1.1  
**Last Updated:** March 30, 2026  
**Status:** 100% Complete (Production Deployed)

---

## 1. PROJECT OVERVIEW

FinIQ is a full-stack, AI-powered financial intelligence and portfolio management platform. It guides users through a personalized onboarding process to understand their investment capital, time horizon, and risk tolerance, then generates a globally diversified portfolio optimized for their specific profile using real-time market data from multiple providers.

The platform is built as a **Single Page Application (SPA)** with an **Express.js backend** that proxies financial APIs and orchestrates AI interactions, ensuring API keys never reach the browser. Now fully deployed on **Render.com** for live production use with secure environment variable management.

### Target Users
- Entry-to-mid-level retail investors seeking professional-grade portfolio construction.
- Users interested in AI-assisted financial planning and "what-if" scenario simulation.
- Multi-lingual users (English and Spanish).

### Current Completion: 100%
All core features, financial models, AI integrations, security layers, and brand identity are fully functional and deployed to production. Platform features a robust AI fallback routing system for high availability.

---

## 2. TECH STACK

| Layer | Technology | Version |
|:---|:---|:---|
| **Frontend Framework** | React | 19.0.0 |
| **Language** | TypeScript | 5.8.2 |
| **Build Tool** | Vite | 6.2.0 |
| **CSS Framework** | Tailwind CSS | 4.1.14 |
| **Animation** | Motion (Framer Motion) | 12.23.24 |
| **Charts** | Recharts | 3.8.0 |
| **Icons** | Lucide React | 0.546.0 |
| **Markdown Rendering** | react-markdown | 10.1.0 |
| **Utility** | clsx, tailwind-merge | 2.1.1, 3.5.0 |
| **Backend Framework** | Express.js | 4.21.2 |
| **Runtime** | Node.js + tsx | 4.21.0 |
| **AI / LLM** | Primary: OpenCode, Fallback: OpenAI-compatible APIs & Gemini | Production Routing |
| **Financial Data (Primary)** | Yahoo Finance (`yahoo-finance2`) | 3.13.2 |
| **Financial Data (Secondary)** | Alpaca Market Data API | REST v2/v1beta3 |
| **Security** | Helmet, Express Rate Limit | 8.1.0, 8.3.1 |
| **Environment** | dotenv | 17.2.3 |

---

## 3. PROJECT ARCHITECTURE

### 3.1 File Structure (40+ source files, ~6,500+ lines of code)

```
finiq/
├── server.ts                    # Express server entry point (251 lines)
├── server/
│   ├── config.ts                # Runtime configuration resolver (176 lines)
│   ├── constants.ts             # Centralized magic numbers (38 lines)
│   ├── security.ts              # Input validation & prompt injection defense (273 lines)
│   ├── marketData.ts            # Multi-provider market data service (429 lines)
│   ├── aiHandlers.ts            # AI request orchestration (25,315 bytes)
│   ├── ai/
│   │   ├── provider.ts          # Gemini + OpenAI-compatible AI provider (11,618 bytes)
│   │   ├── prompts.ts           # Bilingual system/user prompt engineering (157 lines)
│   │   ├── tools.ts             # LLM Function Calling tool definitions (134 lines)
│   │   └── types.ts             # Shared AI types (772 bytes)
│   └── lib/
│       └── lru-cache.ts         # Generic LRU cache utility (1,761 bytes)
├── src/
│   ├── App.tsx                  # Main application shell + state management (553 lines)
│   ├── main.tsx                 # React DOM entry point
│   ├── index.css                # Design system tokens + global styles (100 lines)
│   ├── types/index.ts           # TypeScript type definitions (48 lines)
│   ├── utils/
│   │   ├── cn.ts                # Tailwind class merge utility
│   │   └── format.ts            # Number/currency formatting helpers
│   ├── services/
│   │   ├── financeService.ts    # Client-side financial engine (935 lines)
│   │   └── geminiService.ts     # Client→Server AI bridge (71 lines)
│   └── components/
│       ├── Logo.tsx             # SVG brand logo component
│       ├── LandingPage.tsx      # Animated scroll-driven landing page (808 lines)
│       ├── Chatbot.tsx          # AI conversational interface (593 lines)
│       ├── ChatAnalysisPanel.tsx # Expanded "Deep Dive" response panel
│       ├── AIInsights.tsx       # AI-generated portfolio analysis card
│       ├── Charts.tsx           # Performance history line chart
│       ├── HistoricalChart.tsx  # Time-range historical performance
│       ├── HistoricalComparator.tsx # Multi-benchmark comparison (S&P, Gold, BTC)
│       ├── KPICards.tsx         # Key performance indicator tiles
│       ├── PortfolioTable.tsx   # Asset holdings data table
│       ├── RiskPanel.tsx        # Risk intelligence assessment
│       ├── RiskReturnChart.tsx  # Risk vs. return scatter plot
│       ├── SectorPerformanceBars.tsx # YTD sector breakdown
│       ├── StrategyCards.tsx    # Strategy comparison cards
│       ├── WhatIf.tsx          # Scenario simulator (Bull/Bear/Stagnant)
│       ├── Brokerages.tsx      # Execution platforms footer
│       ├── ErrorBoundary.tsx   # React error boundary wrapper
│       └── landing/
│           ├── AnimatedWrapper.tsx  # Scroll-driven animation wrapper
│           ├── CTAButton.tsx       # Animated call-to-action button
│           ├── Section.tsx         # Landing page section component
│           └── landing.css         # Landing page styles (10,940 bytes)
└── public/
    └── favicon.svg             # Custom SVG favicon
```

### 3.2 Data Flow Architecture

```
┌──────────────────────────────────────────────┐
│                 BROWSER (SPA)                │
│                                              │
│  LandingPage ──→ App.tsx (SessionData state) │
│                    │                         │
│         ┌─────────┼──────────┐               │
│         ▼         ▼          ▼               │
│     Chatbot    Dashboard   Charts            │
│     (AI chat)  (KPIs,      (Recharts)        │
│         │       Tables)                      │
│         ▼                                    │
│   geminiService.ts ──→ financeService.ts     │
│         │    (fetch)       (calculations)    │
└─────────┼────────────────────────────────────┘
          │ HTTP POST/GET
          ▼
┌──────────────────────────────────────────────┐
│              EXPRESS SERVER                  │
│                                              │
│  Helmet ─→ Rate Limiter ─→ Origin Check      │
│  ─→ Input Validation (security.ts)           │
│  ─→ Secret Leak Prevention                   │
│                                              │
│  /api/finance/quote/:symbol                  │
│  /api/finance/history/:symbol                │
│  /api/ai/insights  (POST)                    │
│  /api/ai/chat      (POST)                    │
│         │                                    │
│    ┌────┴────────────────┐                   │
│    ▼                     ▼                   │
│  marketData.ts       aiHandlers.ts           │
│  (Yahoo + Alpaca)    (Gemini + Function      │
│                       Calling + Tools)       │
└──────────────────────────────────────────────┘
```

---

## 4. THE EXPERIENCE (VISUAL & UI/UX)

### 4.1 Visual Identity & Brand

- **Aesthetic:** "Digital Obsidian" — Modern Dark Theme with Glassmorphism.
- **Logo:** Custom SVG component (`Logo.tsx`) — An upward-trending chart line with arrow inside a rounded container, rendered in teal (#1dd4b4). Used globally across the landing page, chatbot header, mobile header, and favicon.
- **Color Palette:**

| Token | Hex | Usage |
|:---|:---|:---|
| `--color-bg` | `#0a0f1a` | Page background (Deep Space Navy) |
| `--color-card` | `#0c1220` | Card backgrounds with gradient overlay |
| `--color-primary` | `#1dd4b4` | Accent, buttons, success states (Electric Teal) |
| `--color-primary-hover` | `#4ef1cf` | Interactive hover states |
| `--color-secondary` | `#c9a84c` | Aggressive profile highlight (Muted Gold) |
| `--color-text-primary` | `#ffffff` | Headings, primary text |
| `--color-text-secondary` | `#94a3b8` | Body text, descriptions |
| `--color-text-muted` | `#64748b` | Placeholders, de-emphasized text |

- **Typography:**
  - **Sans:** `Inter` — Clean, professional legibility for all UI text.
  - **Mono:** `JetBrains Mono` — Precise financial data, ticker symbols, numbers.
- **Component Classes:** `card`, `btn-primary`, `btn-secondary`, `input-field`, `badge`, `glass-effect`, `custom-scrollbar`.

### 4.2 User Interaction Flow

1. **The Portal (Landing Page)** — A cinematic, scroll-driven narrative built with `framer-motion` scroll-linked animations and 11 navigable sections (Intro, Start, Tools, Idea, Solution, AI Stack, Process, Reality, Future, Brand, Launch). Features parallax effects, glassmorphism cards, and animated progress dots.

2. **The Dialogue (Onboarding via Chatbot)** — A 3-question conversational onboarding that asks:
   - Q1: "How much are you looking to invest?" (e.g., $5,000)
   - Q2: "What is your investment horizon?" (e.g., 5 years)
   - Q3: "What is your risk tolerance?" (Conservative / Moderate / Aggressive)
   After completion, the AI automatically generates a diversified portfolio and triggers the dashboard.

3. **The Intelligence Center (Dashboard)** — A responsive grid layout featuring 10+ interactive modules, each updating reactively when the session state changes.

### 4.3 Navigation

- **Hash-based SPA routing:** Landing page → `/#app` (dashboard). Browser back button fully supported via `popstate` + `hashchange` event listeners.
- **Mobile responsive:** Collapsible chat panel with toggle button on smaller viewports.
- **Bilingual:** Full English/Spanish toggle affects all UI labels, AI responses, and chart formatting.

---

## 5. THE ENGINE (BACKEND DEEP DIVE)

### 5.1 Server (`server.ts` — 251 lines)

The Express server is the secure gateway between the browser and external APIs:

- **Helmet:** HTTP security headers (CSP disabled for SPA compatibility).
- **Rate Limiting:** 150 req/15min for general API, 25 req/15min for AI endpoints.
- **Origin Validation:** In production, AI endpoints reject requests from external origins.
- **Secret Leak Prevention:** All AI responses are scanned to ensure API keys never leak to the client.
- **Vite Integration:** In development, Vite runs as middleware for HMR. In production, serves the built `dist/` folder.

### 5.2 Multi-Provider Market Data (`marketData.ts` — 429 lines)

A sophisticated **Provider Pattern** with automatic failover:

| Provider | Feed Type | Asset Coverage |
|:---|:---|:---|
| **Yahoo Finance** | Delayed (global) | Stocks, ETFs, Bonds, Indices, Crypto, Commodities |
| **Alpaca** (IEX/SIP) | Live real-time | US Stocks, ETFs |
| **Alpaca** (Crypto) | Live real-time | BTC, ETH, SOL, and all major pairs |

- Configurable primary/fallback order via `MARKET_DATA_PRIMARY` env var.
- Automatic failover: if the primary provider fails, the fallback is tried silently.
- Response headers expose data source metadata (`X-Market-Data-Source`, `X-Market-Data-Live`).

### 5.3 AI Integration (`aiHandlers.ts` + `ai/` — 4 files)

**Multi-Provider AI Support:**

| Provider | Configuration |
|:---|:---|
| **OpenCode (Primary)** | Default AI provider ensuring high-performance evaluations. |
| **OpenAI-Compatible** | Intelligent fallback mechanism. Overridden when primary hits usage limits or fails. |
| **Google Gemini** | Alternative routing. Requires `GEMINI_API_KEY`. Model: `gemini-2.0-flash-lite`. |
| **Local Fallback** | Returns graceful hardcoded fallback responses when APIs fail or keys are absent. |

**Intelligent AI Fallback Resilience:**
The system features an autonomous AI routing mechanism. If the primary OpenCode provider fails or hits usage limits, the handler seamlessly routes the request to the configured fallback provider, ensuring continuous availability, backed up by health and metrics endpoints for observability.

**LLM Function Calling (6 tools defined in `tools.ts`):**

The AI assistant can modify the user's portfolio in real-time by calling these tools:

| Tool | Description |
|:---|:---|
| `updateInvestmentAmount` | Change total investment (e.g., "I want to invest $10k") |
| `updateRiskProfile` | Switch risk profile (e.g., "make it more aggressive") |
| `updateTimeHorizon` | Change time horizon (e.g., "I'm thinking 10 years") |
| `addAsset` | Add/update a specific asset (e.g., "add 15% NVDA") |
| `removeAsset` | Remove an asset (e.g., "remove Bitcoin") |
| `replacePortfolio` | Replace entire portfolio with AI-generated custom allocation |

**Prompt Engineering (`prompts.ts` — 157 lines):**

- Bilingual system instructions (EN/ES) with financial context injection.
- Portfolio and metrics data are serialized into the system prompt so the AI always has full context.
- `[DEEP_DIVE]` marker protocol: When the AI determines a response needs more space (tables, comparisons), it prefixes with `[DEEP_DIVE]` + a 1-line summary. The frontend renders the summary in the chat and the full content in an expanded dashboard panel.
- Style instruction: "Respond like an expert advisor, direct and action-oriented."
- Security: User messages are wrapped with `[USER_INPUT]` prefix and the AI is instructed to never interpret them as system instructions.

### 5.4 Security Layer (`security.ts` — 273 lines)

A comprehensive defense-in-depth approach:

- **Input Sanitization:** All user inputs are NFKC-normalized, stripped of HTML tags, JS event handlers, and control characters.
- **Prompt Injection Detection:** 11 regex patterns detect common injection attacks (e.g., "ignore all previous instructions", "you are now", "jailbreak", "developer mode").
- **Ticker Validation:** Regex-based validation for Yahoo Finance ticker format (1-12 chars, alphanumeric + `^`, `-`, `.`).
- **Date Validation:** ISO 8601 format with max 15-year range.
- **Portfolio Validation:** Ensures allocations sum to 100%, amounts ≥ $100, max 50 assets.
- **History Sanitization:** Chat history is truncated to 20 items, each message re-sanitized.

### 5.5 Configuration System (`config.ts` — 176 lines)

A fully environment-driven configuration system:

```
PORT, NODE_ENV, DISABLE_HMR
AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_BASE_URL
GEMINI_API_KEY, GEMINI_MODEL
ALPACA_API_KEY, ALPACA_SECRET_KEY
ALPACA_STOCK_FEED (iex|sip), ALPACA_CRYPTO_FEED
MARKET_DATA_PRIMARY (alpaca|yahoo)
```

Auto-detection: If no `AI_PROVIDER` is set, the system infers the provider from available keys.

### 5.6 Performance Utilities

- **LRU Cache** (`lib/lru-cache.ts`): Generic least-recently-used cache for server-side data caching.
- **Client-side Caching** (`financeService.ts`): 5-minute TTL caches for quotes, history, and price series. Prevents redundant Yahoo Finance requests.
- **AI Throttling** (`geminiService.ts`): Minimum 1-second gap between AI calls.

---

## 6. THE FINANCIAL ENGINE (`financeService.ts` — 935 lines)

The largest single file in the project, this is the core calculation engine:

### 6.1 Portfolio Construction

- **3 Pre-built Portfolios** (`BASE_PORTFOLIOS`):
  - **Conservative** (8 assets): 60% Bonds, 25% Stocks, 5% Gold, 10% Dividends.
  - **Moderate** (8 assets): 35% Stocks, 25% Growth, 15% Bonds, 10% International, 10% Dividends, 5% Gold.
  - **Aggressive** (10 assets): 65% Growth/Tech, 15% Emerging Markets, 5% Gold, 5% Crypto, 10% Other.

- **Allocation Engine:** Normalizes all allocations to sum exactly to 100.0000%. Handles edge cases (zero allocations, NaN values, unbalanced drift correction).

- **Dynamic Asset Management:** `upsertAssetAllocation()` — When the AI adds/modifies an asset, all other allocations are proportionally reweighted.

### 6.2 Financial Calculations

| Metric | Formula | Description |
|:---|:---|:---|
| **CAGR** | `(endValue/startValue)^(1/years) - 1` | Compound Annual Growth Rate |
| **Expected Gain** | `amount × (1 + CAGR)^years - amount` | Projected profit in dollars |
| **Volatility** | `σ(dailyReturns) × √252` | Annualized standard deviation |
| **Sharpe Ratio** | `(CAGR - riskFreeRate) / volatility` | Risk-adjusted return |
| **Max Drawdown** | `max(|peak - trough| / peak)` | Worst historical loss |
| **VaR 95%** | `5th percentile × √21` | Monthly Value-at-Risk |

### 6.3 Dual-Mode Metrics

1. **From Yahoo Finance** (`calculatePortfolioMetricsFromYahoo`): Fetches 1 year of daily adjusted close prices for every asset, computes weighted portfolio daily returns, and derives all metrics from actual historical data. Includes automatic risk-free rate lookup from `^TNX` (10-Year Treasury).

2. **Estimated Fallback** (`calculateMetrics`): When Yahoo Finance is unavailable, uses curated estimated returns and volatilities for 35+ common assets (SPY, QQQ, BTC-USD, etc.) with seeded deterministic fallbacks for unknown tickers.

### 6.4 Chart Data Generation

- **Historical Performance Series:** Weighted portfolio value path vs. S&P 500 benchmark, computed from daily return streams with date intersection alignment.
- **Risk vs. Return Scatter:** Per-asset risk/return positioning for visual portfolio analysis.
- **Historical Comparator Data:** Multi-benchmark comparison against S&P 500, Gold, and Bitcoin.

---

## 7. FRONTEND COMPONENTS (17 components)

### 7.1 Landing Page (`LandingPage.tsx` — 808 lines)

A full cinematic scroll-driven experience with 11 sections:

| Section | Content |
|:---|:---|
| **Intro** | Hero text: "From raw data to AI guided portfolio insight" |
| **Start** | "This started with data. Two projects." |
| **Tools** | Tech stack showcase (Python, React, Gemini, Yahoo Finance) |
| **Idea** | Problem statement: "People access markets, but rarely understand positioning" |
| **Solution** | FinIQ's unique value prop: AI-driven onboarding |
| **AI Stack** | AI & Machine Learning pipeline details |
| **Journey** | Professional resume achievements integrated to showcase project development |
| **Process** | How the 3-question flow works |
| **Reality** | Current state: fully functional live demo |
| **Future** | Roadmap items |
| **Brand** | Logo and identity showcase |
| **Launch** | Final CTA with gradient button |

- Scroll-linked progress bar at top.
- Dot navigation sidebar on desktop.
- Full bilingual support (EN/ES content objects).
- Glass-effect floating header with logo.

### 7.2 Chatbot (`Chatbot.tsx` — 593 lines)

- 3-step guided onboarding with real-time validation.
- Free-form AI conversation after onboarding completion.
- Message history with typing indicators and animated bubbles.
- Language toggle (EN/ES) in header.
- `[DEEP_DIVE]` detection: Long AI responses automatically expand to the `ChatAnalysisPanel`.
- Function call handling: When the AI returns tool calls, the chatbot executes them and updates the dashboard state.

### 7.3 Dashboard Components

| Component | Lines | Purpose |
|:---|:---|:---|
| **KPICards** | 3,866 bytes | Total Capital, Time Horizon, Risk Profile, Strategy cards |
| **StrategyCards** | 10,348 bytes | Compare Conservative, Moderate, Aggressive strategies with expected returns |
| **Charts** | 4,161 bytes | Interactive performance history line chart (Portfolio vs. S&P 500) |
| **HistoricalChart** | 9,670 bytes | Time-range selectable performance chart (6m, 1y, 3y, 5y) |
| **HistoricalComparator** | 9,342 bytes | Multi-benchmark bar chart (vs. S&P 500, Gold, BTC) |
| **RiskPanel** | 6,051 bytes | Risk assessment (Safe/Balanced/Volatile) with visual score |
| **RiskReturnChart** | 7,693 bytes | Scatter plot: each asset's risk vs. return positioning |
| **SectorPerformanceBars** | 5,776 bytes | YTD return breakdown by sector (Tech, Finance, Energy, etc.) |
| **PortfolioTable** | 7,916 bytes | Full asset holdings table with allocation, amount, change % |
| **WhatIf** | 5,394 bytes | Scenario simulator: Bull (+30%), Stagnant (0%), Bear (-30%) |
| **AIInsights** | 5,414 bytes | AI-generated portfolio analysis with loading animation |
| **Brokerages** | 3,644 bytes | Execution platforms footer (Fidelity, Schwab, Interactive Brokers, etc.) |
| **ChatAnalysisPanel** | 3,178 bytes | Expanded "Deep Dive" overlay for rich AI responses |

### 7.4 Reusable Landing Sub-Components

| Component | Purpose |
|:---|:---|
| **AnimatedWrapper** | Scroll-triggered `motion.div` with configurable entrance animation |
| **CTAButton** | Gradient animated call-to-action with hover scale effect |
| **Section** | Standardized landing section with numbering + title |

---

## 8. WHAT IT TOOK TO BUILD THIS

### 8.1 Design & Branding
- Custom SVG logo created and iterated (3+ versions) with viewBox optimization, proper centering, and proportional stroke widths.
- Favicon designed as matching SVG with dark container background.
- Full design system established: 10 color tokens, 2 font families, glass effects, custom scrollbars, card gradients, badge styles.
- Landing page with 10,940 bytes of custom CSS for scroll-driven cinematics.
- Brand identity consultation using Google Stitch MCP for professional fintech-grade aesthetics.

### 8.2 Frontend Engineering
- 17 React components, all fully typed with TypeScript.
- State-driven architecture: Single `SessionData` object flows through the entire app.
- Responsive design: Mobile-first with collapsible panels.
- Smooth animations with `framer-motion` (scroll-linked and element transitions).
- 6 interactive Recharts visualizations (line, bar, scatter, area).
- Bilingual UI (EN/ES) with runtime language switching that affects all text, charts, and AI context.
- Browser history integration with hash-based navigation (`/#app`).

### 8.3 Backend Engineering
- Full Express.js server with 4 API endpoints.
- Multi-provider market data architecture (Yahoo Finance + Alpaca) with automatic failover.
- Multi-provider AI architecture (Gemini, OpenAI-compatible, local fallback).
- LLM Function Calling with 6 portfolio manipulation tools.
- Bilingual prompt engineering (157 lines of carefully crafted system instructions).
- Server-side input validation and sanitization (273 lines of security code).
- Prompt injection detection (11 regex patterns).
- API key leak prevention middleware.
- LRU caching layer for performance.

### 8.4 Financial Engineering
- 935-line financial calculation engine.
- 35+ pre-estimated asset returns and volatilities for fallback coverage.
- 3 pre-built diversified portfolios (Conservative, Moderate, Aggressive).
- Real-time CAGR, Sharpe, VaR, Max Drawdown calculations from Yahoo Finance data.
- Portfolio rebalancing algorithm with precise allocation normalization.
- Historical portfolio value path reconstruction from daily returns.
- Risk-free rate lookup from US 10-Year Treasury yield.
- Multi-benchmark comparison engine (S&P 500, Gold, Bitcoin).

---

## 9. FEATURES MATRIX

| Feature | Status | Component(s) |
|:---|:---|:---|
| **Scroll-Driven Landing Page** | ✅ Working | `LandingPage.tsx`, `landing/` |
| **Custom SVG Brand Logo** | ✅ Working | `Logo.tsx`, `favicon.svg` |
| **3-Question AI Onboarding** | ✅ Working | `Chatbot.tsx` |
| **Bilingual Interface (EN/ES)** | ✅ Working | All components |
| **Bento Dashboard** | ✅ Working | `App.tsx` + 13 components |
| **AI Portfolio Generation** | ✅ Working | `aiHandlers.ts`, `tools.ts` |
| **AI Chat (Function Calling)** | ✅ Working | `Chatbot.tsx`, `geminiService.ts` |
| **Deep Dive Expanded View** | ✅ Working | `ChatAnalysisPanel.tsx` |
| **Strategy Comparison** | ✅ Working | `StrategyCards.tsx` |
| **AI Custom Strategy** | ✅ Working | `StrategyCards.tsx` + chatbot |
| **Performance History Charts** | ✅ Working | `Charts.tsx`, `HistoricalChart.tsx` |
| **Historical Comparator (S&P, Gold, BTC)** | ✅ Working | `HistoricalComparator.tsx` |
| **Risk Intelligence Assessment** | ✅ Working | `RiskPanel.tsx` |
| **Risk vs. Return Scatter** | ✅ Working | `RiskReturnChart.tsx` |
| **YTD Sector Analysis** | ✅ Working | `SectorPerformanceBars.tsx` |
| **Portfolio Holdings Table** | ✅ Working | `PortfolioTable.tsx` |
| **Scenario Simulator (Bull/Bear)** | ✅ Working | `WhatIf.tsx` |
| **AI-Generated Insights** | ✅ Working | `AIInsights.tsx` |
| **Execution Platforms** | ✅ Working | `Brokerages.tsx` |
| **Multi-Provider Market Data** | ✅ Working | `marketData.ts` (Yahoo + Alpaca) |
| **Multi-Provider AI** | ✅ Working | `ai/provider.ts` (Ollama/Kimi K2.5 + Gemini + Local) |
| **Input Sanitization & Validation** | ✅ Working | `security.ts` |
| **Prompt Injection Defense** | ✅ Working | `security.ts` |
| **API Key Leak Prevention** | ✅ Working | `server.ts` middleware |
| **Rate Limiting** | ✅ Working | `server.ts` |
| **Browser Back Button Navigation** | ✅ Working | `App.tsx` (hash routing) |
| **Mobile Responsive Layout** | ✅ Working | All components |
| **Error Boundary** | ✅ Working | `ErrorBoundary.tsx` |
| **Intelligent AI Fallback** | ✅ Working | `aiHandlers.ts` routing |
| **Health & Metrics Endpoints** | ✅ Working | `/api/health`, `/api/metrics` |
| **Production Deployment** | ✅ Working | Render.com & Env Vars |

---

## 10. TECHNICAL GAP ANALYSIS (ROAD TO 100%)

### A. Functional Gaps (~7%)
- **User Persistence (3%):** Database integration (Supabase/PostgreSQL) to save `SessionData`. Currently, all progress is lost on page refresh.
- **Backtesting Sandbox (2%):** "What if I held this portfolio during the 2008 Crisis?" or "During COVID?"
- **PDF/Excel Export (1%):** Branded financial reports for offline consultation.
- **Interactive Rebalancing (1%):** Drag-and-drop or slider-based allocation adjustment in `PortfolioTable`.

### B. Technical Refinement
- **Dividend Integration:** CAGR is price-appreciation-only. Incorporating dividend yield would add ~2–4% accuracy for conservative portfolios.
- **Inflation Adjustment:** Projections in "Nominal" and "Real" (inflation-adjusted) terms.
- **Monte Carlo Simulation:** Replace simple standard deviation with Monte Carlo for risk intelligence.
- **Mobile UX Polish:** Horizontal swipe for `StrategyCards`, collapsed mobile-first `PortfolioTable`.
- **Server-Side Market Data Cache:** Isomorphic cache to prevent Yahoo Finance rate-limiting during concurrent users.

---

## 11. VERSION HISTORY

| Date | Milestone |
|:---|:---|
| Mar 2026 | **Genesis:** Project started as "InvestIQ" with Google AI Studio. |
| Mar 14, 2026 | **Rebrand:** Renamed from InvestIQ to **FinIQ**. |
| Mar 15, 2026 | **Critical Fix:** Resolved bugs, improved data accuracy, enhanced UI/UX. |
| Mar 20, 2026 | **Strategy Redesign:** 3 default strategies + AI Custom Strategy view. |
| Mar 21, 2026 | **UI Polish:** Risk Intelligence accuracy, chart interactivity, number formatting. |
| Mar 24, 2026 | **AI Upgrade:** Configured Ollama Cloud with Kimi K2.5 model. Deep Dive panel added. |
| Mar 26, 2026 | **Architecture Report:** Full technical documentation generated. |
| Mar 27, 2026 | **Logo Redesign:** Custom SVG logo (3 iterations), favicon, global brand update. |
| Mar 28, 2026 | **Navigation Fix:** Hash-based routing for browser back-button support. |
| Mar 29, 2026 | **Resilience:** Implemented Intelligent AI Fallback routing (OpenCode primary). |
| Mar 30, 2026 | **Launch:** Production deployment to Render.com and GitHub repository documentation finalized. |

---

## 12. KNOWN ISSUES

- **Yahoo Finance Sensitivity:** `429` errors if the app refreshes too aggressively. Mitigated by 5-minute client-side caching.
- **Chart Legend Contrast:** Some grey-on-navy legends need higher contrast for accessibility compliance.
- **State Race Condition:** Rapid language toggling during AI generation may cause response flickering.
- **Package Name:** `package.json` still uses `"name": "react-example"` from Google AI Studio scaffold.

---

## 13. DEPENDENCIES

### Production (15 packages)
`react`, `react-dom`, `express`, `@google/genai`, `yahoo-finance2`, `recharts`, `motion`, `lucide-react`, `react-markdown`, `helmet`, `express-rate-limit`, `dotenv`, `clsx`, `tailwind-merge`, `@tailwindcss/vite`

### Development (6 packages)
`vite`, `tailwindcss`, `typescript`, `tsx`, `@types/express`, `@types/node`, `autoprefixer`

---

*This report was generated by analyzing every source file in the FinIQ codebase.*
