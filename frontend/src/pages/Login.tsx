import { useSearchParams } from 'react-router-dom';
import { Activity, Zap, Heart, Moon } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Paramètre de sécurité invalide. Réessayez.',
  no_code: 'Code d\'autorisation manquant.',
  auth_failed: 'Échec de l\'authentification. Vérifiez vos identifiants WHOOP.',
};

const FEATURES = [
  { icon: Activity, color: 'text-brand-green', label: 'Recovery Score', desc: 'Suivi en temps réel' },
  { icon: Heart,    color: 'text-brand-red',   label: 'HRV & FC Repos',  desc: 'Tendances 90 jours' },
  { icon: Moon,     color: 'text-brand-purple', label: 'Sommeil',         desc: 'Phases détaillées' },
  { icon: Zap,      color: 'text-brand-yellow', label: 'Charge',          desc: 'Strain & workouts' },
];

export function Login() {
  const [params] = useSearchParams();
  const errorCode = params.get('error');

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/20 border border-brand-green/30 mb-4">
            <span className="text-3xl font-black text-brand-green">PQ</span>
          </div>
          <h1 className="text-3xl font-bold text-white">PulseIQ</h1>
          <p className="text-slate-400 mt-1">Votre tableau de bord performance personnel</p>
        </div>

        {/* Error */}
        {errorCode && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-red/10 border border-brand-red/20">
            <p className="text-brand-red text-sm">{ERROR_MESSAGES[errorCode] ?? `Erreur : ${errorCode}`}</p>
          </div>
        )}

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-1">Connectez votre WHOOP</h2>
          <p className="text-slate-400 text-sm mb-6">
            Autorisez PulseIQ à accéder à vos données de santé et performance WHOOP.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {FEATURES.map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5">
                <Icon size={18} className={`${color} mt-0.5 flex-shrink-0`} />
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="/auth/whoop"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-green text-black font-semibold text-sm hover:bg-green-400 transition-colors duration-150"
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="black" fillOpacity="0.15" />
              <path d="M20 8 C13.4 8 8 13.4 8 20 C8 26.6 13.4 32 20 32 C26.6 32 32 26.6 32 20 C32 13.4 26.6 8 20 8Z" fill="white" fillOpacity="0.3" />
              <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="black">W</text>
            </svg>
            Connecter avec WHOOP
          </a>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          PulseIQ n'utilise que vos données WHOOP en lecture seule.<br />
          Vos données restent privées et locales.
        </p>
      </div>
    </div>
  );
}
