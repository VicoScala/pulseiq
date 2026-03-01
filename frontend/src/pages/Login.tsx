import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/client';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Parametre de securite invalide. Reessayez.',
  no_code: "Code d'autorisation manquant.",
  auth_failed: "Echec de l'authentification. Verifiez vos identifiants WHOOP.",
  whoop_no_account: 'Aucun compte lie a ce WHOOP. Creez un compte Whoop Mate d\'abord.',
  invalid_credentials: 'Email ou mot de passe incorrect.',
  missing_fields: 'Veuillez remplir tous les champs.',
  missing_token: 'Token manquant.',
  invalid_token: 'Lien invalide ou deja utilise.',
  token_expired: 'Ce lien a expire. Demandez-en un nouveau.',
};

export function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const errorCode = params.get('error');
  const verified = params.get('verified');
  const reset = params.get('reset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.login({ email, password });
      qc.invalidateQueries({ queryKey: ['me'] });
      navigate('/dashboard');
    } catch (err: any) {
      const code = err.response?.data?.error ?? 'auth_failed';
      setError(ERROR_MESSAGES[code] ?? `Erreur : ${code}`);
    } finally {
      setLoading(false);
    }
  }

  const displayError = error || (errorCode ? (ERROR_MESSAGES[errorCode] ?? `Erreur : ${errorCode}`) : null);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111118] mb-4">
            <svg viewBox="0 0 100 100" className="h-12 w-12">
              <defs>
                <linearGradient id="wm-login" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FC4C02" />
                  <stop offset="100%" stopColor="#E8380A" />
                </linearGradient>
              </defs>
              <polyline points="12,78 29,24 46,54 63,24 80,78" stroke="url(#wm-login)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Whoop Mate</h1>
          <p className="text-slate-400 mt-1">Votre tableau de bord performance personnel</p>
        </div>

        {/* Success banners */}
        {verified && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-green/10 border border-brand-green/20">
            <p className="text-brand-green text-sm">Email verifie avec succes ! Connectez-vous.</p>
          </div>
        )}
        {reset && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-green/10 border border-brand-green/20">
            <p className="text-brand-green text-sm">Mot de passe reinitialise. Connectez-vous avec votre nouveau mot de passe.</p>
          </div>
        )}

        {/* Error */}
        {displayError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-red/10 border border-brand-red/20">
            <p className="text-brand-red text-sm">{displayError}</p>
          </div>
        )}

        {/* Email/Password Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-1">Connexion</h2>
          <p className="text-slate-400 text-sm mb-6">Connectez-vous a votre compte Whoop Mate.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-slate-400">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs text-brand-green hover:underline">
                  Mot de passe oublie ?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 caracteres"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-green text-black font-semibold text-sm hover:bg-green-400 transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center"><span className="px-3 text-xs text-slate-500 bg-[#111118]">ou</span></div>
          </div>

          {/* Whoop legacy login */}
          <a
            href="/auth/whoop"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-colors duration-150"
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="white" fillOpacity="0.1" />
              <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">W</text>
            </svg>
            Se connecter avec WHOOP
          </a>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-brand-green hover:underline font-medium">
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
