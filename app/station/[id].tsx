import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchStations, fetchPromotions } from '@/services/api';
import { formatPrice, getAveragePrice, getDistrictStats } from '@/utils/fuel';
import { FUEL_TYPE_LABELS } from '@/utils/constants';
import { useFavoritesStore } from '@/stores/favorites';
import { FuelType } from '@/types';

const FUEL_COLORS: Record<string, string> = {
  unleaded95: '#16a34a',
  unleaded98: '#2563eb',
  diesel: '#d97706',
  kerosene: '#7c3aed',
  lpg: '#dc2626',
};

const FUEL_ORDER: FuelType[] = ['unleaded95', 'unleaded98', 'diesel', 'kerosene', 'lpg'];

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 15 * 60 * 1000,
  });

  const { data: allPromotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: fetchPromotions,
    staleTime: 5 * 60 * 1000,
  });

  const station = stations.find((s) => s.id === id);
  const stationPromos = allPromotions.filter((p) => p.stationId === id);

  if (!station) {
    return (
      <View style={styles.centered}>
        <FontAwesome name="exclamation-circle" size={40} color="#d1d5db" />
        <Text style={styles.notFound}>Station not found</Text>
      </View>
    );
  }

  const favorite = isFavorite(station.id);

  // Sort prices in a consistent order
  const sortedPrices = [...station.prices].sort(
    (a, b) => FUEL_ORDER.indexOf(a.fuelType) - FUEL_ORDER.indexOf(b.fuelType)
  );

  const openNavigation = () => {
    const url = Platform.select({
      ios: `maps:?daddr=${station.latitude},${station.longitude}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <FontAwesome name="chevron-left" size={14} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleFavorite(station.id)} hitSlop={12}>
            <FontAwesome
              name={favorite ? 'heart' : 'heart-o'}
              size={22}
              color={favorite ? '#ef4444' : '#d1d5db'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>{station.brand}</Text>
        </View>
        <Text style={styles.name}>{station.name}</Text>

        <View style={styles.locationRow}>
          <FontAwesome name="map-marker" size={13} color="#9ca3af" />
          <Text style={styles.address}>{station.address}</Text>
        </View>
        <Text style={styles.district}>{station.district} District</Text>
      </View>

      {/* ── Fuel prices ────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Fuel Prices</Text>
      <View style={styles.priceCards}>
        {sortedPrices.map((fp) => {
          const color = FUEL_COLORS[fp.fuelType] ?? '#6b7280';
          const nationalAvg = getAveragePrice(stations, fp.fuelType);
          const distStats = getDistrictStats(stations, fp.fuelType, station.district);
          const vsNational =
            nationalAvg != null ? fp.price - nationalAvg : null;
          const vsDistrict =
            distStats != null ? fp.price - distStats.avg : null;
          const isCheap = vsNational != null && vsNational < -0.0005;

          return (
            <View key={fp.fuelType} style={[styles.priceCard, isCheap && styles.priceCardCheap]}>
              <View style={[styles.priceIndicator, { backgroundColor: color }]} />
              <View style={styles.priceInfo}>
                <View style={styles.priceLabelRow}>
                  <Text style={styles.fuelLabel}>{FUEL_TYPE_LABELS[fp.fuelType]}</Text>
                  {isCheap && (
                    <View style={styles.cheapBadge}>
                      <Text style={styles.cheapBadgeText}>Below avg</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.priceUpdated}>
                  {new Date(fp.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {/* Comparison row */}
                <View style={styles.comparisonRow}>
                  {vsNational != null && (
                    <View style={styles.compBadge}>
                      <FontAwesome
                        name={vsNational < 0 ? 'arrow-down' : 'arrow-up'}
                        size={8}
                        color={vsNational < 0 ? '#16a34a' : '#ef4444'}
                      />
                      <Text
                        style={[
                          styles.compText,
                          { color: vsNational < 0 ? '#16a34a' : '#ef4444' },
                        ]}
                      >
                        {' '}€{Math.abs(vsNational).toFixed(3)} vs national
                      </Text>
                    </View>
                  )}
                  {vsDistrict != null && Math.abs(vsDistrict) > 0.0005 && (
                    <View style={styles.compBadge}>
                      <FontAwesome
                        name={vsDistrict < 0 ? 'arrow-down' : 'arrow-up'}
                        size={8}
                        color={vsDistrict < 0 ? '#16a34a' : '#d97706'}
                      />
                      <Text
                        style={[
                          styles.compText,
                          { color: vsDistrict < 0 ? '#16a34a' : '#d97706' },
                        ]}
                      >
                        {' '}€{Math.abs(vsDistrict).toFixed(3)} vs {station.district}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.priceValueBlock}>
                <Text style={[styles.priceValue, { color }]}>
                  {formatPrice(fp.price)}
                </Text>
                <Text style={styles.perLiter}>/L</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Active offers ──────────────────────────────────────── */}
      {stationPromos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active Offers</Text>
          <View style={styles.offersContainer}>
            {stationPromos.map((promo) => (
              <View key={promo.id} style={styles.offerCard}>
                <View style={styles.offerLeft}>
                  <View style={styles.offerDot} />
                </View>
                <View style={styles.offerBody}>
                  <Text style={styles.offerTitle}>{promo.title}</Text>
                  {promo.description ? (
                    <Text style={styles.offerDesc}>{promo.description}</Text>
                  ) : null}
                  <View style={styles.offerMeta}>
                    {promo.badgeText && (
                      <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>{promo.badgeText}</Text>
                      </View>
                    )}
                    {promo.expiresAt && (
                      <Text style={styles.offerExpiry}>
                        Expires {new Date(promo.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.navBtn} onPress={openNavigation} activeOpacity={0.8}>
          <FontAwesome name="location-arrow" size={16} color="#fff" />
          <Text style={styles.navBtnText}>Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(station.id)}
          activeOpacity={0.8}
        >
          <FontAwesome
            name={favorite ? 'heart' : 'heart-o'}
            size={16}
            color={favorite ? '#ef4444' : '#6b7280'}
          />
          <Text style={[styles.favBtnText, favorite && { color: '#ef4444' }]}>
            {favorite ? 'Saved to Favourites' : 'Save Station'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Station info ───────────────────────────────────────── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Station Info</Text>
        <View style={styles.infoRow}>
          <FontAwesome name="map-marker" size={13} color="#9ca3af" style={styles.infoIcon} />
          <Text style={styles.infoText}>{station.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="globe" size={13} color="#9ca3af" style={styles.infoIcon} />
          <Text style={styles.infoText}>{station.district} District, Cyprus</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="tag" size={13} color="#9ca3af" style={styles.infoIcon} />
          <Text style={styles.infoText}>{station.brand}</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="barcode" size={13} color="#9ca3af" style={styles.infoIcon} />
          <Text style={styles.infoText}>Station ID: {station.id}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 50 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFound: { fontSize: 16, color: '#9ca3af' },

  // Header
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  address: { fontSize: 14, color: '#6b7280', flex: 1 },
  district: { fontSize: 13, color: '#9ca3af', marginLeft: 19 },

  // Section titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // Price cards
  priceCards: { paddingHorizontal: 14, gap: 8 },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.4)',
  },
  priceCardCheap: {
    borderColor: 'rgba(22,163,74,0.2)',
    backgroundColor: '#fafffe',
  },
  priceIndicator: {
    width: 4,
    height: 44,
    borderRadius: 2,
    marginRight: 12,
  },
  priceInfo: { flex: 1 },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  fuelLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  cheapBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cheapBadgeText: { fontSize: 9, fontWeight: '700', color: '#16a34a' },
  priceUpdated: { fontSize: 10, color: '#9ca3af', marginBottom: 6 },
  comparisonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compText: { fontSize: 10, fontWeight: '600' },
  priceValueBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 8,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  perLiter: { fontSize: 11, color: '#9ca3af', marginLeft: 2 },

  // Actions
  actions: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  favBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },

  // Info card
  infoCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    gap: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 2, width: 16 },
  infoText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },

  // Offers
  offersContainer: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  offerCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  offerLeft: { paddingTop: 5 },
  offerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  offerBody: { flex: 1, gap: 4 },
  offerTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  offerDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  offerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  offerBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  offerBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  offerExpiry: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
});
