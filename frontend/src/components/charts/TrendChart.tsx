import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DataPoint {
  date: string;
  value: number | null;
  value2?: number | null;
}

interface TrendChartProps {
  data: DataPoint[];
  color?: string;
  color2?: string;
  label?: string;
  label2?: string;
  unit?: string;
  average?: number;
  height?: number;
  domain?: [number, number];
  dateFormat?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-sm font-semibold text-white">
            {p.value != null ? Number(p.value).toFixed(1) : '—'} {unit}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({
  data, color = '#22c55e', color2, label, label2,
  unit = '', average, height = 200, domain, dateFormat = 'dd MMM',
}: TrendChartProps) {
  const id1 = `grad-${color.replace('#', '')}`;
  const id2 = color2 ? `grad-${color2.replace('#', '')}` : '';

  const formatted = data.map(d => ({
    ...d,
    dateLabel: (() => {
      try { return format(parseISO(d.date), dateFormat, { locale: fr }); }
      catch { return d.date; }
    })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={id1} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {color2 && (
            <linearGradient id={id2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color2} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color2} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={domain} />
        <Tooltip content={<CustomTooltip unit={unit} />} />

        {average && (
          <ReferenceLine y={average} stroke={color} strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: `moy ${average.toFixed(0)}`, fill: color, fontSize: 10, position: 'insideTopRight' }} />
        )}

        <Area type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2}
          fill={`url(#${id1})`} dot={false} activeDot={{ r: 4, fill: color }} connectNulls />

        {color2 && (
          <Area type="monotone" dataKey="value2" name={label2} stroke={color2} strokeWidth={2}
            fill={`url(#${id2})`} dot={false} activeDot={{ r: 4, fill: color2 }} connectNulls />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
