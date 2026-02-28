import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { Workout } from '../../types/whoop';

const ZONES = [
  { key: 'zone_zero_milli',  label: 'Zone 0', color: '#1e293b', desc: 'Repos' },
  { key: 'zone_one_milli',   label: 'Zone 1', color: '#3b82f6', desc: 'Récupération' },
  { key: 'zone_two_milli',   label: 'Zone 2', color: '#22c55e', desc: 'Aérobie' },
  { key: 'zone_three_milli', label: 'Zone 3', color: '#eab308', desc: 'Tempo' },
  { key: 'zone_four_milli',  label: 'Zone 4', color: '#f97316', desc: 'Seuil' },
  { key: 'zone_five_milli',  label: 'Zone 5', color: '#ef4444', desc: 'VO2 Max' },
] as const;

interface Props { workout: Workout; }

export function WorkoutZonesChart({ workout }: Props) {
  const total = ZONES.reduce((s, z) => s + (workout[z.key] ?? 0), 0);

  const data = ZONES.map(z => ({
    label: z.label,
    desc: z.desc,
    color: z.color,
    minutes: +((workout[z.key] ?? 0) / 60_000).toFixed(1),
    pct: total ? +((workout[z.key] ?? 0) / total * 100).toFixed(1) : 0,
  })).filter(d => d.minutes > 0);

  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-slate-300">{d.label} — {d.desc}</span>
            </div>
            <span className="font-semibold text-white">{d.minutes}min <span className="text-slate-500">({d.pct}%)</span></span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
