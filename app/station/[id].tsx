import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchStations, fetchPromotions, fetchStationFeatures, logStationEvent } from '@/services/api';
import { supabase } from '@/services/supabase';
import { formatPrice, getAveragePrice, getDistrictStats } from '@/utils/fuel';
import { FUEL_TYPE_LABELS, STATION_FEATURE_LABELS } from '@/utils/constants';
import { useFavoritesStore } from '@/stores/favorites';
import { useAuthStore } from '@/stores/auth';
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
  const { user } = useAuthStore();

  // Price alert modal state
  const [alertModal, setAlertModal] = useState(false);
  const [alertFuel, setAlertFuel] = useState<FuelType>('unleaded95');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);

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

  const { data: features = [] } = useQuery({
    queryKey: ['features', id],
    queryFn: () => fetchStationFeatures(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  const station = stations.find((s) => s.id === id);
  const stationPromos = allPromotions.filter((p) => p.stationId === id);

  // Log view event once on mount
  useEffect(() => {
    if (id) logStationEvent(id, 'view');
  }, [id]);

  if (!station) {
    return (
      <View style={styles.centered}>
        <FontAwesome name="exclamation-circle" size={40} color="#d1d5db" />
        <Text style={styles.notFound}>Station not found</Text>
      </View>
    );
  }

  const favorite = isFavorite(station.id);

  const sortedPrices = [...station.prices].sort(
    (a, b) => FUEL_ORDER.indexOf(a.fuelType) - FUEL_ORDER.indexOf(b.fuelType)
  );

  const openNavigation = () => {
    logStationEvent(station.id, 'directions');
    const url = Platform.select({
      ios: `maps:?daddr=${station.latitude},${station.longitude}`,
      android: `google.navigation:q=${station.latitude},${station.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleFavorite = () => {
    if (!isFavorite(station.id)) logStationEvent(station.id, 'favorite');
    toggleFavorite(station.id);
  };

  const openAlertModal = (fuelType: FuelType, currentPrice: number) => {
    if (!user) {
      Alert.alert('Sign in required', 'Create a free account to set price alerts.');
      return;
    }
    setAlertFuel(fuelType);
    setAlertPrice((currentPrice - 0.01).toFixed(3));
    setAlertModal(true);
  };

  const saveAlert = async () => {
    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid target price.');
      return;
    }
    setAlertSaving(true);
    const { error } = await supabase.from('price_alerts').upsert({
      user_id: user!.id,
      station_id: station.id,
      fuel_type: alertFuel,
      target_price: price,
      is_active: true,
    }, { onConflict: 'user_id,station_id,fuel_type' });
    setAlertSaving(false);
    setAlertModal(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Alert set ✓', `We'll notify you when ${FUEL_TYPE_LABELS[alertFuel]} drops below €${price.toFixed(3)} here.`);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
              <FontAwesome name="chevron-left" size={14} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavorite} hitSlop={12}>
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

        {/* ── Station features ───────────────────────────────────── */}
        {features.length > 0 && (
          <View style={styles.featuresRow}>
            {features.map((f) => {
              const meta = STATION_FEATURE_LABELS[f];
              if (!meta) return null;
              return (
                <View key={f} style={styles.featureChip}>
                  <Text style={styles.featureEmoji}>{meta.emoji}</Text>
                  <Text style={styles.featureLabel}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Fuel prices ────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Fuel Prices</Text>
        <View style={styles.priceCards}>
          {sortedPrices.map((fp) => {
            const color = FUEL_COLORS[fp.fuelType] ?? '#6b7280';
            const nationalAvg = getAveragePrice(stations, fp.fuelType);
            const distStats = getDistrictStats(stations, fp.fuelType, station.district);
            const vsNational = nationalAvg != null ? fp.price - nationalAvg : null;
            const vsDistrict = distStats != null ? fp.price - distStats.avg : null;
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
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                  <View style={styles.comparisonRow}>
                    {vsNational != null && (
                      <View style={styles.compBadge}>
                        <FontAwesome
                          name={vsNational < 0 ? 'arrow-down' : 'arrow-up'}
                          size={8}
                          color={vsNational < 0 ? '#16a34a' : '#ef4444'}
                        />
                        <Text style={[styles.compText, { color: vsNational < 0 ? '#16a34a' : '#ef4444' }]}>
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
                        <Text style={[styles.compText, { color: vsDistrict < 0 ? '#16a34a' : '#d97706' }]}>
                          {' '}€{Math.abs(vsDistrict).toFixed(3)} vs {station.district}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.priceValueBlock}>
                  <Text style={[styles.priceValue, { color }]}>{formatPrice(fp.price)}</Text>
                  <Text style={styles.perLiter}>/L</Text>
                  <TouchableOpacity
                    style={styles.alertBtn}
                    onPress={() => openAlertModal(fp.fuelType, fp.price)}
                    hitSlop={8}
                  >
                    <FontAwesome name="bell-o" size={13} color="#9ca3af" />
                  </TouchableOpacity>
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

          <TouchableOpacity style={styles.favBtn} onPress={handleFavorite} activeOpacity={0.8}>
            <FontAwesome
              name={favorite ? 'heart' : 'heart-o'}
              size={16}
              color={favorite ? '#ef4444' : '#6b7280'}
            />
            <Text style={[styles.favBtnText, favorite && { color: '#ef4444' }]}>
              {favorite ? 'Saved' : 'Save Station'}
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
        </View>
      </ScrollView>

      {/* ── Price alert modal ──────────────────────────────────── */}
      <Modal visible={alertModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Price Alert</Text>
            <Text style={styles.modalSub}>
              Get notified when {FUEL_TYPE_LABELS[alertFuel]} drops below your target price at this station.
            </Text>

            {/* Fuel type picker */}
            <View style={styles.modalFuelRow}>
              {sortedPrices.map((fp) => (
                <TouchableOpacity
                  key={fp.fuelType}
                  style={[
                    styles.modalFuelChip,
                    alertFuel === fp.fuelType && styles.modalFuelChipActive,
                  ]}
                  onPress={() => {
                    setAlertFuel(fp.fuelType);
                    setAlertPrice((fp.price - 0.01).toFixed(3));
                  }}
                >
                  <Text style={[
                    styles.modalFuelLabel,
                    alertFuel === fp.fuelType && styles.modalFuelLabelActive,
                  ]}>
                    {FUEL_TYPE_LABELS[fp.fuelType]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalInputLabel}>Notify me when price is below (€/L)</Text>
            <TextInput
              style={styles.modalInput}
              value={alertPrice}
              onChangeText={setAlertPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 1.450"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAlertModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={saveAlert}
                disabled={alertSaving}
              >
                <Text style={styles.modalSaveText}>
                  {alertSaving ? 'Saving…' : 'Set Alert'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 50 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
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
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  brandText: { fontSize: 11, fontWeight: '800', color: '#16a34a', letterSpacing: 0.5 },
  name: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.5, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 2 },
  address: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  district: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginTop: 2 },

  // Features
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featureEmoji: { fontSize: 14 },
  featureLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },

  // Price cards
  priceCards: { gap: 1, marginHorizontal: 16 },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    marginBottom: 8,
  },
  priceCardCheap: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  priceIndicator: { width: 4, height: 40, borderRadius: 2, flexShrink: 0 },
  priceInfo: { flex: 1, gap: 3 },
  priceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fuelLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cheapBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cheapBadgeText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  priceUpdated: { fontSize: 11, color: '#9ca3af' },
  comparisonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  compBadge: { flexDirection: 'row', alignItems: 'center' },
  compText: { fontSize: 11, fontWeight: '600' },
  priceValueBlock: { alignItems: 'flex-end', gap: 4 },
  priceValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  perLiter: { fontSize: 11, color: '#9ca3af', marginTop: -4 },
  alertBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },

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
  offerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
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

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 20 },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 14,
  },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  favBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },

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
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 2, width: 16 },
  infoText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },

  // Price alert modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: -0.4 },
  modalSub: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginTop: -6 },
  modalFuelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalFuelChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modalFuelChipActive: { borderColor: '#111827', backgroundColor: '#fff' },
  modalFuelLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modalFuelLabelActive: { color: '#111827' },
  modalInputLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: -6 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  modalSave: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
