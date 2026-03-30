import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Station, StationWithDistance, FuelType } from '@/types';
import { getCheapestPrice, formatPrice } from '@/utils/fuel';
import { formatDistance } from '@/utils/geo';
import { useFavoritesStore } from '@/stores/favorites';

// Brand identity colours — falls back to slate if unknown
const BRAND_PALETTE: Record<string, { bg: string; accent: string; text: string }> = {
  EKO:        { bg: '#006B35', accent: '#00913F', text: '#fff' },
  SHELL:      { bg: '#C8102E', accent: '#E8112E', text: '#fff' },
  PETROLINA:  { bg: '#003087', accent: '#0040A8', text: '#fff' },
  ESSO:       { bg: '#C8102E', accent: '#E2001A', text: '#fff' },
  BP:         { bg: '#007A33', accent: '#009944', text: '#fff' },
  TOTAL:      { bg: '#C8102E', accent: '#E2001A', text: '#fff' },
  'TOTAL/ELF': { bg: '#C8102E', accent: '#E2001A', text: '#fff' },
  CALTEX:     { bg: '#C8102E', accent: '#E2001A', text: '#fff' },
  LUKOIL:     { bg: '#FF6600', accent: '#FF8020', text: '#fff' },
  REPSOL:     { bg: '#FF6600', accent: '#FF8020', text: '#fff' },
};

function getBrandPalette(brand: string) {
  // Try exact match, then first-word match
  const upper = brand.toUpperCase();
  if (BRAND_PALETTE[upper]) return BRAND_PALETTE[upper];
  const firstWord = upper.split(/[\s/]/)[0];
  return BRAND_PALETTE[firstWord] ?? { bg: '#1E293B', accent: '#334155', text: '#fff' };
}

interface MarketplaceCardProps {
  station: Station | StationWithDistance;
  fuelType: FuelType;
  avgPrice?: number | null;
  isDeal?: boolean;
  onPress: () => void;
}

export function MarketplaceCard({
  station,
  fuelType,
  avgPrice,
  isDeal = false,
  onPress,
}: MarketplaceCardProps) {
  const price = getCheapestPrice(station, fuelType);
  const distance = 'distance' in station ? station.distance : null;
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorite = isFavorite(station.id);
  const palette = getBrandPalette(station.brand);

  const savings = price != null && avgPrice != null ? avgPrice - price : null;
  const hasSavings = savings != null && savings > 0.0005;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Brand banner */}
      <View style={[styles.banner, { backgroundColor: palette.bg }]}>
        {/* Deal badge */}
        {isDeal && hasSavings && (
          <View style={styles.dealBadge}>
            <Text style={styles.dealBadgeText}>
              Save {formatPrice(savings!)}
            </Text>
          </View>
        )}
        {/* Brand initials */}
        <View style={[styles.brandCircle, { backgroundColor: palette.accent }]}>
          <Text style={[styles.brandInitials, { color: palette.text }]}>
            {station.brand.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        {/* Favourite */}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(station.id)}
          hitSlop={10}
        >
          <FontAwesome
            name={favorite ? 'heart' : 'heart-o'}
            size={14}
            color={favorite ? '#fca5a5' : 'rgba(255,255,255,0.7)'}
          />
        </TouchableOpacity>
      </View>

      {/* Card body */}
      <View style={styles.body}>
        <Text style={styles.brand}>{station.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {station.name}
        </Text>

        <View style={styles.metaRow}>
          {distance != null && (
            <View style={styles.metaChip}>
              <FontAwesome name="location-arrow" size={9} color="#6B7280" />
              <Text style={styles.metaText}> {formatDistance(distance)}</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <FontAwesome name="map-marker" size={9} color="#6B7280" />
            <Text style={styles.metaText}> {station.district}</Text>
          </View>
        </View>

        {/* Price */}
        {price != null ? (
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            <Text style={styles.priceUnit}>/L</Text>
          </View>
        ) : (
          <Text style={styles.noPrice}>No price</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  banner: {
    height: 80,
    justifyContent: 'flex-end',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dealBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FCD34D',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dealBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
  },
  brandCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  brandInitials: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 11,
  },
  brand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  noPrice: {
    fontSize: 12,
    color: '#D1D5DB',
  },
});
