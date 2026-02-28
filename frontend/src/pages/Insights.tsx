import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Brain, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ScatterCorrelation } from '../components/charts/ScatterCorrelation';
import { TrendChart } from '../components/charts/TrendChart';
import { PageSpinner } from '../components/ui/Spinner';
import { useInsights, useRecovery } from '../hooks/useData';
import clsx from 'clsx';

interface InsightCard {
  type: 'alert' | 'good' | 'info';
  title: string;
  body: string;
  metric?: string;
}

function buildInsights(data: any, hrv30: number, hrv60: number, avgRecovery: number): InsightCard[] {
  const insights: InsightCard[] = [];
  const hrvDelta = hrv30 - hrv60;
  const pct = hrv60 > 0 ? (hrvDelta / hrv60) * 100 : 0;

  if (pct < -10) {
    insights.push({
      type: 'alert',
      title: 'Déclin de HRV',
      body: `Votre HRV moyen des 30 derniers jours (${hrv30.toFixed(1)} ms) est ${Math.abs(pct).toFixed(0)}% inférieur aux 30 jours précédents (${hrv60.toFixed(1)} ms). Signal de fatigue accumulative.`,
      metric: `Δ ${hrvDelta.toFixed(1)} ms`,
    });
  } else if (pct > 10) {
    insights.push({
      type: 'good',
      title: 'HRV en hausse 📈',
      body: `Votre HRV moyen progresse de ${pct.toFixed(0)}% par rapport aux 30 jours précédents. Votre récupération s'améliore.`,
      metric: `+${hrvDelta.toFixed(1)} ms`,
    });
  }

  if (avgRecovery < 55) {
    insights.push({
      type: 'alert',
      title: 'Score de récupération bas',
      body: `Votre moyenne de récupération sur 30 jours est de ${avgRecovery.toFixed(0)}%, sous le seuil optimal de 67%. Priorisez sommeil et gestion du stress.`,
      metric: `${avgRecovery.toFixed(0)}% moy.`,
    });
  } else if (avgRecovery >= 70) {
    insights.push({
      type: 'good',
      title: 'Récupération optimale',
      body: `Excellente récupération moyenne sur 30 jours à ${avgRecovery.toFixed(0)}%. Votre corps gère bien la charge.`,
      metric: `${avgRecovery.toFixed(0)}% moy.`,
    });
  }

  // Correlation insights
  const corrData = data?.correlationData ?? [];
  if (corrData.length > 10) {
    const withGoodSleep = corrData.filter((d: any) => d.sleepHours >= 7.5);
    const withPoorSleep = corrData.filter((d: any) => d.sleepHours > 0 && d.sleepHours < 7);
    if (withGoodSleep.length > 3 && withPoorSleep.length > 3) {
      const avgRecGoodSleep = withGoodSleep.reduce((s: number, d: any) => s + d.recovery, 0) / withGoodSleep.length;
      const avgRecPoorSleep = withPoorSleep.reduce((s: number, d: any) => s + d.recovery, 0) / withPoorSleep.length;
      const diff = avgRecGoodSleep - avgRecPoorSleep;
      if (diff > 10) {
        insights.push({
          type: 'info',
          title: 'Sommeil → Récupération',
          body: `Les nuits ≥7h30 donnent en moyenne ${diff.toFixed(0)} points de récupération de plus que les nuits <7h. La corrélation est forte dans vos données.`,
          metric: `+${diff.toFixed(0)} pts`,
        });
      }
    }
  }

  return insights;
}

const ICON = {
  alert: <AlertTriangle size={18} className="text-brand-yellow" />,
  good:  <CheckCircle   size={18} className="text-brand-green" />,
  info:  <Info          size={18} className="text-brand-blue" />,
};
const BG = {
  alert: 'border-brand-yellow/20 bg-brand-yellow/5',
  good:  'border-brand-green/20 bg-brand-green/5',
  info:  'border-brand-blue/20 bg-brand-blue/5',
};

export function Insights() {
  const { data, isLoading } = useInsights();
  const { data: recovery30d } = useRecovery('30d');
  const { data: recovery60d } = useRecovery('90d');

  if (isLoading) return <PageSpinner />;

  const { correlationData = [], hrvTrend } = data ?? {};

  // Compute averages
  const last30 = (recovery30d ?? []).slice(0, 30);
  const prev30 = (recovery60d ?? []).slice(30, 60);
  const hrv30 = last30.length ? last30.reduce((s: number, r: any) => s + (r.hrv_rmssd_milli ?? 0), 0) / last30.length : 0;
  const hrv60 = prev30.length ? prev30.reduce((s: number, r: any) => s + (r.hrv_rmssd_milli ?? 0), 0) / prev30.length : 0;
  const avgRecovery30 = last30.length ? last30.reduce((s: number, r: any) => s + (r.recovery_score ?? 0), 0) / last30.length : 0;

  const insights = buildInsights(data, hrv30, hrv60, avgRecovery30);

  const hrvTrendData = [...(recovery30d ?? [])].reverse().map((r: any) => ({
    date: r.created_at,
    value: r.hrv_rmssd_milli,
  }));

  const scatterHrvRecovery = correlationData
    .filter((d: any) => d.hrv && d.recovery)
    .map((d: any) => ({ x: d.hrv, y: d.recovery, date: format(parseISO(d.date), 'dd MMM', { locale: fr }) }));

  const scatterSleepRecovery = correlationData
    .filter((d: any) => d.sleepHours > 0 && d.recovery)
    .map((d: any) => ({ x: d.sleepHours, y: d.recovery, date: format(parseISO(d.date), 'dd MMM', { locale: fr }) }));

  const scatterStrainRecovery = correlationData
    .filter((d: any) => d.strain > 0 && d.recovery)
    .map((d: any) => ({ x: d.strain, y: d.recovery, date: format(parseISO(d.date), 'dd MMM', { locale: fr }) }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain size={24} className="text-brand-purple" /> Insights & Corrélations
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Analyse de vos 90 derniers jours de données</p>
      </div>

      {/* HRV Trend 30/60j */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-white">Tendance HRV (30 jours)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Moy. 30j : <span className="text-brand-purple font-medium">{hrv30.toFixed(1)} ms</span>
              {' · '}
              Moy. 30-60j : <span className="text-slate-300 font-medium">{hrv60.toFixed(1)} ms</span>
            </p>
          </div>
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
            hrv30 > hrv60 ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-red/15 text-brand-red',
          )}>
            {hrv30 > hrv60 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {hrv30 > hrv60 ? '+' : ''}{(hrv30 - hrv60).toFixed(1)} ms
          </div>
        </div>
        <TrendChart data={hrvTrendData} color="#a855f7" unit=" ms" height={180} average={hrv30} />
      </div>

      {/* Insight cards */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Observations clés</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins, i) => (
              <div key={i} className={clsx('rounded-2xl border p-4', BG[ins.type])}>
                <div className="flex items-start gap-3">
                  {ICON[ins.type]}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-white">{ins.title}</h4>
                      {ins.metric && <span className="text-xs font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">{ins.metric}</span>}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correlation charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <h3 className="font-semibold text-white mb-1">HRV → Récupération</h3>
          <p className="text-xs text-slate-400 mb-4">Chaque point = 1 jour</p>
          <ScatterCorrelation
            data={scatterHrvRecovery}
            xLabel="HRV" yLabel="Récupération"
            xUnit=" ms" yUnit="%"
            color="#a855f7"
            height={200}
          />
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-1">Sommeil → Récupération</h3>
          <p className="text-xs text-slate-400 mb-4">Corrélation heures de sommeil</p>
          <ScatterCorrelation
            data={scatterSleepRecovery}
            xLabel="Sommeil" yLabel="Récupération"
            xUnit="h" yUnit="%"
            color="#22c55e"
            height={200}
          />
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-1">Strain → Récupération</h3>
          <p className="text-xs text-slate-400 mb-4">Impact de la charge sur la récup.</p>
          <ScatterCorrelation
            data={scatterStrainRecovery}
            xLabel="Strain" yLabel="Récupération"
            xUnit="" yUnit="%"
            color="#eab308"
            height={200}
          />
        </div>
      </div>
    </div>
  );
}
