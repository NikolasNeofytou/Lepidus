import { Station, FuelType } from '@/types';
import { supabase } from './supabase';
import { MOCK_STATIONS } from './mockData';

export async function fetchStations(): Promise<Station[]> {
  try {
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*');

    if (stationsError) throw stationsError;
    if (!stations || stations.length === 0) throw new Error('No stations found');

    const { data: prices, error: pricesError } = await supabase
      .from('latest_prices')
      .select('*');

    if (pricesError) throw pricesError;

    return stations.map((s: any) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      address: s.address,
      district: s.district,
      latitude: s.lat,
      longitude: s.lng,
      prices: (prices ?? [])
        .filter((p: any) => p.station_id === s.id)
        .map((p: any) => ({
          fuelType: p.fuel_type as FuelType,
          price: parseFloat(p.price),
          updatedAt: p.fetched_at,
        })),
    }));
  } catch (error) {
    console.warn('Supabase fetch failed, using mock data:', error);
    return MOCK_STATIONS;
  }
}

export async function fetchPriceHistory(
  stationId: string,
  fuelType: FuelType,
  days: number = 30
): Promise<{ date: string; price: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('price, fetched_at')
      .eq('station_id', stationId)
      .eq('fuel_type', fuelType)
      .gte('fetched_at', since.toISOString())
      .order('fetched_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      date: row.fetched_at,
      price: parseFloat(row.price),
    }));
  } catch {
    return [];
  }
}
