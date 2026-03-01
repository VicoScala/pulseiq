import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authApi } from '../api/client';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'Ce lien est invalide ou a deja ete utilise.',
  token_expired: 'Ce lien a expire. Demandez-en un nouveau.',
  password_too_short: 'Le mot de passe doit contenir au moins 8 caracteres.',
  missing_fields: 'Veuillez remplir tous les champs.',
};

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <p className="text-brand-red mb-4">Lien de reinitialisation invalide.</p>
          <Link to="/forgot-password" className="text-brand-green hover:underline text-sm">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      navigate('/login?reset=true');
    } catch (err: any) {
      const code = err.response?.data?.error ?? 'server_error';
      setError(ERROR_MESSAGES[code] ?? `Erreur : ${code}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111118] mb-4">
            <svg viewBox="0 0 100 100" className="h-12 w-12">
              <defs>
                <linearGradient id="wm-rp" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FC4C02" />
                  <stop offset="100%" stopColor="#E8380A" />
                </linearGradient>
              </defs>
              <polyline points="12,78 29,24 46,54 63,24 80,78" stroke="url(#wm-rp)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Nouveau mot de passe</h1>
          <p className="text-slate-400 mt-1">Choisissez un nouveau mot de passe pour votre compte.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-red/10 border border-brand-red/20">
            <p className="text-brand-red text-sm">{error}</p>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Confirmer</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Retapez votre mot de passe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-green text-black font-semibold text-sm hover:bg-green-400 transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? 'Reinitialisation...' : 'Reinitialiser'}
            </button>
          </form>
        </div>

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mt-6">
          <ArrowLeft size={14} />
          Retour a la connexion
        </Link>
      </div>
    </div>
  );
}
