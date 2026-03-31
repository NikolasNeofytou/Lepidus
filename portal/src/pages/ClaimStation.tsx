import React, { useEffect, useState } from 'react';
import { supabase, Station } from '../lib/supabase';

export default function ClaimStation() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadClaimed(); }, []);

  const loadClaimed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('operator_stations').select('station_id').eq('operator_id', user.id);
    setClaimed((data ?? []).map(r => r.station_id));
  };

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError('');
    const { data, error: err } = await supabase
      .from('stations')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%,address.ilike.%${query}%`)
      .order('name')
      .limit(20);
    setSearching(false);
    if (err) { setError(err.message); return; }
    setResults(data ?? []);
  };

  const claim = async (stationId: string) => {
    setClaiming(stationId);
    setSuccess(''); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase
      .from('operator_stations')
      .insert({ operator_id: user.id, station_id: stationId });

    setClaiming(null);
    if (err) {
      if (err.code === '23505') {
        setError('You have already claimed this station.');
      } else {
        setError(err.message);
      }
      return;
    }

    setClaimed(prev => [...prev, stationId]);
    setSuccess('Station linked to your account! Go to My Station to manage it.');
  };

  const unclaim = async (stationId: string) => {
    if (!confirm('Remove this station from your account?')) return;
    setClaiming(stationId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('operator_stations')
      .delete()
      .eq('operator_id', user.id)
      .eq('station_id', stationId);
    setClaiming(null);
    setClaimed(prev => prev.filter(id => id !== stationId));
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Claim Your Station</h1>
        <p className="text-gray-500 mt-1">Search for your station and link it to your operator account</p>
      </div>

      {/* How it works */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-6">
        <p className="text-sm font-bold text-brand-700 mb-2">How it works</p>
        <ol className="text-sm text-brand-600 space-y-1 list-decimal list-inside">
          <li>Search for your station by name, brand, or address</li>
          <li>Click <strong>Claim</strong> to link it to your account</li>
          <li>Manage services and post deals from <strong>My Station</strong> and <strong>Deals</strong></li>
        </ol>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Search by name, brand or address
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="e.g. EKO Nicosia, Shell Limassol…"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
          />
          <button
            onClick={search}
            disabled={searching || query.trim().length < 2}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-semibold">{results.length} station{results.length !== 1 ? 's' : ''} found</p>
          {results.map(station => {
            const isClaimed = claimed.includes(station.id);
            return (
              <div
                key={station.id}
                className={`bg-white rounded-2xl border p-5 flex items-center gap-4 transition-colors ${
                  isClaimed ? 'border-brand-200 bg-brand-50/30' : 'border-gray-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 bg-brand-50 border border-brand-100 rounded-lg text-xs font-bold text-brand-600">
                      {station.brand}
                    </span>
                    {isClaimed && (
                      <span className="inline-block px-2 py-0.5 bg-green-50 border border-green-200 rounded-lg text-xs font-bold text-green-700">
                        ✓ Claimed
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-gray-900">{station.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{station.address}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{station.district} District · {station.lat.toFixed(4)}, {station.lng.toFixed(4)}</p>
                </div>
                <div className="flex-shrink-0">
                  {isClaimed ? (
                    <button
                      onClick={() => unclaim(station.id)}
                      disabled={claiming === station.id}
                      className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {claiming === station.id ? 'Removing…' : 'Remove'}
                    </button>
                  ) : (
                    <button
                      onClick={() => claim(station.id)}
                      disabled={claiming === station.id}
                      className="px-4 py-2 text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors shadow-md shadow-brand-600/20 disabled:opacity-50"
                    >
                      {claiming === station.id ? 'Claiming…' : 'Claim'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && query.trim().length >= 2 && !searching && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-gray-600">No stations found</p>
          <p className="text-sm mt-1">Try a different name, brand (EKO, Shell, Petrolina…) or city</p>
        </div>
      )}

      {/* Already claimed list */}
      {claimed.length > 0 && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-6">
          <p className="text-sm font-bold text-gray-700 mb-1">
            You have {claimed.length} station{claimed.length !== 1 ? 's' : ''} linked
          </p>
          <p className="text-sm text-gray-400">Search above to add more, or manage your stations from the sidebar.</p>
        </div>
      )}
    </div>
  );
}
