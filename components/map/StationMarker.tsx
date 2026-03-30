import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Station, FuelType } from '@/types';
import { getCheapestPrice, formatPrice } from '@/utils/fuel';
import { FUEL_TYPE_COLORS } from '@/utils/constants';

interface StationMarkerProps {
  station: Station;
  fuelType: FuelType;
  onPress: (station: Station) => void;
}

export function StationMarker({ station, fuelType, onPress }: StationMarkerProps) {
  const price = getCheapestPrice(station, fuelType);

  return (
    <Marker
      coordinate={{
        latitude: station.latitude,
        longitude: station.longitude,
      }}
      onPress={() => onPress(station)}
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.badge,
            { backgroundColor: FUEL_TYPE_COLORS[fuelType] },
          ]}
        >
          <Text style={styles.price}>
            {price != null ? formatPrice(price) : '—'}
          </Text>
        </View>
        <View style={styles.arrow} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  price: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#333',
    marginTop: -1,
  },
});
