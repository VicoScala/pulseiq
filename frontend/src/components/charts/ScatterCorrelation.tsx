import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Point { x: number; y: number; date?: string; }

interface Props {
  data: Point[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  color?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, xLabel, yLabel, xUnit, yUnit }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-surface-2 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      {d?.date && <p className="text-xs text-slate-400 mb-1">{d.date}</p>}
      <p className="text-sm text-white">{xLabel}: <strong>{d?.x?.toFixed(1)}{xUnit}</strong></p>
      <p className="text-sm text-white">{yLabel}: <strong>{d?.y?.toFixed(1)}{yUnit}</strong></p>
    </div>
  );
};

export function ScatterCorrelation({ data, xLabel, yLabel, xUnit = '', yUnit = '', color = '#22c55e', height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis dataKey="x" name={xLabel} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit={xUnit} />
        <YAxis dataKey="y" name={yLabel} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit={yUnit} />
        <Tooltip content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} xUnit={xUnit} yUnit={yUnit} />} />
        <Scatter data={data} fill={color} fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
