FinIQ Deployment Guide (secure, production-ready)

Overview
- FinIQ uses a modular AI provider system. You can run with OpenCode (opencode) or OpenAI-compatible, Gemini, or local fallback. This guide covers a secure production deployment with OpenCode as the primary provider.

Prerequisites
- Node.js 18+ and npm
- Access to credentials store for AI_OPENCODE_API_KEY and related keys (do not commit to repo)
- Environment variables configured in your deployment environment (e.g., Docker, systemd, or cloud console)

Environment variables (examples)
- AI_PROVIDER=opencode
- AI_OPENCODE_API_KEY=xxxxxx
- AI_OPENCODE_BASE_URL=https://api.opencode.ai/v1
- AI_OPENCODE_MODEL=opencode-default-model
- AI_BASE_URL=https://api.openai.com/v1
- AI_MODEL=gpt-4o-mini
- MARKET_DATA_PRIMARY=alpaca
- ALPACA_API_KEY=xxxx
- ALPACA_SECRET_KEY=xxxx
- ALPACA_STOCK_FEED=iex
- ALPACA_CRYPTO_FEED=us
- NODE_ENV=production
- PORT=3000
- DISABLE_HMR=true

Deployment steps (high level)

Post-Deployment
- Validate that the UI loads and IA responses are generated (OpenCode) without errors.
- Confirm that no secrets are logged and that requests to IA are rate-limited per configuration.
- Periodically audit dependencies (npm audit) and keep up with security advisories.
