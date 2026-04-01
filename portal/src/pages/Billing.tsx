import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Profile {
  subscription_tier: 'free' | 'pro';
  subscription_ends_at: string | null;
}

export default function Billing() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_ends_at')
      .eq('user_id', user.id)
      .single();

    setProfile(data as Profile | null);
    setLoading(false);
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert('Failed to start checkout. Please try again.');
      setUpgrading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  }

  const isPro = profile?.subscription_tier === 'pro';

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Billing</h1>
      <p className="text-gray-500 mb-8">Manage your subscription plan</p>

      {/* Current plan banner */}
      <div className={`rounded-2xl p-6 mb-8 ${isPro ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isPro ? 'text-brand-100' : 'text-gray-400'}`}>
              Current plan
            </div>
            <div className={`text-2xl font-black ${isPro ? 'text-white' : 'text-gray-900'}`}>
              {isPro ? 'Pro' : 'Free'}
            </div>
          </div>
          {isPro && profile?.subscription_ends_at && (
            <div className="text-sm text-brand-100">
              Renews {new Date(profile.subscription_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free tier */}
        <div className={`rounded-2xl border p-6 ${!isPro ? 'border-brand-300 ring-2 ring-brand-100' : 'border-gray-200'}`}>
          <div className="text-lg font-black text-gray-900 mb-1">Free</div>
          <div className="text-3xl font-black text-gray-900 mb-4">€0<span className="text-sm font-normal text-gray-400">/mo</span></div>
          <ul className="space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> 1 active promotion</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Basic analytics (7 days)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Claim up to 3 stations</li>
            <li className="flex items-start gap-2"><span className="text-gray-300 mt-0.5">&#10007;</span><span className="text-gray-400">Priority listing</span></li>
            <li className="flex items-start gap-2"><span className="text-gray-300 mt-0.5">&#10007;</span><span className="text-gray-400">Custom badge</span></li>
          </ul>
          {!isPro && (
            <div className="mt-6 text-center text-sm font-semibold text-gray-400">Current plan</div>
          )}
        </div>

        {/* Pro tier */}
        <div className={`rounded-2xl border p-6 ${isPro ? 'border-brand-300 ring-2 ring-brand-100' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-lg font-black text-gray-900">Pro</div>
            <span className="px-2 py-0.5 bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-brand-700">Popular</span>
          </div>
          <div className="text-3xl font-black text-gray-900 mb-4">€29<span className="text-sm font-normal text-gray-400">/mo</span></div>
          <ul className="space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Unlimited promotions</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Full analytics (30d + all time)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Unlimited station claims</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Priority listing in Deals tab</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">&#10003;</span> Custom promotion badge</li>
          </ul>
          {!isPro ? (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="mt-6 w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
            >
              {upgrading ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
            </button>
          ) : (
            <div className="mt-6 text-center text-sm font-semibold text-brand-600">Current plan</div>
          )}
        </div>
      </div>
    </div>
  );
}
