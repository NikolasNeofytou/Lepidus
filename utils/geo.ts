import { Station, StationWithDistance } from '@/types';

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function addDistances(
  stations: Station[],
  userLat: number,
  userLon: number
): StationWithDistance[] {
  return stations.map((station) => ({
    ...station,
    distance: getDistanceKm(userLat, userLon, station.latitude, station.longitude),
  }));
}

export function sortByDistance(stations: StationWithDistance[]): StationWithDistance[] {
  return [...stations].sort((a, b) => a.distance - b.distance);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
