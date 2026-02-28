import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Heart, Brain, Wind, Thermometer, Clock, Zap, TrendingUp } from 'lucide-react';
import { Gauge, MiniGauge } from '../components/ui/Gauge';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge, recoveryColor, recoveryLabel } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { TrendChart } from '../components/charts/TrendChart';
import { useDashboard, useRecovery } from '../hooks/useData';
import type { Recovery, Sleep } from '../types/whoop';

function msToHours(ms: number | null | undefined): string {
  if (!ms) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function SleepBreakdown({ sleep }: { sleep: Sleep }) {
  const stages = [
    { label: 'REM',     ms: sleep.total_rem_sleep_time_milli,       color: 'bg-brand-purple' },
    { label: 'Profond', ms: sleep.total_slow_wave_sleep_time_milli,  color: 'bg-brand-blue' },
    { label: 'Léger',   ms: sleep.total_light_sleep_time_milli,      color: 'bg-teal-400' },
    { label: 'Éveillé', ms: sleep.total_awake_time_milli,            color: 'bg-slate-600' },
  ];
  const total = sleep.total_in_bed_time_milli || 1;

  return (
    <div className="space-y-3 mt-3">
      {/* Progress bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
        {stages.map(s => (
          <div key={s.label} className={`${s.color} h-full transition-all`}
            style={{ width: `${(s.ms / total) * 100}%` }} />
        ))}
      </div>
      {/* Labels */}
      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
        {stages.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${s.color}`} />
            <span className="text-slate-400">{s.label}</span>
            <span className="text-white font-medium ml-auto">{msToHours(s.ms)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { data: recovery30d } = useRecovery('30d');

  if (isLoading) return <PageSpinner />;

  const { today, trends, recentWorkouts } = data ?? {};
  const rec = today?.recovery as Recovery | null;
  const sleep = today?.sleep as Sleep | null;

  const chartData = (recovery30d ?? []).slice().reverse().map((r: Recovery) => ({
    date: r.created_at,
    value: r.recovery_score,
    value2: r.hrv_rmssd_milli,
  }));

  const today_label = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white capitalize">{today_label}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Vue d'ensemble de vos métriques de performance</p>
        </div>
        {rec && (
          <Badge color={recoveryColor(rec.recovery_score)}>
            {recoveryLabel(rec.recovery_score)}
          </Badge>
        )}
      </div>

      {/* Top row: Recovery Gauge + Sleep */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recovery gauge */}
        <div className="card flex flex-col items-center justify-center py-4">
          <p className="metric-label mb-3">Récupération du jour</p>
          {rec ? (
            <Gauge value={rec.recovery_score} size={180} sublabel="/ 100" />
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">Données non disponibles</div>
          )}
          {rec && (
            <div className="mt-4 grid grid-cols-2 gap-3 w-full">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-xs text-slate-500">HRV</p>
                <p className="text-lg font-bold text-white">{rec.hrv_rmssd_milli?.toFixed(1)}</p>
                <p className="text-xs text-slate-500">ms RMSSD</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-xs text-slate-500">FC Repos</p>
                <p className="text-lg font-bold text-white">{Math.round(rec.resting_heart_rate ?? 0)}</p>
                <p className="text-xs text-slate-500">bpm</p>
              </div>
            </div>
          )}
        </div>

        {/* Sleep */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="metric-label">Sommeil</p>
              {sleep && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {format(parseISO(sleep.start_time), 'HH:mm')} → {format(parseISO(sleep.end_time), 'HH:mm')}
                </p>
              )}
            </div>
            {sleep && (
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{msToHours(sleep.total_in_bed_time_milli)}</p>
                <p className="text-xs text-slate-400">au lit</p>
              </div>
            )}
          </div>

          {sleep ? (
            <>
              <SleepBreakdown sleep={sleep} />
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-xl font-bold text-brand-purple">{sleep.sleep_performance_percentage?.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Performance</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-xl font-bold text-brand-blue">{sleep.sleep_efficiency_percentage?.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Efficacité</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-xl font-bold text-brand-teal">{sleep.sleep_consistency_percentage?.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Cohérence</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm text-center py-10">Données de sommeil non disponibles</div>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Moy. Récupération 30j"
          value={trends?.avgRecovery?.toFixed(0) ?? null}
          unit="%"
          icon={Activity}
          iconColor="text-brand-green"
        />
        <MetricCard
          label="Moy. HRV 30j"
          value={trends?.avgHrv?.toFixed(1) ?? null}
          unit="ms"
          icon={Brain}
          iconColor="text-brand-purple"
        />
        <MetricCard
          label="FC Repos moy. 30j"
          value={trends?.avgRhr?.toFixed(0) ?? null}
          unit="bpm"
          icon={Heart}
          iconColor="text-brand-red"
        />
        <MetricCard
          label="Strain moy. 7j"
          value={trends?.avgStrain7d?.toFixed(1) ?? null}
          icon={Zap}
          iconColor="text-brand-yellow"
        />
      </div>

      {/* Recovery + HRV chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-white">Récupération & HRV — 30 jours</h3>
            <p className="text-xs text-slate-400 mt-0.5">Score de récupération (vert) et HRV RMSSD en ms (violet)</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-brand-green" /> Récupération</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-brand-purple" /> HRV</div>
          </div>
        </div>
        <TrendChart
          data={chartData}
          color="#22c55e"
          color2="#a855f7"
          label="Récupération"
          label2="HRV"
          unit=""
          height={200}
        />
      </div>

      {/* Recent workouts */}
      {recentWorkouts?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Workouts récents</h3>
          <div className="space-y-3">
            {recentWorkouts.slice(0, 5).map((w: any) => (
              <div key={w.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-brand-blue/20 border border-brand-blue/20 flex items-center justify-center">
                  <Zap size={16} className="text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white capitalize">{w.sport_name?.replace(/-/g, ' ')}</p>
                  <p className="text-xs text-slate-400">
                    {format(parseISO(w.start_time), 'dd MMM yyyy · HH:mm', { locale: fr })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-yellow">{w.strain?.toFixed(1)}</p>
                  <p className="text-xs text-slate-500">strain</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{w.average_heart_rate} bpm</p>
                  <p className="text-xs text-slate-500">FC moy.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
