import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number | null;   // positive = improving
  trendLabel?: string;
  sublabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function MetricCard({
  label, value, unit, icon: Icon, iconColor = 'text-slate-400',
  trend, trendLabel, sublabel, className, children,
}: MetricCardProps) {
  const hasTrend = trend !== undefined && trend !== null;
  const trendPositive = (trend ?? 0) > 0;
  const trendFlat = Math.abs(trend ?? 0) < 0.5;

  return (
    <div className={clsx('card animate-fade-in', className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="metric-label">{label}</span>
        {Icon && (
          <div className={clsx('p-2 rounded-xl bg-white/5', iconColor)}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="metric-value">
          {value ?? <span className="text-slate-500">—</span>}
        </span>
        {unit && <span className="metric-unit mb-1">{unit}</span>}
      </div>

      {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}

      {hasTrend && (
        <div className={clsx(
          'flex items-center gap-1 mt-3 text-xs font-medium',
          trendFlat ? 'text-slate-400' : trendPositive ? 'text-brand-green' : 'text-brand-red',
        )}>
          {trendFlat ? <Minus size={12} /> : trendPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{trendLabel ?? `${trendPositive ? '+' : ''}${trend?.toFixed(1)}`}</span>
        </div>
      )}

      {children}
    </div>
  );
}
