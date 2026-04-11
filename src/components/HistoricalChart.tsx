import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Language, Portfolio } from '../types';
import { getEarliestCommonDate, getPortfolioHistoricalSeriesFromYahoo } from '../services/financeService';
import { formatCurrency, formatPercent } from '../utils/format';
import { cn } from '../utils/cn';

type TimeRange = '6M' | '1Y' | '3Y' | '5Y' | 'ALL';
type ChartPoint = { date: string; value: number; sp500: number };

interface HistoricalChartProps {
  portfolio: Portfolio;
  language: Language;
}

function downsamplePoints(points: ChartPoint[], maxPoints = 120): ChartPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
}

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ portfolio, language }) => {
  const locale = language === 'en' ? 'en-US' : 'es-ES';
  const allocKey = useMemo(() => {
    const allocations = portfolio.assets
      .slice()
      .sort((left, right) => left.symbol.localeCompare(right.symbol))
      .map((asset) => `${asset.symbol}:${asset.allocation.toFixed(6)}`)
      .join('|');
    return `${portfolio.isCustom ? 'custom' : portfolio.riskProfile}:${allocations}`;
  }, [portfolio.assets, portfolio.isCustom, portfolio.riskProfile]);

  const rawPointsRef = useRef<ChartPoint[]>([]);
  const requestIdRef = useRef(0);
  const [displayData, setDisplayData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const end = new Date();
        const start = new Date();

        if (timeRange === '6M') start.setMonth(start.getMonth() - 6);
        else if (timeRange === '1Y') start.setFullYear(start.getFullYear() - 1);
        else if (timeRange === '3Y') start.setFullYear(start.getFullYear() - 3);
        else if (timeRange === '5Y') start.setFullYear(start.getFullYear() - 5);
        else {
          const probeStart = new Date();
          probeStart.setFullYear(probeStart.getFullYear() - 14);
          const commonDate = await getEarliestCommonDate(portfolio, probeStart.toISOString().slice(0, 10), controller.signal);
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;
          start.setTime(new Date(`${commonDate}T00:00:00Z`).getTime());
        }

        const result = await getPortfolioHistoricalSeriesFromYahoo(portfolio, {
          period1: start.toISOString().slice(0, 10),
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        rawPointsRef.current = (result.points ?? []).filter(
          (p) => Number.isFinite(p.value) && p.value > 0 && Number.isFinite(p.sp500) && p.sp500 > 0
        );
        setDisplayData(downsamplePoints(rawPointsRef.current));
      } catch (fetchError) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load historical series');
        rawPointsRef.current = [];
        setDisplayData([]);
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [allocKey, portfolio.totalAmount, timeRange]);

  const currentValue = displayData[displayData.length - 1]?.value ?? 0;
  const startValue = displayData[0]?.value ?? 0;
  const totalReturn = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;
  const isPositive = currentValue >= startValue;

  return (
    <div className="card h-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <TrendingUp size={14} className="text-success" />
            {language === 'en' ? 'Performance History' : 'Historial de Rendimiento'}
          </h3>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
              {language === 'en' ? 'vs S&P 500' : 'vs S&P 500'}
            </p>
            <span className={cn('text-[11px] font-black', isPositive ? 'text-success' : 'text-error')}>
              {formatPercent(totalReturn, 1, true)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#131b2f] border border-border p-1 rounded-xl">
          {(['6M', '1Y', '3Y', '5Y', 'ALL'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none',
                timeRange === range ? 'bg-[#1e293b] text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-full px-6">
              <div className="h-4 bg-[#1e293b] rounded animate-pulse w-3/4 mb-4" />
              <div className="h-4 bg-[#1e293b] rounded animate-pulse w-1/2 mb-4" />
              <div className="h-64 bg-[#131b2f] rounded animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
            <div className="text-error font-bold">{language === 'en' ? 'Failed to load chart' : 'No se pudo cargar el grafico'}</div>
            <div className="text-[10px] text-text-muted max-w-sm">{error}</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSP500" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: '900' }}
                interval="preserveStartEnd"
                minTickGap={28}
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  if (timeRange === 'ALL') {
                    return date.toLocaleDateString(locale, { year: 'numeric' });
                  }
                  return date.toLocaleDateString(locale, { month: 'short' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#E2E8F0', fontSize: 10, fontWeight: '900' }}
                tickFormatter={(value) => formatCurrency(value, { compact: true, maxFractionDigits: 1 })}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c1220',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  fontSize: '11px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  fontWeight: 'bold',
                  padding: '12px 16px',
                  color: '#f8fafc',
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value, { compact: value >= 100000, maxFractionDigits: value >= 100000 ? 1 : 0 }),
                  name === 'value' ? (language === 'en' ? 'Your Portfolio' : 'Tu Portafolio') : 'S&P 500',
                ]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                iconType="line"
                iconSize={12}
                wrapperStyle={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8' }}
                formatter={(value: string) => (value === 'value' ? (language === 'en' ? 'Portfolio' : 'Portafolio') : 'S&P 500')}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4F46E5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPortfolio)"
                animationDuration={2000}
                dot={false}
                connectNulls={true}
                activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 3 }}
              />
              <Area
                type="monotone"
                dataKey="sp500"
                stroke="#334155"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorSP500)"
                animationDuration={2000}
                dot={false}
                connectNulls={true}
                activeDot={{ r: 4, fill: '#334155', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HistoricalChart;
