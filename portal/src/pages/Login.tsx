import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate('/');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, is_operator: true } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user && !data.session) {
      setSuccess('Check your email to confirm your account, then sign in.');
      setTab('login');
    } else {
      navigate('/claim');
    }
  };

  return (
    <div className="min-h-screen bg-brand-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 border border-white/30 text-3xl mb-4">
            ⛽
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Lepidus</h1>
          <p className="text-brand-100 mt-1">Operator Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                className={`flex-1 py-4 text-sm font-700 font-bold transition-colors ${
                  tab === t
                    ? 'text-brand-600 border-b-2 border-brand-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {tab === 'register' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Nikos Papadopoulos"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@station.cy"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder={tab === 'register' ? 'At least 8 characters' : 'Your password'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                />
              </div>

              {tab === 'register' && (
                <div className="flex items-start gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
                  <span className="text-xl">🏪</span>
                  <p className="text-xs text-brand-700 leading-relaxed">
                    Registering as a <strong>station operator</strong>. After signing up you'll claim your station(s) to start posting deals.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-brand-600/30"
              >
                {loading ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create operator account'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-brand-100 text-sm mt-6">
          This portal is for station operators only.{' '}
          <a href="#" className="text-white font-semibold underline">Download the app</a> to find fuel prices.
        </p>
      </div>
    </div>
  );
}
