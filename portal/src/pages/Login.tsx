import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&auto=format&fit=crop&q=80';

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
    <div className="min-h-screen flex">
      {/* ── Left: hero image ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Fuel station"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gray-900/50" />
        {/* Brand overlay text */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="text-white">
            <div className="text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Lepidus Operator Portal</div>
            <h2 className="text-4xl font-black leading-tight mb-4">
              Grow your station.<br />Attract more drivers.
            </h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              Post deals, manage your services, and reach thousands of Lepidus users searching for fuel across Cyprus.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: form ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Wordmark */}
          <div className="mb-10">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Lepidus</h1>
            <p className="text-gray-400 text-sm mt-0.5">Operator Portal</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-8 border-b border-gray-100">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                className={`pb-3 text-sm font-bold transition-colors ${
                  tab === t
                    ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
          )}

          <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Nikos Papadopoulos"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@station.cy"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={tab === 'register' ? 'At least 8 characters' : '••••••••'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            {tab === 'register' && (
              <p className="text-xs text-gray-400 leading-relaxed">
                Registering as a <strong className="text-gray-600">station operator</strong>. After signing up you'll claim your station to start posting deals.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors mt-2"
            >
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-8">
            This portal is for station operators only.{' '}
            <a href="#" className="text-gray-500 underline">Download the app</a> to find fuel prices.
          </p>
        </div>
      </div>
    </div>
  );
}
