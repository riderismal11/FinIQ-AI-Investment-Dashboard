# Análisis de Rendimiento - FinIQ

## Problemas Identificados

### 1. COLD STARTS EN RENDER FREE TIER (Crítico)
**Problema:** El servidor está en Render Free Tier (`plan: free`), que duerme el servicio después de 15 minutos de inactividad.
- **Impacto:** 30-60 segundos de espera cuando el servidor está "dormido"
- **Solución:** Implementar keep-alive gratuito con ping cada 10 minutos

### 2. FALTA DE CACHÉ EN BACKEND (Crítico)
**Problema:** Cada solicitud a `/api/finance/quote/:symbol` o `/api/finance/history/:symbol` hace llamadas directas a Yahoo/Alpaca sin caché.
- **Impacto:** Llamadas redundantes a APIs externas, latencia alta
- **Solución:** Implementar caché en memoria TTL de 5 minutos en el backend

### 3. MÚLTIPLES LLAMADAS PARALELOS DESDE FRONTEND (Alto)
**Problema:** App.tsx hace múltiples llamadas simultáneas:
- `calculatePortfolioMetricsFromYahoo` (para métricas)
- `getAssetYtdReturnPercent` para cada símbolo único
- `HistoricalChart` hace sus propias llamadas a datos históricos
- `HistoricalComparator` también hace llamadas
- **Impacto:** 15-20 solicitudes paralelas al cargar el dashboard
- **Solución:** Consolidar en una sola API que devuelva todo

### 4. SIN COMPRESIÓN DE RESPUESTAS (Medio)
**Problema:** El servidor Express no tiene compresión gzip/brotli configurada.
- **Impacto:** Transferencia de datos 3-5x mayor de lo necesario
- **Solución:** Agregar middleware `compression`

### 5. CARGA INMEDIATA DE TODOS LOS COMPONENTES (Medio)
**Problema:** Todos los componentes del dashboard se renderizan inmediatamente, incluso los pesados (gráficos, comparadores).
- **Impacto:** Tiempo de carga inicial alto, JS bundle grande
- **Solución:** Lazy loading con React.lazy() y Suspense

### 6. FALTA DE SERVICE WORKER (Medio)
**Problema:** No hay caché offline ni estrategia stale-while-revalidate.
- **Impacto:** Cada visita recarga todo desde cero
- **Solución:** Implementar service worker para cachear datos de mercado

### 7. RENDERIZADO SINCRÓNICO DE GRÁFICOS (Bajo)
**Problema:** Los gráficos recharts renderizan inmediatamente bloqueando el hilo principal.
- **Impacto:** UI congelada mientras se renderizan gráficos complejos
- **Solución:** Usar `startTransition` de React 19

---

## Plan de Implementación (Sin Costos Adicionales)

### Fase 1: Backend Caché + Compresión (Impacto Alto)
1. Agregar caché en memoria para datos de mercado (5 min TTL)
2. Agregar compresión gzip a Express
3. Crear endpoint consolidado `/api/portfolio/data` que devuelva todo en una llamada

### Fase 2: Keep-Alive Gratuito (Impacto Alto)
1. Configurar UptimeRobot o Cron-Job.org para ping cada 10 min

### Fase 3: Frontend Optimizaciones (Impacto Medio)
1. Implementar lazy loading de componentes pesados
2. Agregar service worker básico
3. Usar startTransition para carga de gráficos

### Fase 4: Data Fetching Optimizado (Impacto Medio)
1. Consolidar múltiples llamadas en una sola
2. Implementar prefetching inteligente

---

## Métricas Esperadas

| Métrica | Antes | Después |
|---------|-------|---------|
| Cold Start | 30-60s | 0s (con keep-alive) |
| Carga inicial dashboard | 8-12s | 2-4s |
| Transferencia datos | ~500KB | ~150KB (con gzip) |
| Llamadas API por carga | 15-20 | 3-4 |
| Tiempo hasta interactividad | 6-8s | 1-2s |

---

## Checklist de Implementación

- [ ] Caché en memoria para datos de mercado (backend)
- [ ] Compresión gzip en Express
- [ ] Endpoint consolidado de datos
- [ ] Configurar keep-alive gratuito
- [ ] Lazy loading de componentes pesados
- [ ] Service worker para caché offline
- [ ] startTransition para gráficos
- [ ] Consolidar llamadas API frontend
