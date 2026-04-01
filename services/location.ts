import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// Set to true to simulate being in Cyprus (for development outside Cyprus)
const SIMULATE_CYPRUS_LOCATION = __DEV__;

// Simulated location: central Nicosia
const SIMULATED_LOCATION: UserLocation = {
  latitude: 35.1746,
  longitude: 33.3639,
};

export async function requestLocationPermission(): Promise<boolean> {
  if (SIMULATE_CYPRUS_LOCATION) return true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<UserLocation | null> {
  if (SIMULATE_CYPRUS_LOCATION) {
    return SIMULATED_LOCATION;
  }

  const granted = await requestLocationPermission();
  if (!granted) return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
