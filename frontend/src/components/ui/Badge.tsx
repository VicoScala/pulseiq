import clsx from 'clsx';

type Color = 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray';

const colors: Record<Color, string> = {
  green:  'bg-brand-green/15 text-brand-green border-brand-green/20',
  yellow: 'bg-brand-yellow/15 text-brand-yellow border-brand-yellow/20',
  red:    'bg-brand-red/15 text-brand-red border-brand-red/20',
  blue:   'bg-brand-blue/15 text-brand-blue border-brand-blue/20',
  purple: 'bg-brand-purple/15 text-brand-purple border-brand-purple/20',
  gray:   'bg-white/10 text-slate-300 border-white/10',
};

export function Badge({ color, children }: { color: Color; children: React.ReactNode }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', colors[color])}>
      {children}
    </span>
  );
}

export function recoveryColor(score: number | null): Color {
  if (!score) return 'gray';
  if (score >= 67) return 'green';
  if (score >= 34) return 'yellow';
  return 'red';
}

export function recoveryLabel(score: number | null): string {
  if (!score) return '—';
  if (score >= 67) return 'Optimal';
  if (score >= 34) return 'Modéré';
  return 'Bas';
}
