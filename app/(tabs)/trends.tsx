import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { fetchStations } from '@/services/api';
import { FUEL_TYPE_LABELS, CYPRUS_DISTRICTS } from '@/utils/constants';
import {
  getCheapestPrice,
  getAveragePrice,
  getMinPrice,
  getMaxPrice,
  getDistrictStats,
  sortStationsByPrice,
  formatPrice,
} from '@/utils/fuel';
import { FuelType } from '@/types';

const FUEL_TYPES: FuelType[] = ['unleaded95', 'unleaded98', 'diesel', 'kerosene'];

const FUEL_COLORS: Record<FuelType, string> = {
  unleaded95: '#16a34a',
  unleaded98: '#2563eb',
  diesel: '#d97706',
  kerosene: '#7c3aed',
  lpg: '#dc2626',
};

const FUEL_ICONS: Record<FuelType, string> = {
  unleaded95: '⛽',
  unleaded98: '⛽',
  diesel: '🚛',
  kerosene: '🔥',
  lpg: '💨',
};

export default function TrendsScreen() {
  const router = useRouter();
  const [selectedFuel, setSelectedFuel] = useState<FuelType>('unleaded95');

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 15 * 60 * 1000,
  });

  // National averages across all fuel types
  const nationalStats = useMemo(
    () =>
      FUEL_TYPES.map((ft) => ({
        fuelType: ft,
        avg: getAveragePrice(stations, ft),
        min: getMinPrice(stations, ft),
        max: getMaxPrice(stations, ft),
        count: stations.filter((s) => getCheapestPrice(s, ft) !== null).length,
      })),
    [stations]
  );

  // District breakdown for selected fuel
  const districtStats = useMemo(
    () =>
      CYPRUS_DISTRICTS.map((d) => ({
        district: d,
        stats: getDistrictStats(stations, selectedFuel, d),
      })).filter((d) => d.stats !== null),
    [stations, selectedFuel]
  );

  // Top 5 cheapest for selected fuel
  const top5 = useMemo(
    () => sortStationsByPrice(stations, selectedFuel).slice(0, 5),
    [stations, selectedFuel]
  );

  const selectedMin = getMinPrice(stations, selectedFuel);
  const selectedMax = getMaxPrice(stations, selectedFuel);

  if (stations.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading market data…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market Overview</Text>
        <Text style={styles.headerSub}>
          Cyprus · {stations.length} stations tracked
        </Text>
      </View>

      {/* National averages grid */}
      <Text style={styles.sectionTitle}>National Averages</Text>
      <View style={styles.avgGrid}>
        {nationalStats.map(({ fuelType, avg, min, max, count }) => {
          if (avg == null) return null;
          const color = FUEL_COLORS[fuelType];
          return (
            <TouchableOpacity
              key={fuelType}
              style={[
                styles.avgCard,
                selectedFuel === fuelType && {
                  borderColor: color + '60',
                  backgroundColor: color + '08',
                },
              ]}
              onPress={() => setSelectedFuel(fuelType)}
              activeOpacity={0.7}
            >
              <Text style={styles.avgCardEmoji}>{FUEL_ICONS[fuelType]}</Text>
              <Text style={styles.avgCardType}>{FUEL_TYPE_LABELS[fuelType]}</Text>
              <Text style={[styles.avgCardPrice, { color }]}>
                €{avg.toFixed(3)}
              </Text>
              <Text style={styles.avgCardRange}>
                {min != null && max != null
                  ? `€${min.toFixed(3)} – €${max.toFixed(3)}`
                  : ''}
              </Text>
              <Text style={styles.avgCardCount}>{count} stations</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* District breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>By District</Text>
        <Text style={styles.sectionSub}>{FUEL_TYPE_LABELS[selectedFuel]}</Text>
      </View>
      <View style={styles.districtTable}>
        {districtStats.map(({ district, stats }) => {
          if (!stats) return null;
          const color = FUEL_COLORS[selectedFuel];
          // How cheap is this district vs national range?
          const fillPct =
            selectedMin != null && selectedMax != null && selectedMax > selectedMin
              ? 1 - (stats.avg - selectedMin) / (selectedMax - selectedMin)
              : 0.5;

          return (
            <View key={district} style={styles.districtRow}>
              <View style={styles.districtLeft}>
                <Text style={styles.districtName}>{district}</Text>
                <Text style={styles.districtCount}>{stats.count} stations</Text>
              </View>
              <View style={styles.districtBar}>
                <View
                  style={[
                    styles.districtFill,
                    { width: `${Math.max(10, Math.round(fillPct * 100))}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <View style={styles.districtRight}>
                <Text style={[styles.districtAvg, { color }]}>
                  €{stats.avg.toFixed(3)}
                </Text>
                <Text style={styles.districtMinMax}>
                  €{stats.min.toFixed(3)}–{stats.max.toFixed(3)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Top 5 cheapest */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🏆 Top 5 Cheapest</Text>
        <Text style={styles.sectionSub}>{FUEL_TYPE_LABELS[selectedFuel]}</Text>
      </View>
      <View style={styles.top5List}>
        {top5.map((station, index) => {
          const price = getCheapestPrice(station, selectedFuel);
          if (price == null) return null;
          const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
          return (
            <TouchableOpacity
              key={station.id}
              style={styles.top5Row}
              onPress={() => router.push(`/station/${station.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.top5Medal}>{medals[index]}</Text>
              <View style={styles.top5Info}>
                <Text style={styles.top5Name} numberOfLines={1}>
                  {station.name}
                </Text>
                <Text style={styles.top5Meta}>
                  {station.brand} · {station.district}
                </Text>
              </View>
              <View style={styles.top5PriceRow}>
                <Text style={styles.top5Price}>{formatPrice(price)}</Text>
                <FontAwesome name="chevron-right" size={10} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Data note */}
      <View style={styles.dataNote}>
        <FontAwesome name="info-circle" size={12} color="#9ca3af" />
        <Text style={styles.dataNoteText}>
          Prices sourced from the Cyprus Government Fuel Price Observatory.
          Updated daily.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 120 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.8,
  },
  headerSub: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionSub: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // National averages 2x2 grid
  avgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  avgCard: {
    width: '46%',
    marginHorizontal: '2%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  avgCardEmoji: { fontSize: 20, marginBottom: 8 },
  avgCardType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  avgCardPrice: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  avgCardRange: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  avgCardCount: {
    fontSize: 10,
    color: '#D1D5DB',
    fontWeight: '500',
  },

  // District table
  districtTable: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  districtLeft: { width: 90 },
  districtName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  districtCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  districtBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  districtFill: {
    height: '100%',
    borderRadius: 3,
  },
  districtRight: { width: 90, alignItems: 'flex-end' },
  districtAvg: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  districtMinMax: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 1,
  },

  // Top 5
  top5List: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  top5Row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  top5Medal: { fontSize: 20, width: 28 },
  top5Info: { flex: 1 },
  top5Name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  top5Meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  top5PriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  top5Price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.3,
  },

  // Data note
  dataNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 24,
  },
  dataNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
});
