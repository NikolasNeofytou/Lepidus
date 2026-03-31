import React, { useEffect, useState } from 'react';
import { supabase, Promotion, Station, FUEL_LABELS } from '../lib/supabase';

const DISCOUNT_TYPES = [
  { value: 'percentage',          label: '% Discount on price' },
  { value: 'fixed_eur',           label: '€ Off per litre' },
  { value: 'loyalty_multiplier',  label: 'Loyalty points multiplier' },
  { value: 'bonus_service',       label: 'Free service (car wash, etc.)' },
  { value: 'other',               label: 'Other / custom' },
];

const FUEL_OPTIONS = ['all', 'unleaded95', 'unleaded98', 'diesel', 'kerosene', 'lpg'];

const defaultForm = {
  station_id: '',
  title: '',
  description: '',
  badge_text: '',
  fuel_type: 'all' as string,
  discount_type: 'other',
  discount_value: '',
  expires_at: '',
};

export default function Promotions() {
  const [stations, setStations] = useState<Station[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: links } = await supabase
      .from('operator_stations').select('station_id').eq('operator_id', user.id);
    if (!links?.length) { setLoading(false); return; }
    const ids = links.map(l => l.station_id);

    const [stRes, prRes] = await Promise.all([
      supabase.from('stations').select('*').in('id', ids),
      supabase.from('promotions').select('*').in('station_id', ids).order('created_at', { ascending: false }),
    ]);

    setStations(stRes.data ?? []);
    setPromotions(prRes.data ?? []);
    if (stRes.data?.length) setForm(f => ({ ...f, station_id: stRes.data![0].id }));
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.station_id) { setError('Title and station are required.'); return; }
    setError(''); setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('promotions').insert({
      station_id:     form.station_id,
      operator_id:    user!.id,
      title:          form.title,
      description:    form.description || null,
      badge_text:     form.badge_text || null,
      fuel_type:      form.fuel_type,
      discount_type:  form.discount_type,
      discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
      expires_at:     form.expires_at || null,
      is_active:      true,
    });
    setSaving(false);

    if (err) { setError(err.message); return; }
    setForm(defaultForm);
    setShowForm(false);
    load();
  };

  const toggleActive = async (promo: Promotion) => {
    await supabase.from('promotions').update({ is_active: !promo.is_active }).eq('id', promo.id);
    load();
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    await supabase.from('promotions').delete().eq('id', id);
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Deals & Promotions</h1>
          <p className="text-gray-500 mt-1">Post deals that appear in the Lepidus Deals tab</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-600/30"
        >
          {showForm ? 'Cancel' : '+ New Deal'}
        </button>
      </div>

      {/* New deal form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">New Promotion</h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Station selector */}
            {stations.length > 1 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Station</label>
                <select
                  value={form.station_id}
                  onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
                >
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name} — {s.district}</option>)}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deal title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                placeholder="e.g. Free car wash with 30L fill"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="More details about the promotion…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Badge label</label>
              <input
                type="text"
                value={form.badge_text}
                onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                placeholder="e.g. Free wash · 3× Points"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Applies to fuel</label>
              <select
                value={form.fuel_type}
                onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
              >
                {FUEL_OPTIONS.map(ft => (
                  <option key={ft} value={ft}>{FUEL_LABELS[ft]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
              >
                {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {form.discount_type !== 'other' && form.discount_type !== 'bonus_service' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Value ({form.discount_type === 'percentage' ? '%' : form.discount_type === 'loyalty_multiplier' ? '×' : '€'})
                </label>
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expires at (optional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors">
              {saving ? 'Saving…' : 'Publish deal'}
            </button>
          </div>
        </form>
      )}

      {/* Promotions list */}
      {loading ? (
        <div className="text-gray-400 text-sm text-center py-12">Loading deals…</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🏷️</div>
          <p className="font-semibold text-gray-600">No deals yet</p>
          <p className="text-sm mt-1">Stations with active deals appear first in the Lepidus Deals tab</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map(promo => {
            const station = stations.find(s => s.id === promo.station_id);
            return (
              <div key={promo.id} className={`bg-white rounded-2xl border p-5 flex items-start gap-4 ${promo.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${promo.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{promo.title}</p>
                      {promo.badge_text && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-700">
                          {promo.badge_text}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => toggleActive(promo)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${promo.is_active ? 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {promo.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button onClick={() => deletePromo(promo.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                  {promo.description && <p className="text-sm text-gray-500 mt-1">{promo.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    {station && <span>📍 {station.name}</span>}
                    {promo.fuel_type && <span>⛽ {FUEL_LABELS[promo.fuel_type]}</span>}
                    {promo.expires_at && (
                      <span>⏰ Expires {new Date(promo.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    <span>Created {new Date(promo.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
