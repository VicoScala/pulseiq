interface GaugeProps {
  value: number;          // 0–100
  size?: number;          // svg diameter px
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

function scoreColor(v: number): string {
  if (v >= 67) return '#22c55e';   // green
  if (v >= 34) return '#eab308';   // yellow
  return '#ef4444';                // red
}

export function Gauge({ value, size = 160, strokeWidth = 12, label, sublabel }: GaugeProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Arc from 210° to 330° (240° sweep)
  const startAngle = 210;
  const sweep = 240;
  const angle = startAngle + (value / 100) * sweep;

  function polar(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arc(from: number, to: number, radius: number) {
    const s = polar(from, radius);
    const e = polar(to, radius);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const color = scoreColor(value);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path d={arc(startAngle, startAngle + sweep, r)} fill="none" stroke="#ffffff10" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Value arc */}
        {value > 0 && (
          <path d={arc(startAngle, angle, r)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}60)` }} />
        )}
        {/* Value text */}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.24} fontWeight={700} fill={color} fontFamily="Inter">
          {Math.round(value)}
        </text>
        {sublabel && (
          <text x={cx} y={cy + size * 0.18} textAnchor="middle" fontSize={size * 0.09} fill="#94a3b8" fontFamily="Inter">
            {sublabel}
          </text>
        )}
      </svg>
      {label && <p className="text-sm font-semibold text-slate-300">{label}</p>}
    </div>
  );
}

// Mini inline gauge for tables / cards
export function MiniGauge({ value, className = '' }: { value: number; className?: string }) {
  const color = value >= 67 ? '#22c55e' : value >= 34 ? '#eab308' : '#ef4444';
  const pct = `${value}%`;
  return (
    <div className={`relative h-2 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: pct, backgroundColor: color }} />
    </div>
  );
}
