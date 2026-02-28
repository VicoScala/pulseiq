import { useState } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Zap, Clock, Flame, Heart, MapPin, Mountain } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import { WorkoutZonesChart } from '../components/charts/WorkoutZonesChart';
import { TrendChart } from '../components/charts/TrendChart';
import { PageSpinner } from '../components/ui/Spinner';
import { useWorkouts } from '../hooks/useData';
import type { Period, Workout } from '../types/whoop';

// ── Sport metadata: emoji + French label ──────────────────────────────────
// Keyed by WHOOP API sport_name (lowercase)
const SPORT_INFO: Record<string, { emoji: string; label: string }> = {
  'running':              { emoji: '🏃', label: 'Course' },
  'cycling':              { emoji: '🚴', label: 'Vélo' },
  'swimming':             { emoji: '🏊', label: 'Natation' },
  'weightlifting':        { emoji: '🏋️', label: 'Musculation' },
  'powerlifting':         { emoji: '🏋️', label: 'Force' },
  'functional fitness':   { emoji: '💪', label: 'Fitness Fonctionnel' },
  'hiit':                 { emoji: '⚡', label: 'HIIT' },
  'hiking/rucking':       { emoji: '🥾', label: 'Randonnée' },
  'walking':              { emoji: '🚶', label: 'Marche' },
  'soccer':               { emoji: '⚽', label: 'Football' },
  'basketball':           { emoji: '🏀', label: 'Basketball' },
  'tennis':               { emoji: '🎾', label: 'Tennis' },
  'yoga':                 { emoji: '🧘', label: 'Yoga' },
  'pilates':              { emoji: '🤸', label: 'Pilates' },
  'boxing':               { emoji: '🥊', label: 'Boxe' },
  'kickboxing':           { emoji: '🥊', label: 'Kickboxing' },
  'jiu jitsu':            { emoji: '🥋', label: 'Jiu-Jitsu' },
  'martial arts':         { emoji: '🥋', label: 'Arts Martiaux' },
  'rowing':               { emoji: '🚣', label: 'Aviron' },
  'golf':                 { emoji: '⛳', label: 'Golf' },
  'skiing':               { emoji: '⛷️', label: 'Ski' },
  'snowboarding':         { emoji: '🏂', label: 'Snowboard' },
  'rock climbing':        { emoji: '🧗', label: 'Escalade' },
  'climber':              { emoji: '🧗', label: 'Escalade' },
  'mountain biking':      { emoji: '🚵', label: 'VTT' },
  'kayaking':             { emoji: '🛶', label: 'Kayak' },
  'surfing':              { emoji: '🏄', label: 'Surf' },
  'volleyball':           { emoji: '🏐', label: 'Volleyball' },
  'baseball':             { emoji: '⚾', label: 'Baseball' },
  'football':             { emoji: '🏈', label: 'Foot Américain' },
  'rugby':                { emoji: '🏉', label: 'Rugby' },
  'ice hockey':           { emoji: '🏒', label: 'Hockey' },
  'dance':                { emoji: '💃', label: 'Danse' },
  'spin':                 { emoji: '🚴', label: 'Spinning' },
  'elliptical':           { emoji: '🏃', label: 'Elliptique' },
  'stairmaster':          { emoji: '🪜', label: 'Escaliers' },
  'jumping rope':         { emoji: '🪢', label: 'Corde à Sauter' },
  'assault bike':         { emoji: '🚴', label: 'Assault Bike' },
  'stretching':           { emoji: '🤸', label: 'Étirements' },
  'meditation':           { emoji: '🧘', label: 'Méditation' },
  'cross country skiing': { emoji: '⛷️', label: 'Ski de Fond' },
  'triathlon':            { emoji: '🏊', label: 'Triathlon' },
  'pickleball':           { emoji: '🏓', label: 'Pickleball' },
  'other':                { emoji: '🏅', label: 'Autre' },
  'activity':             { emoji: '⚡', label: 'Activité' },
};

function getSportInfo(sportName?: string | null) {
  if (!sportName) return { emoji: '🏅', label: 'Activité' };
  return SPORT_INFO[sportName.toLowerCase()] ?? { emoji: '🏅', label: sportName };
}

// Sports for which distance is meaningful
const DISTANCE_SPORTS = new Set([
  'running', 'cycling', 'walking', 'hiking/rucking', 'mountain biking',
  'swimming', 'cross country skiing', 'triathlon', 'duathlon', 'rowing',
]);

// Sports for which altitude gain is meaningful
const ALTITUDE_SPORTS = new Set([
  'hiking/rucking', 'skiing', 'snowboarding', 'rock climbing', 'climber',
  'mountain biking', 'cross country skiing',
]);

// ── Page ──────────────────────────────────────────────────────────────────

export function WorkoutsPage() {
  const [period, setPeriod] = useState<Period>('90d');
  const [selected, setSelected] = useState<Workout | null>(null);
  const { data: workouts = [], isLoading } = useWorkouts(period);

  if (isLoading) return <PageSpinner />;

  const avg = (fn: (w: Workout) => number) => {
    const vals = (workouts as Workout[]).map(fn).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const avgStrain   = avg(w => w.strain);
  const avgHr       = avg(w => w.average_heart_rate);
  const avgDuration = avg(w => differenceInMinutes(parseISO(w.end_time), parseISO(w.start_time)));
  const totalKcal   = (workouts as Workout[]).reduce((s, w) => s + (w.kilojoule ?? 0) / 4.184, 0);

  const strainTrend = [...workouts as Workout[]].reverse().map(w => ({
    date: w.start_time,
    value: w.strain,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Entraînements</h1>
          <p className="text-slate-400 text-sm mt-0.5">{workouts.length} séances sur la période</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Strain moyen" value={avgStrain.toFixed(1)} icon={Zap} iconColor="text-brand-yellow" />
        <MetricCard label="FC moy." value={Math.round(avgHr)} unit="bpm" icon={Heart} iconColor="text-brand-red" />
        <MetricCard label="Durée moy." value={Math.round(avgDuration)} unit="min" icon={Clock} iconColor="text-brand-blue" />
        <MetricCard label="Calories totales" value={Math.round(totalKcal / 1000).toFixed(1)} unit="Mcal" icon={Flame} iconColor="text-brand-purple" />
      </div>

      {/* Strain trend */}
      <div className="card">
        <h3 className="font-semibold text-white mb-1">Évolution du Strain</h3>
        <p className="text-xs text-slate-400 mb-5">Charge d'entraînement par séance</p>
        <TrendChart data={strainTrend} color="#eab308" unit="" height={180} average={avgStrain} />
      </div>

      {/* Two-column: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Workout list */}
        <div className="lg:col-span-3 card">
          <h3 className="font-semibold text-white mb-4">Liste des séances</h3>
          <div className="space-y-1.5">
            {(workouts as Workout[]).map(w => {
              const dur = differenceInMinutes(parseISO(w.end_time), parseISO(w.start_time));
              const { emoji, label } = getSportInfo(w.sport_name);
              const isSelected = selected?.id === w.id;
              const distKm = w.distance_meter && DISTANCE_SPORTS.has(w.sport_name?.toLowerCase())
                ? (w.distance_meter / 1000).toFixed(1)
                : null;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelected(isSelected ? null : w)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isSelected ? 'bg-brand-yellow/10 border border-brand-yellow/30' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-surface-2 flex items-center justify-center text-xl flex-shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-slate-400">
                      {format(parseISO(w.start_time), "EEE dd MMM · HH:mm", { locale: fr })}
                      {' · '}{dur}min
                      {distKm && <span className="text-slate-500"> · {distKm} km</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-brand-yellow">{w.strain?.toFixed(1)}</p>
                    <p className="text-xs text-slate-500">strain</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-sm font-medium text-white">{w.average_heart_rate}</p>
                    <p className="text-xs text-slate-500">bpm</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <WorkoutDetail workout={selected} />
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Zap size={32} className="text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">Sélectionnez une séance<br />pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail panel extracted for clarity ────────────────────────────────────

function WorkoutDetail({ workout: w }: { workout: Workout }) {
  const dur = differenceInMinutes(parseISO(w.end_time), parseISO(w.start_time));
  const { emoji, label } = getSportInfo(w.sport_name);
  const sportKey = w.sport_name?.toLowerCase() ?? '';

  const hasDistance = !!w.distance_meter && DISTANCE_SPORTS.has(sportKey);
  const hasAltitude = !!w.altitude_gain_meter && ALTITUDE_SPORTS.has(sportKey);
  const kcal = w.kilojoule ? (w.kilojoule / 4.184).toFixed(0) : null;
  const pctRecorded = w.percent_recorded != null
    ? `${(w.percent_recorded <= 1 ? w.percent_recorded * 100 : w.percent_recorded).toFixed(0)}%`
    : null;

  const metrics: { label: string; value: string; color: string; icon?: React.ReactNode }[] = [
    { label: 'Strain', value: w.strain?.toFixed(1) ?? '—', color: 'text-brand-yellow' },
    { label: 'Durée', value: `${dur} min`, color: 'text-white' },
    { label: 'FC Moy.', value: `${w.average_heart_rate ?? '—'} bpm`, color: 'text-brand-red' },
    { label: 'FC Max', value: `${w.max_heart_rate ?? '—'} bpm`, color: 'text-brand-red' },
    ...(kcal ? [{ label: 'Calories', value: `${kcal} kcal`, color: 'text-brand-purple' }] : []),
    ...(pctRecorded ? [{ label: 'Enregistré', value: pctRecorded, color: 'text-brand-green' }] : []),
    ...(hasDistance ? [{
      label: 'Distance',
      value: `${(w.distance_meter! / 1000).toFixed(2)} km`,
      color: 'text-brand-blue',
    }] : []),
    ...(hasAltitude ? [{
      label: 'Dénivelé +',
      value: `${Math.round(w.altitude_gain_meter!)} m`,
      color: 'text-brand-purple',
    }] : []),
  ];

  return (
    <div className="card sticky top-8 space-y-5">
      <div>
        <div className="text-3xl mb-2">{emoji}</div>
        <h3 className="font-bold text-white text-lg">{label}</h3>
        <p className="text-xs text-slate-400">
          {format(parseISO(w.start_time), "EEEE dd MMMM yyyy · HH:mm", { locale: fr })}
        </p>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map(({ label: lbl, value, color }) => (
          <div key={lbl} className="p-3 rounded-xl bg-white/5 text-center">
            <p className={`text-base font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Context badges */}
      <div className="flex flex-wrap gap-2">
        {hasDistance && (
          <span className="flex items-center gap-1 text-xs bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-full px-2.5 py-1">
            <MapPin className="h-3 w-3" />
            {(w.distance_meter! / 1000).toFixed(2)} km
          </span>
        )}
        {hasAltitude && (
          <span className="flex items-center gap-1 text-xs bg-brand-purple/10 text-brand-purple border border-brand-purple/20 rounded-full px-2.5 py-1">
            <Mountain className="h-3 w-3" />
            +{Math.round(w.altitude_gain_meter!)} m
          </span>
        )}
      </div>

      {/* Heart rate zones */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Zones de fréquence cardiaque</h4>
        <WorkoutZonesChart workout={w} />
      </div>
    </div>
  );
}
