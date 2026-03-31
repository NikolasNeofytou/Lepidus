import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MapView, Marker } from '@/components/MapViewAdapter';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FuelTypeSelector } from '@/components/station/FuelTypeSelector';
import { useStationsStore } from '@/stores/stations';
import { fetchStations } from '@/services/api';
import { getCurrentLocation } from '@/services/location';
import { CYPRUS_REGION, FUEL_TYPE_LABELS } from '@/utils/constants';
import {
  getCheapestPrice,
  formatPrice,
  getMinPrice,
  getMaxPrice,
  getPriceTier,
} from '@/utils/fuel';
import { addDistances, formatDistance } from '@/utils/geo';
import { Station } from '@/types';

const TIER_COLORS = {
  cheap: '#16a34a',
  mid: '#d97706',
  expensive: '#ef4444',
};

// Airbnb-style price bubble marker
const PriceMarker = React.memo(({
  price,
  tier,
}: {
  price: number;
  tier: 'cheap' | 'mid' | 'expensive';
}) => {
  const bg = TIER_COLORS[tier];
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.bubble, { backgroundColor: bg }]}>
        <Text style={styles.bubbleText}>€{price.toFixed(3)}</Text>
      </View>
      <View style={[styles.bubbleTail, { borderTopColor: bg }]} />
    </View>
  );
});

export default function MapScreen() {
  const mapRef = useRef<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mapReady, setMapReady] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  const { selectedFuelType, setSelectedFuelType, setStations } = useStationsStore();

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    if (stations.length > 0) setStations(stations);
  }, [stations]);

  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          setUserLat(loc.latitude);
          setUserLon(loc.longitude);
          if (mapReady && mapRef.current) {
            mapRef.current.animateToRegion({
              ...loc,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            });
          }
        }
      } catch {}
    })();
  }, [mapReady]);

  const visibleStations = useMemo(
    () => stations.filter((s) => getCheapestPrice(s, selectedFuelType) !== null),
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

  // Cheapest station overall for "Best Deal" card
  const bestStation = useMemo(() => {
    if (visibleStations.length === 0) return null;
    return [...visibleStations].sort(
      (a, b) =>
        (getCheapestPrice(a, selectedFuelType) ?? Infinity) -
        (getCheapestPrice(b, selectedFuelType) ?? Infinity)
    )[0];
  }, [visibleStations, selectedFuelType]);

  const selectedPrice = selectedStation
    ? getCheapestPrice(selectedStation, selectedFuelType)
    : null;
  const selectedDist =
    selectedStation && userLat != null && userLon != null
      ? addDistances([selectedStation], userLat, userLon)[0].distance
      : null;
  const bestPrice = bestStation ? getCheapestPrice(bestStation, selectedFuelType) : null;

  const centerOnUser = async () => {
    try {
      const loc = await getCurrentLocation();
      if (loc && mapRef.current) {
        mapRef.current.animateToRegion({ ...loc, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      }
    } catch {}
  };

  // Layout: floating tab bar sits ~80pt from bottom on iOS, 68 on Android
  const TAB_BAR_H = Platform.OS === 'ios' ? 80 : 68;
  const cardBottom = insets.bottom + TAB_BAR_H + 8;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={CYPRUS_REGION}
        showsUserLocation
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelectedStation(null)}
      >
        {visibleStations.map((station) => {
          const price = getCheapestPrice(station, selectedFuelType)!;
          const tier =
            minPrice != null && maxPrice != null
              ? getPriceTier(price, minPrice, maxPrice)
              : 'mid';
          return (
            <Marker
              key={station.id}
              coordinate={{ latitude: station.latitude, longitude: station.longitude }}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedStation(station);
              }}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              <PriceMarker price={price} tier={tier} />
            </Marker>
          );
        })}
      </MapView>

      {/* ── Top floating bar ─────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarHeader}>
          <Text style={styles.logoText}>Lepidus</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{visibleStations.length} stations</Text>
          </View>
        </View>
        <FuelTypeSelector
          selected={selectedFuelType}
          onSelect={(ft) => {
            setSelectedFuelType(ft);
            setSelectedStation(null);
          }}
        />
        {/* Price tier legend */}
        <View style={styles.legend}>
          {(['cheap', 'mid', 'expensive'] as const).map((tier) => (
            <View key={tier} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TIER_COLORS[tier] }]} />
              <Text style={styles.legendLabel}>
                {tier === 'cheap' ? 'Cheap' : tier === 'mid' ? 'Average' : 'Pricey'}
              </Text>
            </View>
          ))}
          {minPrice != null && maxPrice != null && (
            <Text style={styles.legendRange}>
              {formatPrice(minPrice)} – {formatPrice(maxPrice)}
            </Text>
          )}
        </View>
      </View>

      {/* ── Locate FAB ───────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: cardBottom + 16 }]}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <FontAwesome name="crosshairs" size={18} color="#111827" />
      </TouchableOpacity>

      {/* ── Selected station panel ───────────────────────────────── */}
      {selectedStation != null && selectedPrice != null && (
        <View style={[styles.bottomCard, { bottom: cardBottom }]}>
          <View style={styles.bottomCardRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.brandTag}>
                <Text style={styles.brandTagText}>{selectedStation.brand}</Text>
              </View>
              <Text style={styles.bottomCardName} numberOfLines={1}>
                {selectedStation.name}
              </Text>
              <Text style={styles.bottomCardMeta}>
                {selectedStation.district}
                {selectedDist != null ? ` · ${formatDistance(selectedDist)}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.bottomCardPrice}>{formatPrice(selectedPrice)}</Text>
              <Text style={styles.bottomCardUnit}>per litre</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push(`/station/${selectedStation.id}`)}
            activeOpacity={0.8}
          >
            <FontAwesome name="location-arrow" size={14} color="#fff" />
            <Text style={styles.viewBtnText}>View Station Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Best Deal banner (when nothing is selected) ──────────── */}
      {selectedStation == null && bestStation != null && bestPrice != null && (
        <TouchableOpacity
          style={[styles.bestDealCard, { bottom: cardBottom }]}
          onPress={() => router.push(`/station/${bestStation.id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.bestDealEmoji}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bestDealLabel}>
              Best Deal · {FUEL_TYPE_LABELS[selectedFuelType]}
            </Text>
            <Text style={styles.bestDealName} numberOfLines={1}>
              {bestStation.name}
            </Text>
          </View>
          <View style={styles.bestDealPriceRow}>
            <Text style={styles.bestDealPrice}>{formatPrice(bestPrice)}</Text>
            <Text style={styles.bestDealUnit}>/L</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#9ca3af" />
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color="#16a34a" />
          <Text style={styles.loadingText}>Loading stations…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Price bubbles
  bubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
  },
  topBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  countPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  countText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  legendRange: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Selected station bottom card
  bottomCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.4)',
  },
  bottomCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  brandTagText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  bottomCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  bottomCardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  bottomCardPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  bottomCardUnit: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 2 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Best deal card
  bestDealCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    gap: 10,
  },
  bestDealEmoji: { fontSize: 22 },
  bestDealLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  bestDealName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  bestDealPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  bestDealPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  bestDealUnit: { fontSize: 12, color: '#9ca3af' },

  // Loading
  loadingPill: {
    position: 'absolute',
    top: 200,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: { fontSize: 13, color: '#374151', fontWeight: '500' },
});
