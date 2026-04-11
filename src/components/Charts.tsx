import React, { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Language, Portfolio } from '../types';
import { compactLabel, formatCurrency } from '../utils/format';

interface ChartsProps {
  portfolio: Portfolio;
  language: Language;
}

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

interface PieTooltipProps {
  payload?: {
    amount: number;
    fullName: string;
  };
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export const Charts: React.FC<ChartsProps> = ({ portfolio, language }) => {
  const pieData = useMemo(
    () => portfolio.assets.map((asset) => ({
      name: asset.symbol,
      fullName: asset.name,
      value: asset.allocation,
      amount: asset.amount || 0,
    })),
    [portfolio.assets],
  );

  const renderCustomLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: PieLabelProps) => {
    if (percent < 0.08) return null;
    const radian = Math.PI / 180;
    const radius = innerRadius + ((outerRadius - innerRadius) * 0.5);
    const x = cx + radius * Math.cos(-midAngle * radian);
    const y = cy + radius * Math.sin(-midAngle * radian);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={900}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="card h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <PieIcon size={14} className="text-primary" />
          {language === 'en' ? 'Asset Allocation' : 'Distribucion de Activos'}
        </h3>
        <div className="text-[9px] font-black text-primary bg-[#131b2f] border border-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
          {portfolio.assets.length} {language === 'en' ? 'Assets' : 'Activos'}
        </div>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="45%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              labelLine={false}
              label={renderCustomLabel}
              animationDuration={1500}
              animationBegin={200}
            >
              {pieData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
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
              itemStyle={{ color: '#f8fafc' }}
              formatter={(value: number, _name: string, props: PieTooltipProps) => [
                `${(value * 100).toFixed(1)}% - ${formatCurrency(props.payload?.amount ?? 0, { compact: true, maxFractionDigits: 1 })}`,
                props.payload?.fullName ?? '',
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={52}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '9px', paddingTop: '12px', fontWeight: '800', letterSpacing: '0.04em', color: '#E2E8F0', lineHeight: '14px' }}
              formatter={(value: string) => compactLabel(value, 10)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
