import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Station, Promotion, FUEL_LABELS } from '../lib/supabase';

interface LatestPrice {
  fuel_type: string;
  price: number;
  fetched_at: string;
}

interface EventCounts {
  views7d: number;
  favorites7d: number;
  directions7d: number;
  views30d: number;
}

interface StationWithPrices extends Station {
  prices: LatestPrice[];
  promotions: Promotion[];
  features: string[];
  events: EventCounts;
}

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-3xl font-black tracking-tight ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

function AnalyticBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold text-gray-900 w-8 flex-shrink-0">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<StationWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserName(user.user_metadata?.display_name ?? user.email ?? '');

      const { data: links } = await supabase
        .from('operator_stations')
        .select('station_id')
        .eq('operator_id', user.id);

      if (!links || links.length === 0) { setLoading(false); return; }
      const stationIds = links.map(l => l.station_id);

      const [stationsRes, pricesRes, promoRes, featuresRes, eventsRes] = await Promise.all([
        supabase.from('stations').select('*').in('id', stationIds),
        supabase.from('latest_prices').select('*').in('station_id', stationIds),
        supabase.from('promotions').select('*').in('station_id', stationIds).eq('is_active', true),
        supabase.from('station_features').select('*').in('station_id', stationIds),
        supabase.from('station_event_counts').select('*').in('station_id', stationIds),
      ]);

      const eventData = eventsRes.data ?? [];

      const getEventCount = (stationId: string, type: string, period: 'last_7d' | 'last_30d') => {
        const row = eventData.find(e => e.station_id === stationId && e.event_type === type);
        return row ? (row[period] as number) : 0;
      };

      const result: StationWithPrices[] = (stationsRes.data ?? []).map(s => ({
        ...s,
        prices: (pricesRes.data ?? []).filter(p => p.station_id === s.id),
        promotions: (promoRes.data ?? []).filter(p => p.station_id === s.id),
        features: (featuresRes.data ?? []).filter(f => f.station_id === s.id).map(f => f.feature),
        events: {
          views7d:      getEventCount(s.id, 'view', 'last_7d'),
          favorites7d:  getEventCount(s.id, 'favorite', 'last_7d'),
          directions7d: getEventCount(s.id, 'directions', 'last_7d'),
          views30d:     getEventCount(s.id, 'view', 'last_30d'),
        },
      }));

      setStations(result);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-sm">Loading your dashboard…</div>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-screen text-center">
        <div className="text-6xl mb-6">⛽</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">No station linked yet</h1>
        <p className="text-gray-500 mb-8">Claim your station to start managing deals and appearing in the Lepidus marketplace.</p>
        <button
          onClick={() => navigate('/claim')}
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-3.5 rounded-xl transition-colors"
        >
          Claim my station →
        </button>
      </div>
    );
  }

  const totalViews7d = stations.reduce((n, s) => n + s.events.views7d, 0);
  const totalFavorites7d = stations.reduce((n, s) => n + s.events.favorites7d, 0);
  const totalDirections7d = stations.reduce((n, s) => n + s.events.directions7d, 0);
  const totalActiveDeals = stations.reduce((n, s) => n + s.promotions.length, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {userName.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Profile views" value={totalViews7d} sub="Last 7 days" accent />
        <StatCard label="Active deals" value={totalActiveDeals} sub="Live on marketplace" />
        <StatCard label="Favourited" value={totalFavorites7d} sub="Last 7 days" />
        <StatCard label="Directions tapped" value={totalDirections7d} sub="Last 7 days" />
      </div>

      {/* Station cards */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Your Stations</h2>
      <div className="space-y-4">
        {stations.map(station => (
          <div key={station.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Station header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-50">
              <div>
                <div className="inline-block px-2.5 py-0.5 bg-brand-50 border border-brand-100 rounded-lg text-xs font-bold text-brand-600 mb-2">
                  {station.brand}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{station.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{station.address} · {station.district}</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => navigate('/promotions')}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  + Add Deal
                </button>
                <button
                  onClick={() => navigate('/station')}
                  className="px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="p-6 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Activity — last 7 days
              </p>
              <div className="space-y-3">
                {(() => {
                  const max = Math.max(station.events.views7d, station.events.favorites7d, station.events.directions7d, 1);
                  return (
                    <>
                      <AnalyticBar label="Profile views" value={station.events.views7d} max={max} color="#6366f1" />
                      <AnalyticBar label="Favourites" value={station.events.favorites7d} max={max} color="#f43f5e" />
                      <AnalyticBar label="Directions" value={station.events.directions7d} max={max} color="#16a34a" />
                    </>
                  );
                })()}
              </div>
              {station.events.views30d > 0 && (
                <p className="text-xs text-gray-400 mt-4">
                  {station.events.views30d} profile views in the last 30 days
                </p>
              )}
            </div>

            {/* Prices grid */}
            {station.prices.length > 0 && (
              <div className="p-6 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Current prices</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {station.prices.map(p => (
                    <div key={p.fuel_type} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">{FUEL_LABELS[p.fuel_type]}</p>
                      <p className="text-xl font-black text-brand-600">€{Number(p.price).toFixed(3)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(p.fetched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active deals */}
            <div className="px-6 py-4">
              {station.promotions.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Active deals ({station.promotions.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {station.promotions.map(promo => (
                      <span key={promo.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
                        🏷️ {promo.title}
                        {promo.expires_at && (
                          <span className="text-amber-500">
                            · expires {new Date(promo.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">No active deals — attract more customers by posting one</p>
                  <button
                    onClick={() => navigate('/promotions')}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Add deal →
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 p-5 bg-gray-900 rounded-2xl flex items-start gap-4">
        <span className="text-2xl">💡</span>
        <div>
          <p className="text-white font-semibold text-sm mb-1">Tips to attract more customers</p>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• Post a deal — stations with active deals appear first in the Deals tab</li>
            <li>• Add your services (car wash, café etc.) to stand out from competitors</li>
            <li>• Keep prices up to date — Lepidus auto-fetches from the government API daily</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
