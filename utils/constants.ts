import { FuelType } from '@/types';

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  unleaded95: 'Unleaded 95',
  unleaded98: 'Unleaded 98',
  diesel: 'Diesel',
  kerosene: 'Kerosene',
  lpg: 'LPG',
};

export const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  unleaded95: '#4CAF50',
  unleaded98: '#2196F3',
  diesel: '#FF9800',
  kerosene: '#9C27B0',
  lpg: '#F44336',
};

export const CYPRUS_REGION = {
  latitude: 35.1264,
  longitude: 33.4299,
  latitudeDelta: 1.2,
  longitudeDelta: 1.8,
};

export const CYPRUS_DISTRICTS = [
  'Nicosia',
  'Limassol',
  'Larnaca',
  'Paphos',
  'Famagusta',
  'Kyrenia',
] as const;

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const PRICE_STALE_TIME = 15 * 60 * 1000; // 15 minutes

export const STATION_FEATURE_LABELS: Record<string, { emoji: string; label: string }> = {
  car_wash:          { emoji: '🚿', label: 'Car Wash' },
  cafe:              { emoji: '☕', label: 'Café' },
  atm:               { emoji: '🏧', label: 'ATM' },
  open_24h:          { emoji: '🌙', label: 'Open 24h' },
  air:               { emoji: '💨', label: 'Free Air' },
  ev_charging:       { emoji: '⚡', label: 'EV Charging' },
  convenience_store: { emoji: '🛒', label: 'Mini Market' },
  restroom:          { emoji: '🚻', label: 'Restroom' },
};
