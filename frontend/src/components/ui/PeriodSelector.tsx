import type { Period } from '../../types/whoop';

const OPTIONS: { label: string; value: Period }[] = [
  { label: '7J', value: '7d' },
  { label: '30J', value: '30d' },
  { label: '90J', value: '90d' },
  { label: '1An', value: '1y' },
];

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={value === opt.value ? 'period-btn-active' : 'period-btn'}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
