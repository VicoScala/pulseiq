import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Moon, Clock, Wind, BarChart2 } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import { SleepStackChart } from '../components/charts/SleepStackChart';
import { TrendChart } from '../components/charts/TrendChart';
import { MiniGauge } from '../components/ui/Gauge';
import { PageSpinner } from '../components/ui/Spinner';
import { useSleep } from '../hooks/useData';
import type { Period, Sleep } from '../types/whoop';

function ms(v: number | null) {
  if (!v) return '—';
  const h = Math.floor(v / 3_600_000);
  const m = Math.round((v % 3_600_000) / 60_000);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function SleepPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const { data: sleeps = [], isLoading } = useSleep(period);

  if (isLoading) return <PageSpinner />;

  const mainSleeps: Sleep[] = sleeps.filter((s: Sleep) => !s.nap);

  // Averages
  const avg = (fn: (s: Sleep) => number) => {
    const vals = mainSleeps.map(fn).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const avgDuration    = avg(s => (s.total_in_bed_time_milli - s.total_awake_time_milli));
  const avgPerformance = avg(s => s.sleep_performance_percentage);
  const avgEfficiency  = avg(s => s.sleep_efficiency_percentage);
  const avgRespRate    = avg(s => s.respiratory_rate);
  const avgDeepPct     = avg(s => s.total_slow_wave_sleep_time_milli / (s.total_in_bed_time_milli || 1) * 100);
  const avgRemPct      = avg(s => s.total_rem_sleep_time_milli / (s.total_in_bed_time_milli || 1) * 100);

  const trendData = [...mainSleeps].reverse().map(s => ({
    date: s.start_time,
    value: s.sleep_performance_percentage,
    value2: (s.total_in_bed_time_milli - s.total_awake_time_milli) / 3_600_000,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analyse du Sommeil</h1>
          <p className="text-slate-400 text-sm mt-0.5">{mainSleeps.length} nuits analysées</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Durée moy." value={ms(avgDuration)} icon={Clock} iconColor="text-brand-purple" />
        <MetricCard label="Performance moy." value={avgPerformance.toFixed(0)} unit="%" icon={BarChart2} iconColor="text-brand-green" />
        <MetricCard label="Efficacité moy." value={avgEfficiency.toFixed(0)} unit="%" icon={Moon} iconColor="text-brand-blue" />
        <MetricCard label="Fréq. respiratoire" value={avgRespRate.toFixed(1)} unit="/min" icon={Wind} iconColor="text-brand-teal" />
      </div>

      {/* Sleep stages bar chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-white">Phases de sommeil</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Profond moy. {avgDeepPct.toFixed(0)}% · REM moy. {avgRemPct.toFixed(0)}%
            </p>
          </div>
        </div>
        <SleepStackChart data={mainSleeps.slice(0, 30)} height={240} />
      </div>

      {/* Performance trend */}
      <div className="card">
        <h3 className="font-semibold text-white mb-1">Tendances</h3>
        <p className="text-xs text-slate-400 mb-5">Score de performance (vert) · Heures de sommeil (bleu)</p>
        <TrendChart
          data={trendData}
          color="#22c55e"
          color2="#3b82f6"
          label="Performance %"
          label2="Durée (h)"
          height={200}
          average={avgPerformance}
        />
      </div>

      {/* Sleep log */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Journal du sommeil</h3>
        <div className="space-y-2">
          {mainSleeps.slice(0, 20).map((s: Sleep) => {
            const duration = ms(s.total_in_bed_time_milli - s.total_awake_time_milli);
            const perfScore = s.sleep_performance_percentage ?? 0;
            return (
              <div key={s.id} className="grid grid-cols-12 items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <div className="col-span-3">
                  <p className="text-sm font-medium text-white capitalize">
                    {format(parseISO(s.start_time), 'EEE dd MMM', { locale: fr })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(parseISO(s.start_time), 'HH:mm')} → {format(parseISO(s.end_time), 'HH:mm')}
                  </p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-sm font-bold text-white">{duration}</p>
                  <p className="text-xs text-slate-500">durée</p>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    <MiniGauge value={perfScore} className="flex-1" />
                    <span className="text-xs font-medium text-white w-8 text-right">{perfScore.toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">performance</p>
                </div>
                <div className="col-span-1 text-center">
                  <p className="text-xs font-medium text-brand-blue">{ms(s.total_slow_wave_sleep_time_milli)}</p>
                  <p className="text-xs text-slate-600">deep</p>
                </div>
                <div className="col-span-1 text-center">
                  <p className="text-xs font-medium text-brand-purple">{ms(s.total_rem_sleep_time_milli)}</p>
                  <p className="text-xs text-slate-600">REM</p>
                </div>
                <div className="col-span-1 text-center">
                  <p className="text-xs font-medium text-slate-300">{s.respiratory_rate?.toFixed(1)}</p>
                  <p className="text-xs text-slate-600">resp.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
