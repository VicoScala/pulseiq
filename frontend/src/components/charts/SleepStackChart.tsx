import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Sleep } from '../../types/whoop';

interface Props { data: Sleep[]; height?: number; }

const STAGES = [
  { key: 'rem',   label: 'REM',     color: '#a855f7' },
  { key: 'deep',  label: 'Profond', color: '#3b82f6' },
  { key: 'light', label: 'Léger',   color: '#22d3ee' },
  { key: 'awake', label: 'Éveillé', color: '#374151' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-surface-2 border border-white/10 rounded-xl px-4 py-3 shadow-2xl min-w-[150px]">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
            <span className="text-slate-300">{p.name}</span>
          </div>
          <span className="font-semibold text-white">{p.value?.toFixed(1)}h</span>
        </div>
      ))}
      <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-xs">
        <span className="text-slate-400">Total</span>
        <span className="font-bold text-white">{total.toFixed(1)}h</span>
      </div>
    </div>
  );
};

export function SleepStackChart({ data, height = 220 }: Props) {
  const chartData = [...data].reverse().map(s => ({
    date: (() => { try { return format(parseISO(s.start_time), 'dd MMM', { locale: fr }); } catch { return s.start_time; } })(),
    rem:   +(s.total_rem_sleep_time_milli / 3_600_000).toFixed(2),
    deep:  +(s.total_slow_wave_sleep_time_milli / 3_600_000).toFixed(2),
    light: +(s.total_light_sleep_time_milli / 3_600_000).toFixed(2),
    awake: +(s.total_awake_time_milli / 3_600_000).toFixed(2),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        {STAGES.map(s => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="sleep" fill={s.color} radius={s.key === 'rem' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
