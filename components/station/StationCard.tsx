import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Station, StationWithDistance, FuelType } from '@/types';
import { getCheapestPrice, formatPrice } from '@/utils/fuel';
import { formatDistance } from '@/utils/geo';
import { useFavoritesStore } from '@/stores/favorites';

interface StationCardProps {
  station: Station | StationWithDistance;
  selectedFuelType: FuelType;
  onPress: (station: Station) => void;
  rank?: number;
  avgPrice?: number | null;
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7c2f']; // gold, silver, bronze

export function StationCard({
  station,
  selectedFuelType,
  onPress,
  rank,
  avgPrice,
}: StationCardProps) {
  const price = getCheapestPrice(station, selectedFuelType);
  const distance = 'distance' in station ? station.distance : null;
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorite = isFavorite(station.id);

  const savings =
    price != null && avgPrice != null ? avgPrice - price : null;
  const hasSavings = savings != null && savings > 0.0005;

  const isTop3 = rank != null && rank <= 3;
  const rankColor = isTop3 ? RANK_COLORS[rank! - 1] : '#9CA3AF';

  return (
    <TouchableOpacity
      style={[styles.card, isTop3 && styles.cardTop]}
      onPress={() => onPress(station)}
      activeOpacity={0.7}
    >
      {/* Rank badge */}
      {rank != null && (
        <View style={[styles.rankBadge, { borderColor: rankColor + '33', backgroundColor: rankColor + '15' }]}>
          <Text style={[styles.rankNum, { color: rankColor }]}>{rank}</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {station.name}
          </Text>
          <TouchableOpacity onPress={() => toggleFavorite(station.id)} hitSlop={12}>
            <FontAwesome
              name={favorite ? 'heart' : 'heart-o'}
              size={14}
              color={favorite ? '#ef4444' : '#D1D5DB'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.brand}>{station.brand}</Text>
          <View style={styles.dot} />
          <Text style={styles.district}>{station.district}</Text>
          {distance != null && (
            <>
              <View style={styles.dot} />
              <FontAwesome name="location-arrow" size={9} color="#2563EB" style={{ marginTop: 1 }} />
              <Text style={styles.distance}> {formatDistance(distance)}</Text>
            </>
          )}
        </View>

        {/* Savings badge */}
        {hasSavings && (
          <View style={styles.savingsBadge}>
            <FontAwesome name="tag" size={9} color="#16a34a" />
            <Text style={styles.savingsText}>
              Save {formatPrice(savings!)} vs avg
            </Text>
          </View>
        )}
      </View>

      {/* Price */}
      {price != null ? (
        <View style={styles.priceBlock}>
          <Text style={[styles.priceValue, isTop3 && styles.priceValueTop]}>
            {formatPrice(price)}
          </Text>
          <Text style={styles.priceUnit}>/L</Text>
        </View>
      ) : (
        <Text style={styles.noPriceText}>—</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  cardTop: {
    borderColor: 'rgba(22,163,74,0.2)',
    backgroundColor: '#fafffe',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    marginRight: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  district: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    letterSpacing: 0.1,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  priceValueTop: {
    color: '#15803d',
  },
  priceUnit: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  noPriceText: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '300',
  },
});
