import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome } from '@expo/vector-icons';

import { StationCard } from '@/components/station/StationCard';
import { FuelTypeSelector } from '@/components/station/FuelTypeSelector';
import { useStationsStore } from '@/stores/stations';
import { useSettingsStore } from '@/stores/settings';
import { fetchStations } from '@/services/api';
import { getCurrentLocation } from '@/services/location';
import { addDistances, sortByDistance } from '@/utils/geo';
import {
  sortStationsByPrice,
  getAveragePrice,
  getMinPrice,
  getMaxPrice,
} from '@/utils/fuel';
import { Station, SortMode } from '@/types';

const SORTS: { mode: SortMode; label: string }[] = [
  { mode: 'price', label: 'Cheapest' },
  { mode: 'distance', label: 'Nearest' },
  { mode: 'name', label: 'A–Z' },
];

export default function ListScreen() {
  const router = useRouter();
  const { selectedFuelType, setSelectedFuelType, searchQuery, setSearchQuery } =
    useStationsStore();
  const { sortMode, setSortMode } = useSettingsStore();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          setUserLat(loc.latitude);
          setUserLon(loc.longitude);
        }
      } catch {}
    })();
  }, []);

  // Market stats for selected fuel type
  const avgPrice = useMemo(
    () => getAveragePrice(stations, selectedFuelType),
    [stations, selectedFuelType]
  );
  const minPrice = useMemo(
    () => getMinPrice(stations, selectedFuelType),
    [stations, selectedFuelType]
  );
  const maxPrice = useMemo(
    () => getMaxPrice(stations, selectedFuelType),
    [stations, selectedFuelType]
  );
  const priceSpread =
    minPrice != null && maxPrice != null ? maxPrice - minPrice : null;

  const sorted = useMemo(() => {
    let filtered = stations.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.district.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortMode === 'distance' && userLat != null && userLon != null)
      return sortByDistance(addDistances(filtered, userLat, userLon));
    if (sortMode === 'name')
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return sortStationsByPrice(filtered, selectedFuelType);
  }, [stations, searchQuery, sortMode, selectedFuelType, userLat, userLon]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={14} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stations, brands, districts…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FuelTypeSelector selected={selectedFuelType} onSelect={setSelectedFuelType} />

      {/* Market snapshot header */}
      {minPrice != null && maxPrice != null && avgPrice != null && (
        <View style={styles.marketCard}>
          <View style={styles.marketTop}>
            <Text style={styles.marketTitle}>Today's Market</Text>
            {priceSpread != null && (
              <View style={styles.spreadBadge}>
                <Text style={styles.spreadText}>
                  €{priceSpread.toFixed(3)} spread
                </Text>
              </View>
            )}
          </View>
          <View style={styles.marketPriceRow}>
            <View style={styles.marketStat}>
              <Text style={styles.marketStatLabel}>Cheapest</Text>
              <Text style={[styles.marketStatValue, { color: '#16a34a' }]}>
                €{minPrice.toFixed(3)}
              </Text>
            </View>
            <View style={styles.marketDivider} />
            <View style={[styles.marketStat, { alignItems: 'center' }]}>
              <Text style={styles.marketStatLabel}>Average</Text>
              <Text style={[styles.marketStatValue, { color: '#374151' }]}>
                €{avgPrice.toFixed(3)}
              </Text>
            </View>
            <View style={styles.marketDivider} />
            <View style={[styles.marketStat, { alignItems: 'flex-end' }]}>
              <Text style={styles.marketStatLabel}>Most exp.</Text>
              <Text style={[styles.marketStatValue, { color: '#ef4444' }]}>
                €{maxPrice.toFixed(3)}
              </Text>
            </View>
          </View>
          {/* Price range bar */}
          <View style={styles.rangeBar}>
            <View style={styles.rangeTrack}>
              <View style={styles.rangeFillCheap} />
              <View style={styles.rangeFillMid} />
              <View style={styles.rangeFillExp} />
            </View>
          </View>
        </View>
      )}

      {/* Sort bar */}
      <View style={styles.sortBar}>
        {SORTS.map(({ mode, label }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
            onPress={() => setSortMode(mode)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortLabel, sortMode === mode && styles.sortLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.count}>{sorted.length} found</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <StationCard
            station={item}
            selectedFuelType={selectedFuelType}
            onPress={(s) => router.push(`/station/${s.id}`)}
            rank={sortMode === 'price' ? index + 1 : undefined}
            avgPrice={avgPrice}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.6)',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    letterSpacing: -0.1,
  },

  // Market snapshot
  marketCard: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  marketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  marketTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.1,
  },
  spreadBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  spreadText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  marketPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  marketStat: { flex: 1 },
  marketStatLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  marketStatValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  marketDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  rangeBar: { marginTop: 2 },
  rangeTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  rangeFillCheap: { flex: 1, backgroundColor: '#16a34a' },
  rangeFillMid: { flex: 1, backgroundColor: '#d97706' },
  rangeFillExp: { flex: 1, backgroundColor: '#ef4444' },

  // Sort
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.6)',
  },
  sortChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  sortLabelActive: { color: '#fff' },
  count: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  list: { paddingTop: 4, paddingBottom: 110 },
});
