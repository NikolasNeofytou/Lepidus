import { FuelType, Station } from '@/types';

export function formatPrice(price: number): string {
  return `€${price.toFixed(3)}`;
}

export function getCheapestPrice(station: Station, fuelType: FuelType): number | null {
  const price = station.prices.find((p) => p.fuelType === fuelType);
  return price?.price ?? null;
}

export function sortStationsByPrice(stations: Station[], fuelType: FuelType): Station[] {
  return [...stations].sort((a, b) => {
    const priceA = getCheapestPrice(a, fuelType) ?? Infinity;
    const priceB = getCheapestPrice(b, fuelType) ?? Infinity;
    return priceA - priceB;
  });
}

export function calculateTripCost(
  distanceKm: number,
  consumptionPer100km: number,
  pricePerLiter: number
): number {
  return (distanceKm / 100) * consumptionPer100km * pricePerLiter;
}

export function getAveragePrice(stations: Station[], fuelType: FuelType): number | null {
  const prices = stations
    .map((s) => getCheapestPrice(s, fuelType))
    .filter((p): p is number => p !== null);
  if (prices.length === 0) return null;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export function getMinPrice(stations: Station[], fuelType: FuelType): number | null {
  const prices = stations
    .map((s) => getCheapestPrice(s, fuelType))
    .filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export function getMaxPrice(stations: Station[], fuelType: FuelType): number | null {
  const prices = stations
    .map((s) => getCheapestPrice(s, fuelType))
    .filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.max(...prices) : null;
}

export function getPriceTier(
  price: number,
  min: number,
  max: number
): 'cheap' | 'mid' | 'expensive' {
  const range = max - min;
  if (range < 0.001) return 'mid';
  const ratio = (price - min) / range;
  if (ratio < 0.33) return 'cheap';
  if (ratio < 0.67) return 'mid';
  return 'expensive';
}

export function getDistrictStats(
  stations: Station[],
  fuelType: FuelType,
  district: string
): { min: number; max: number; avg: number; count: number } | null {
  const prices = stations
    .filter((s) => s.district === district)
    .map((s) => getCheapestPrice(s, fuelType))
    .filter((p): p is number => p !== null);
  if (prices.length === 0) return null;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    count: prices.length,
  };
}
