import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketplaceCard } from '@/components/station/MarketplaceCard';
import { StationCard } from '@/components/station/StationCard';
import { fetchStations } from '@/services/api';
import { getCurrentLocation } from '@/services/location';
import { CYPRUS_DISTRICTS, FUEL_TYPE_LABELS } from '@/utils/constants';
import {
  getCheapestPrice,
  getAveragePrice,
  getMinPrice,
  sortStationsByPrice,
  formatPrice,
} from '@/utils/fuel';
import { addDistances } from '@/utils/geo';
import { FuelType, Station } from '@/types';
import { useStationsStore } from '@/stores/stations';

const FUEL_PILLS: { type: FuelType; short: string; emoji: string }[] = [
  { type: 'unleaded95', short: 'Unleaded 95', emoji: '⛽' },
  { type: 'unleaded98', short: 'Unleaded 98', emoji: '⛽' },
  { type: 'diesel',     short: 'Diesel',      emoji: '🚛' },
  { type: 'kerosene',  short: 'Kerosene',    emoji: '🔥' },
];

const DISTRICT_ICONS: Record<string, string> = {
  Nicosia:   '🏛️',
  Limassol:  '🌊',
  Larnaca:   '✈️',
  Paphos:    '🏺',
  Famagusta: '🏰',
  Kyrenia:   '⚓',
};

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFuel, setSelectedFuel] = useState<FuelType>('unleaded95');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  const { setSelectedFuelType } = useStationsStore();

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

  const avgPrice = useMemo(
    () => getAveragePrice(stations, selectedFuel),
    [stations, selectedFuel]
  );
  const minPrice = useMemo(
    () => getMinPrice(stations, selectedFuel),
    [stations, selectedFuel]
  );

  // Top brands sorted by station count
  const topBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    stations.forEach((s) => {
      if (s.brand) counts[s.brand] = (counts[s.brand] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([b]) => b);
  }, [stations]);

  const filteredStations = useMemo(
    () => (selectedBrand ? stations.filter((s) => s.brand === selectedBrand) : stations),
    [stations, selectedBrand]
  );

  // Hot deals: >€0.02 below national average
  const hotDeals = useMemo(() => {
    if (!avgPrice) return [];
    return sortStationsByPrice(
      filteredStations.filter((s) => {
        const p = getCheapestPrice(s, selectedFuel);
        return p != null && avgPrice - p > 0.02;
      }),
      selectedFuel
    ).slice(0, 8);
  }, [filteredStations, selectedFuel, avgPrice]);

  // Cheapest stations (with distance if location available)
  const cheapestNearby = useMemo(() => {
    let source: Station[] = filteredStations.filter(
      (s) => getCheapestPrice(s, selectedFuel) !== null
    );
    if (userLat != null && userLon != null) {
      source = addDistances(source, userLat, userLon) as Station[];
    }
    return sortStationsByPrice(source, selectedFuel).slice(0, 8);
  }, [filteredStations, selectedFuel, userLat, userLon]);

  // District stats
  const districtData = useMemo(
    () =>
      CYPRUS_DISTRICTS.map((d) => {
        const prices = stations
          .filter((s) => s.district === d)
          .map((s) => getCheapestPrice(s, selectedFuel))
          .filter((p): p is number => p !== null);
        return {
          name: d,
          count: prices.length,
          min: prices.length > 0 ? Math.min(...prices) : null,
        };
      }).filter((d) => d.count > 0),
    [stations, selectedFuel]
  );

  // Search results
  const searchResults = useMemo(() => {
    if (searchText.length < 2) return [];
    const q = searchText.toLowerCase();
    return stations
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brand.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [stations, searchText]);

  const handleFuelSelect = (ft: FuelType) => {
    setSelectedFuel(ft);
    setSelectedFuelType(ft);
  };

  // ── Search overlay ──────────────────────────────────────────────
  if (searchFocused || searchText.length > 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.searchHeader}>
          <TouchableOpacity
            onPress={() => { setSearchText(''); setSearchFocused(false); }}
            style={styles.searchBackBtn}
          >
            <FontAwesome name="arrow-left" size={16} color="#374151" />
          </TouchableOpacity>
          <View style={styles.searchBarActive}>
            <FontAwesome name="search" size={14} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stations, brands, districts…"
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>
        </View>
        {searchResults.length === 0 && searchText.length > 1 ? (
          <View style={styles.searchEmpty}>
            <Text style={styles.searchEmptyIcon}>🔍</Text>
            <Text style={styles.searchEmptyTitle}>No results for "{searchText}"</Text>
            <Text style={styles.searchEmptyDesc}>Try a brand name or district</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StationCard
                station={item}
                selectedFuelType={selectedFuel}
                onPress={(s) => {
                  setSearchFocused(false);
                  setSearchText('');
                  router.push(`/station/${s.id}`);
                }}
                avgPrice={avgPrice}
              />
            )}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          />
        )}
      </View>
    );
  }

  // ── Main discover feed ──────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Hero header ───────────────────────────────────────── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.locationRow}>
              <FontAwesome name="map-marker" size={12} color="#4ade80" />
              <Text style={styles.locationText}>Cyprus · {stations.length} stations</Text>
            </View>
            <Text style={styles.heroTitle}>Find your{'\n'}best deal today</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeLabel}>Cheapest</Text>
            <Text style={styles.heroBadgeNum}>
              {minPrice != null ? formatPrice(minPrice) : '—'}
            </Text>
            <Text style={styles.heroBadgeSub}>Unleaded 95</Text>
          </View>
        </View>

        {/* Price strip */}
        {minPrice != null && avgPrice != null && (
          <View style={styles.priceStrip}>
            <View style={styles.priceStripItem}>
              <Text style={styles.priceStripLabel}>Cheapest</Text>
              <Text style={styles.priceStripValue}>{formatPrice(minPrice)}</Text>
            </View>
            <View style={styles.priceStripDivider} />
            <View style={styles.priceStripItem}>
              <Text style={styles.priceStripLabel}>National avg</Text>
              <Text style={[styles.priceStripValue, { color: 'rgba(255,255,255,0.65)' }]}>
                {formatPrice(avgPrice)}
              </Text>
            </View>
            <View style={styles.priceStripDivider} />
            <View style={styles.priceStripItem}>
              <Text style={styles.priceStripLabel}>Max saving</Text>
              <Text style={[styles.priceStripValue, { color: '#FCD34D' }]}>
                {formatPrice(avgPrice - minPrice)}
              </Text>
            </View>
          </View>
        )}

        {/* Search tap target */}
        <TouchableOpacity
          style={styles.searchTap}
          onPress={() => setSearchFocused(true)}
          activeOpacity={0.9}
        >
          <FontAwesome name="search" size={14} color="#9CA3AF" />
          <Text style={styles.searchTapText}>Search stations, brands, districts…</Text>
        </TouchableOpacity>
      </View>

      {/* ── Fuel type pills ───────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fuelPills}
      >
        {FUEL_PILLS.map(({ type, short, emoji }) => {
          const fp = getMinPrice(stations, type);
          const isActive = selectedFuel === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.fuelPill, isActive && styles.fuelPillActive]}
              onPress={() => handleFuelSelect(type)}
              activeOpacity={0.75}
            >
              <Text style={styles.fuelPillEmoji}>{emoji}</Text>
              <Text style={[styles.fuelPillLabel, isActive && styles.fuelPillLabelActive]}>
                {short}
              </Text>
              {fp != null && (
                <View style={[styles.fuelPillPriceBadge, isActive && styles.fuelPillPriceBadgeActive]}>
                  <Text style={[styles.fuelPillPriceText, isActive && { color: '#16a34a' }]}>
                    from {formatPrice(fp)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Brand filter ─────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.brandRow}
      >
        <TouchableOpacity
          style={[styles.brandChip, selectedBrand == null && styles.brandChipActive]}
          onPress={() => setSelectedBrand(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.brandChipText, selectedBrand == null && styles.brandChipTextActive]}>
            All brands
          </Text>
        </TouchableOpacity>
        {topBrands.map((brand) => (
          <TouchableOpacity
            key={brand}
            style={[styles.brandChip, selectedBrand === brand && styles.brandChipActive]}
            onPress={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
            activeOpacity={0.7}
          >
            <Text style={[styles.brandChipText, selectedBrand === brand && styles.brandChipTextActive]}>
              {brand}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Hot Deals ─────────────────────────────────────────── */}
      {hotDeals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Text style={styles.sectionEmoji}>🔥</Text>
              <View>
                <Text style={styles.sectionTitle}>Hot Deals</Text>
                <Text style={styles.sectionSub}>Stations beating the average by €0.02+</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/deals')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
            {hotDeals.map((station) => (
              <MarketplaceCard
                key={station.id}
                station={station}
                fuelType={selectedFuel}
                avgPrice={avgPrice}
                isDeal
                onPress={() => router.push(`/station/${station.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Cheapest Now ─────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Text style={styles.sectionEmoji}>⚡</Text>
            <View>
              <Text style={styles.sectionTitle}>Cheapest Now</Text>
              <Text style={styles.sectionSub}>{FUEL_TYPE_LABELS[selectedFuel]}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
            <Text style={styles.seeAll}>Map →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
          {cheapestNearby.map((station) => (
            <MarketplaceCard
              key={station.id}
              station={station}
              fuelType={selectedFuel}
              avgPrice={avgPrice}
              onPress={() => router.push(`/station/${station.id}`)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Districts ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Text style={styles.sectionEmoji}>🗺️</Text>
            <View>
              <Text style={styles.sectionTitle}>Browse by District</Text>
              <Text style={styles.sectionSub}>Tap to explore on map</Text>
            </View>
          </View>
        </View>
        <View style={styles.districtGrid}>
          {districtData.map((d) => (
            <TouchableOpacity
              key={d.name}
              style={styles.districtCard}
              onPress={() => router.push('/(tabs)/map')}
              activeOpacity={0.75}
            >
              <Text style={styles.districtIcon}>{DISTRICT_ICONS[d.name] ?? '📍'}</Text>
              <Text style={styles.districtName}>{d.name}</Text>
              <Text style={styles.districtCount}>{d.count} stations</Text>
              {d.min != null && (
                <Text style={styles.districtMin}>from {formatPrice(d.min)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Partner CTA ───────────────────────────────────────── */}
      <TouchableOpacity style={styles.partnerCTA} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={styles.partnerCTATitle}>Own a fuel station?</Text>
          <Text style={styles.partnerCTASub}>
            Join Lepidus and compete for customers with live deals
          </Text>
        </View>
        <View style={styles.partnerCTABtn}>
          <Text style={styles.partnerCTABtnText}>Join →</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 110 },

  // Hero
  hero: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ade80',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 34,
  },
  heroBadge: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: 90,
  },
  heroBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroBadgeNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroBadgeSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  priceStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  priceStripItem: { flex: 1, alignItems: 'center' },
  priceStripLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  priceStripValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  priceStripDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 4,
  },
  searchTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchTapText: { fontSize: 14, color: '#9CA3AF' },

  // Search overlay
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  searchBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  searchEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  searchEmptyIcon: { fontSize: 40 },
  searchEmptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  searchEmptyDesc: { fontSize: 14, color: '#9CA3AF' },

  // Fuel pills
  fuelPills: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  fuelPill: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(229,231,235,0.5)',
    minWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fuelPillActive: {
    borderColor: '#16a34a',
    backgroundColor: '#F0FDF4',
  },
  fuelPillEmoji: { fontSize: 20, marginBottom: 5 },
  fuelPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 5,
    letterSpacing: -0.1,
  },
  fuelPillLabelActive: { color: '#15803d' },
  fuelPillPriceBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  fuelPillPriceBadgeActive: { backgroundColor: '#DCFCE7' },
  fuelPillPriceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Brand filter
  brandRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  brandChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(229,231,235,0.6)',
  },
  brandChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  brandChipText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  brandChipTextActive: { color: '#fff' },

  // Sections
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  sectionSub: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 1 },
  seeAll: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  cardScroll: { paddingLeft: 20, paddingRight: 8 },

  // Districts
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
  },
  districtCard: {
    width: '29%',
    marginHorizontal: '1.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  districtIcon: { fontSize: 22, marginBottom: 6 },
  districtName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  districtCount: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginBottom: 5 },
  districtMin: { fontSize: 12, fontWeight: '800', color: '#16a34a', letterSpacing: -0.2 },

  // Partner CTA
  partnerCTA: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  partnerCTATitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  partnerCTASub: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  partnerCTABtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexShrink: 0,
  },
  partnerCTABtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
