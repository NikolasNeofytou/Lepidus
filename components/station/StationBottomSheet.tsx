import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesome } from '@expo/vector-icons';
import { Station } from '@/types';
import { formatPrice } from '@/utils/fuel';
import { FUEL_TYPE_LABELS, FUEL_TYPE_COLORS } from '@/utils/constants';
import { useFavoritesStore } from '@/stores/favorites';

interface StationBottomSheetProps {
  station: Station | null;
  onClose: () => void;
}

export const StationBottomSheet = forwardRef<BottomSheet, StationBottomSheetProps>(
  ({ station, onClose }, ref) => {
    const snapPoints = useMemo(() => ['35%', '60%'], []);
    const { isFavorite, toggleFavorite } = useFavoritesStore();

    const openNavigation = useCallback(() => {
      if (!station) return;
      const url = Platform.select({
        ios: `maps:?daddr=${station.latitude},${station.longitude}`,
        android: `google.navigation:q=${station.latitude},${station.longitude}`,
      });
      if (url) Linking.openURL(url);
    }, [station]);

    if (!station) return null;

    const favorite = isFavorite(station.id);

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        index={0}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.name}>{station.name}</Text>
              <Text style={styles.brand}>{station.brand}</Text>
              <Text style={styles.address}>{station.address}</Text>
              <Text style={styles.district}>{station.district}</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleFavorite(station.id)}
              hitSlop={12}
            >
              <FontAwesome
                name={favorite ? 'heart' : 'heart-o'}
                size={24}
                color={favorite ? '#E91E63' : '#ccc'}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Fuel Prices</Text>
          <View style={styles.pricesGrid}>
            {station.prices.map((fp) => (
              <View
                key={fp.fuelType}
                style={[
                  styles.priceCard,
                  { borderLeftColor: FUEL_TYPE_COLORS[fp.fuelType] },
                ]}
              >
                <Text style={styles.fuelLabel}>
                  {FUEL_TYPE_LABELS[fp.fuelType]}
                </Text>
                <Text style={styles.priceValue}>{formatPrice(fp.price)}</Text>
                <Text style={styles.perLiter}>per litre</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.navigateBtn} onPress={openNavigation}>
            <FontAwesome name="location-arrow" size={16} color="#fff" />
            <Text style={styles.navigateBtnText}>Navigate</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  indicator: {
    backgroundColor: '#ddd',
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  address: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  district: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  pricesGrid: {
    gap: 8,
    marginBottom: 20,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fuelLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginRight: 6,
  },
  perLiter: {
    fontSize: 11,
    color: '#999',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
  },
  navigateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
