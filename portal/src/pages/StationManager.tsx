import React, { useEffect, useState } from 'react';
import { supabase, Station, FEATURE_LABELS } from '../lib/supabase';

const ALL_FEATURES = Object.keys(FEATURE_LABELS);

export default function StationManager() {
  const [stations, setStations] = useState<Station[]>([]);
  const [features, setFeatures] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: links } = await supabase
      .from('operator_stations').select('station_id').eq('operator_id', user.id);
    if (!links?.length) { setLoading(false); return; }
    const ids = links.map(l => l.station_id);

    const [stRes, ftRes] = await Promise.all([
      supabase.from('stations').select('*').in('id', ids),
      supabase.from('station_features').select('*').in('station_id', ids),
    ]);

    const stationsData = stRes.data ?? [];
    setStations(stationsData);
    if (stationsData.length) setSelected(stationsData[0].id);

    const featureMap: Record<string, string[]> = {};
    ids.forEach(id => { featureMap[id] = []; });
    (ftRes.data ?? []).forEach(f => {
      featureMap[f.station_id] = [...(featureMap[f.station_id] ?? []), f.feature];
    });
    setFeatures(featureMap);
    setLoading(false);
  };

  const toggleFeature = (stationId: string, feature: string) => {
    setFeatures(prev => {
      const current = prev[stationId] ?? [];
      return {
        ...prev,
        [stationId]: current.includes(feature)
          ? current.filter(f => f !== feature)
          : [...current, feature],
      };
    });
    setSaved(false);
  };

  const saveFeatures = async () => {
    setSaving(true);
    const stationFeatures = features[selected] ?? [];

    // Delete existing and re-insert
    await supabase.from('station_features').delete().eq('station_id', selected);
    if (stationFeatures.length > 0) {
      await supabase.from('station_features').insert(
        stationFeatures.map(f => ({ station_id: selected, feature: f }))
      );
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  if (stations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-lg font-semibold text-gray-600 mb-2">No station linked</p>
        <p className="text-sm">Go to <strong>Claim Station</strong> to link your station first.</p>
      </div>
    );
  }

  const station = stations.find(s => s.id === selected)!;
  const stationFeatures = features[selected] ?? [];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Station</h1>
        <p className="text-gray-500 mt-1">Manage your station's services and information</p>
      </div>

      {/* Station switcher */}
      {stations.length > 1 && (
        <div className="flex gap-2 mb-6">
          {stations.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                selected === s.id
                  ? 'bg-brand-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Station info card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="inline-block px-2.5 py-0.5 bg-brand-50 border border-brand-100 rounded-lg text-xs font-bold text-brand-600 mb-3">
          {station.brand}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{station.name}</h2>
        <p className="text-sm text-gray-500">{station.address}</p>
        <p className="text-sm text-gray-400">{station.district} District, Cyprus</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-400">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-semibold text-gray-500">Coordinates</p>
            <p className="mt-0.5">{station.lat.toFixed(5)}, {station.lng.toFixed(5)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-semibold text-gray-500">Station ID</p>
            <p className="mt-0.5 font-mono">{station.id}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          💡 Station name, address and prices are sourced from the Cyprus Government Fuel Price Observatory and updated daily.
        </p>
      </div>

      {/* Services / Features */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Services offered</h3>
            <p className="text-sm text-gray-500 mt-0.5">Shown on your station's page in the app</p>
          </div>
          <button
            onClick={saveFeatures}
            disabled={saving}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-colors ${
              saved
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30'
            } disabled:opacity-60`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_FEATURES.map(feature => {
            const active = stationFeatures.includes(feature);
            return (
              <button
                key={feature}
                onClick={() => toggleFeature(selected, feature)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                }`}
              >
                <span className="text-2xl">{FEATURE_LABELS[feature].split(' ')[0]}</span>
                <span className="text-xs font-semibold leading-tight">
                  {FEATURE_LABELS[feature].replace(/^\S+\s/, '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
