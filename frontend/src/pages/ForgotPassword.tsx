import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      // Still show success to not leak whether email exists
      setSent(true);
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
                <linearGradient id="wm-fp" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FC4C02" />
                  <stop offset="100%" stopColor="#E8380A" />
                </linearGradient>
              </defs>
              <polyline points="12,78 29,24 46,54 63,24 80,78" stroke="url(#wm-fp)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Mot de passe oublie</h1>
          <p className="text-slate-400 mt-1">Entrez votre email pour recevoir un lien de reinitialisation.</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 mb-4">
                <Mail size={24} className="text-brand-green" />
              </div>
              <h3 className="text-white font-semibold mb-2">Email envoye</h3>
              <p className="text-slate-400 text-sm">
                Si un compte existe avec cette adresse, vous recevrez un lien pour reinitialiser votre mot de passe.
              </p>
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-green text-black font-semibold text-sm hover:bg-green-400 transition-colors duration-150 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
          )}
        </div>

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mt-6">
          <ArrowLeft size={14} />
          Retour a la connexion
        </Link>
      </div>
    </div>
  );
}
