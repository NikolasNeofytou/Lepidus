import { Station, FuelType, Promotion } from '@/types';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { MOCK_STATIONS } from './mockData';

const CACHE_KEY = 'lepidus_stations_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCachedStations(): Promise<Station[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

async function cacheStations(stations: Station[]): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: stations, timestamp: Date.now() }));
  } catch {}
}

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

    const result = stations.map((s: any) => ({
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

    cacheStations(result);
    return result;
  } catch (error) {
    console.warn('Supabase fetch failed, trying cache:', error);
    const cached = await getCachedStations();
    if (cached) return cached;
    return MOCK_STATIONS;
  }
}

export async function fetchPromotions(): Promise<Promotion[]> {
  try {
    const { data, error } = await supabase
      .from('active_promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      stationId: row.station_id,
      stationName: row.station_name,
      stationBrand: row.station_brand,
      stationDistrict: row.station_district,
      title: row.title,
      description: row.description ?? null,
      badgeText: row.badge_text ?? null,
      fuelType: row.fuel_type as FuelType | 'all',
      discountType: row.discount_type,
      discountValue: row.discount_value ? parseFloat(row.discount_value) : null,
      expiresAt: row.expires_at ?? null,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchStationFeatures(stationId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('station_features')
      .select('feature')
      .eq('station_id', stationId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.feature);
  } catch {
    return [];
  }
}

export async function logStationEvent(
  stationId: string,
  eventType: 'view' | 'favorite' | 'directions'
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('station_events').insert({
      station_id: stationId,
      event_type: eventType,
      user_id: user?.id ?? null,
    });
  } catch {
    // analytics are non-critical, fail silently
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
