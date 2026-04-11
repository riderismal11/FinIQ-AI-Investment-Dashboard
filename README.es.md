<div align="center">
  <img src="public/favicon.svg" alt="FinIQ Logo" width="120" />
  <h1>FinIQ</h1>
  <p><strong>Plataforma de Inteligencia Financiera y Gestión de Portafolios con IA</strong></p>

  <h3>🚀 <a href="https://finiq-ai-investment-dashboard.onrender.com">Prueba la Plataforma en Vivo Aquí</a> 🚀</h3>
  <p><em>En este enlace encontrarás el proyecto completamente funcional junto con una portada (Landing Page) interactiva y cinemática que explica paso a paso por qué se creó este proyecto, cómo se construyó la arquitectura de IA y cuál es la problemática financiera que resuelve antes de entrar al Dashboard.</em></p>
  <p align="center"><strong>⚠️ Nota:</strong> Estamos usando el plan gratuito de Render. La primera carga puede tardar entre <strong>30 y 60 segundos</strong> mientras el servidor se inicia. ¡Agradecemos tu paciencia! ⏳</p>
  <p align="center">📌 <em>Para la mejor experiencia, recomendamos <a href="#-cómo-empezar">ejecutar localmente</a>. Consulta las <a href="#-limitaciones-conocidas-demo-en-vivo">Limitaciones Conocidas</a> más abajo.</em></p>


  [![React](https://img.shields.io/badge/React-19.0.0-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![Express.js](https://img.shields.io/badge/Express.js-Backend-black.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

  [Read in English (Leer en Inglés)](README.md)
</div>

---

## 📖 Descripción General

**FinIQ** es una plataforma *Full-Stack* de inteligencia financiera impulsada por Inteligencia Artificial, diseñada para democratizar la construcción de portafolios de inversión de nivel profesional. Guía a los usuarios a través de un proceso interactivo (*onboarding*) para evaluar su capital, horizonte de tiempo y tolerancia al riesgo. Usando datos de mercado en tiempo real (Alpaca + Yahoo Finance) y una IA conversacional con *Function Calling* (Ollama/Kimi o Gemini), FinIQ construye, analiza y gestiona portafolios globalmente diversificados de forma reactiva.

Construida con una estética de "Obsidiana Digital" tipo *glassmorphism*, FinIQ ofrece un panel (*dashboard*) premium e interactivo que compite con las aplicaciones Fintech empresariales.

---

## 📸 Vistas Previas del Proyecto

<div align="center">
  <h3>1. Portada (Landing Page) Cinemática</h3>
  <img src="Preview/landing.png" alt="FinIQ Landing Page" width="800" />
  <br/>
  
  <h3>2. Flujo de Onboarding con IA</h3>
  <img src="Preview/onboarding.png" alt="AI Onboarding" width="800" />
  <br/>

  <h3>3. Dashboard Inteligente</h3>
  <img src="Preview/dashboard.png" alt="FinIQ Dashboard" width="800" />
</div>

---

## ✨ Características Principales

- **🧠 Onboarding Conversacional con IA**: Un flujo guiado de 3 preguntas que construye nativamente un portafolio personalizado en base a tu capital y perfil de riesgo.
- **🤖 LLM Function Calling**: El chatbot interactivo no solo platica; aplica mutaciones directas al estado de la aplicación (ej. "Agrega un 15% de Apple a mi portafolio", "Haz mi perfil más agresivo").
- **📊 Motor Financiero en Tiempo Real**: Calcula sobre la marcha el CAGR, Rendimiento Esperado, Volatilidad, Ratio de Sharpe, y *Max Drawdown*.
- **📉 Datos Multifuente**: Tolerancia a fallos automática cambiando entre la API de Alpaca en tiempo real y el flujo global de Yahoo Finance para máxima estabilidad.
- **🛡️ Gestión Segura de Tokens**: Un backend en Express.js enmascara todas las peticiones, garantizando que las API keys y *Prompts* del sistema nunca lleguen al navegador web del usuario.
- **🌐 100% Bilingüe**: Alterna al instante entre Español e Inglés con impacto global en la UI, los gráficos y el contexto de la Inteligencia Artificial.

---

## ⚡ Limitaciones Conocidas (Demo en Vivo)

La demo en vivo está alojada en el **plan gratuito de Render**, lo cual introduce los siguientes comportamientos:

| Comportamiento | Descripción |
|---|---|
| **Arranque en Frío (Cold Start)** | Tras ~15 minutos de inactividad, el servidor entra en modo de suspensión. La primera petición activa un reinicio que tarda entre **30 y 60 segundos**. |
| **Problemas en los Gráficos** | Al abrir la app en una pestaña nueva (o tras un reinicio del servidor), los gráficos financieros pueden no renderizarse correctamente. Esto ocurre porque el frontend carga antes de que el backend esté completamente inicializado, provocando que las llamadas a las APIs de datos de mercado resulten en timeouts o datos incompletos. |
| **Pérdida de Estado de Sesión** | Los datos del portafolio se almacenan en la memoria de sesión del navegador. Cerrar la pestaña y abrir una nueva reseteará la sesión, requiriendo un nuevo flujo de onboarding. |

> **💡 Recomendación:** Para disfrutar de la experiencia completa con gráficos en tiempo real y carga instantánea, recomendamos encarecidamente **clonar el repositorio y ejecutarlo localmente**. La configuración toma menos de 2 minutos — consulta [Cómo Empezar](#-cómo-empezar) más abajo.

---

## 🚀 Cómo Empezar

> 🏠 **La instalación local es la forma recomendada de experimentar FinIQ** — carga instantánea, sin cold starts, y fidelidad total en los gráficos.

### 1. Requisitos
* Node.js v22+
* npm o pnpm
* (Opcional) Claves de API para Alpaca o Gemini si se desea evitar el tier gratuito/local.

### 2. Instalación y Configuración
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/finiq.git
cd finiq

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### 3. Configuración de Entorno
Rellena el archivo `.env` a tu preferencia. El backend auto-detectará los proveedores según las llaves disponibles.

```env
# Proveedores de IA (Usará fallback local estático si está vacío)
AI_PROVIDER=gemini # o openai-compatible
GEMINI_API_KEY=tu_gemini_key

# Datos de mercado (Usa Alpaca y si falla salta a Yahoo)
MARKET_DATA_PRIMARY=alpaca
ALPACA_API_KEY=tu_alpaca_key
ALPACA_SECRET_KEY=tu_alpaca_secret_key
```

### 4. Ejecutando el Proyecto
```bash
# Modo Desarrollo (Vite + Node/Express)
npm run dev

# Compilar para Producción
npm run build
npm run start
```

---

## 🎨 Sistema de Diseño
FinIQ presenta un sistema de diseño propio llamado **"Digital Obsidian"**.
* **Colores**: Deep Space Navy (`#0a0f1a`), Electric Teal (`#1dd4b4`), Muted Gold (`#c9a84c`).
* **Librerías**: *Framer Motion* para animaciones vinculadas al scroll y *Recharts* para visualizaciones en formato SVG paramétrico.
* **Tipografías**: Inter (para la interfaz) y JetBrains Mono (para datos numéricos).

---

## 🛡️ Capa de Seguridad (Backend)
1. **Abstracción de Llaves:** Las *API keys* viven puramente en el servidor de Node.js.
2. **Defensa contra Prompt Injection:** 11 expresiones regulares que interceptan comandos maliciosos tipo *Jailbreak*.
3. **Validación Estricta:** Limpieza y sanitización personalizada para *tickers*, fechas, sumas matemáticas globales y tamaño de historial.
4. **Rate Limiting:** Reglas estrictas de HTTP Headers con *Helmet* y throttling (limitación) especializado para proteger las llamadas a las APIs.

---
> *Desarrollado como proyecto cumbre para demostración avanzada en portafolio profesional.*
