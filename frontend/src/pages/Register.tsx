import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

const ERROR_MESSAGES: Record<string, string> = {
  email_exists: 'Un compte existe deja avec cet email.',
  password_too_short: 'Le mot de passe doit contenir au moins 8 caracteres.',
  missing_fields: 'Veuillez remplir tous les champs.',
  whoop_no_account: 'Creez un compte Whoop Mate pour lier votre WHOOP.',
};

export function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const errorCode = params.get('error');

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      });
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Compte cree ! Verifiez votre email.');
      navigate('/dashboard');
    } catch (err: any) {
      const code = err.response?.data?.error ?? 'server_error';
      setError(ERROR_MESSAGES[code] ?? `Erreur : ${code}`);
    } finally {
      setLoading(false);
    }
  }

  const displayError = error || (errorCode ? (ERROR_MESSAGES[errorCode] ?? null) : null);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111118] mb-4">
            <svg viewBox="0 0 100 100" className="h-12 w-12">
              <defs>
                <linearGradient id="wm-reg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FC4C02" />
                  <stop offset="100%" stopColor="#E8380A" />
                </linearGradient>
              </defs>
              <polyline points="12,78 29,24 46,54 63,24 80,78" stroke="url(#wm-reg)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Creer un compte</h1>
          <p className="text-slate-400 mt-1">Rejoignez Whoop Mate</p>
        </div>

        {displayError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-red/10 border border-brand-red/20">
            <p className="text-brand-red text-sm">{displayError}</p>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Prenom</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={set('first_name')}
                    required
                    placeholder="Victor"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={set('last_name')}
                  required
                  placeholder="Dupont"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
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
              <label className="block text-sm text-slate-400 mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
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
              {loading ? 'Creation...' : 'Creer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Deja un compte ?{' '}
          <Link to="/login" className="text-brand-green hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
