export type FuelType = 'unleaded95' | 'unleaded98' | 'diesel' | 'kerosene' | 'lpg';

export interface FuelPrice {
  fuelType: FuelType;
  price: number; // EUR per liter
  updatedAt: string; // ISO date string
}

export interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  prices: FuelPrice[];
}

export interface StationWithDistance extends Station {
  distance: number; // km from user
}

export interface PriceSnapshot {
  stationId: string;
  fuelType: FuelType;
  price: number;
  fetchedAt: string;
}

export interface CarProfile {
  name: string;
  consumptionPer100km: number; // liters per 100km
  preferredFuel: FuelType;
}

export interface UserSettings {
  defaultFuelType: FuelType;
  carProfile: CarProfile | null;
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export type SortMode = 'price' | 'distance' | 'name';
