import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type FuelType = 'unleaded95' | 'unleaded98' | 'diesel' | 'kerosene' | 'lpg' | 'all';

export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
}

export interface Promotion {
  id: string;
  station_id: string;
  title: string;
  description: string | null;
  badge_text: string | null;
  fuel_type: FuelType | null;
  discount_type: string;
  discount_value: number | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface StationFeature {
  station_id: string;
  feature: string;
}

export const FEATURE_LABELS: Record<string, string> = {
  car_wash:           '🚿 Car Wash',
  cafe:               '☕ Café',
  atm:                '🏧 ATM',
  open_24h:           '🌙 Open 24h',
  air:                '💨 Free Air',
  ev_charging:        '⚡ EV Charging',
  convenience_store:  '🛒 Convenience Store',
  restroom:           '🚻 Restroom',
};

export const FUEL_LABELS: Record<string, string> = {
  unleaded95: 'Unleaded 95',
  unleaded98: 'Unleaded 98',
  diesel:     'Diesel',
  kerosene:   'Kerosene',
  lpg:        'LPG',
  all:        'All fuels',
};
