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

import { MarketplaceCard } from '@/components/station/MarketplaceCard';
import { fetchStations } from '@/services/api';
import { FUEL_TYPE_LABELS } from '@/utils/constants';
import {
  getCheapestPrice,
  getAveragePrice,
  getMinPrice,
  sortStationsByPrice,
  formatPrice,
} from '@/utils/fuel';
import { FuelType } from '@/types';

const FUEL_TYPES: FuelType[] = ['unleaded95', 'unleaded98', 'diesel', 'kerosene'];

const FUEL_COLORS: Record<FuelType, string> = {
  unleaded95: '#16a34a',
  unleaded98: '#2563eb',
  diesel:     '#d97706',
  kerosene:   '#7c3aed',
  lpg:        '#dc2626',
};

const FUEL_EMOJIS: Record<FuelType, string> = {
  unleaded95: '⛽',
  unleaded98: '⛽',
  diesel:     '🚛',
  kerosene:   '🔥',
  lpg:        '💨',
};

// Placeholder partner promotions (will be replaced by real DB data)
const PARTNER_PROMOS = [
  {
    id: 'promo1',
    brand: 'EKO',
    title: 'EKO Extra Points Weekend',
    desc: 'Earn 3x loyalty points on all purchases this weekend',
    badge: '3× Points',
    color: '#006B35',
    expires: 'Sun 23:59',
  },
  {
    id: 'promo2',
    brand: 'PETROLINA',
    title: 'Free Car Wash',
    desc: 'Fill up 30L or more and get a free exterior wash',
    badge: 'Free wash',
    color: '#003087',
    expires: 'Limited offer',
  },
  {
    id: 'promo3',
    brand: 'SHELL',
    title: 'Shell Café Combo',
    desc: 'Buy any fuel and get 20% off your coffee at Shell Café',
    badge: '20% off',
    color: '#C8102E',
    expires: 'Ongoing',
  },
];

export default function DealsScreen() {
  const router = useRouter();
  const [selectedFuel, setSelectedFuel] = useState<FuelType>('unleaded95');

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 15 * 60 * 1000,
  });

  const avgPrice = useMemo(
    () => getAveragePrice(stations, selectedFuel),
    [stations, selectedFuel]
  );

  // Price deals per fuel type: stations beating avg by thresholds
  const dealTiers = useMemo(
    () =>
      FUEL_TYPES.map((ft) => {
        const avg = getAveragePrice(stations, ft);
        const min = getMinPrice(stations, ft);
        if (!avg || !min) return { fuelType: ft, deals: [], avg, min };
        const deals = sortStationsByPrice(
          stations.filter((s) => {
            const p = getCheapestPrice(s, ft);
            return p != null && avg - p > 0.015;
          }),
          ft
        ).slice(0, 6);
        return { fuelType: ft, deals, avg, min };
      }),
    [stations]
  );

  // Deals for selected fuel type (for the main horizontal scroll)
  const currentDeals = useMemo(
    () => dealTiers.find((d) => d.fuelType === selectedFuel),
    [dealTiers, selectedFuel]
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Deals</Text>
        <Text style={styles.headerSub}>
          Stations competing for your business right now
        </Text>
      </View>

      {/* ── Partner promotions ──────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🤝 Partner Offers</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Partner program launching soon</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoScroll}
        >
          {PARTNER_PROMOS.map((promo) => (
            <TouchableOpacity
              key={promo.id}
              style={[styles.promoCard, { backgroundColor: promo.color }]}
              activeOpacity={0.85}
            >
              {/* Badge */}
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>{promo.badge}</Text>
              </View>
              <View style={styles.promoBrandRow}>
                <View style={styles.promoBrandCircle}>
                  <Text style={styles.promoBrandInitials}>
                    {promo.brand.slice(0, 2)}
                  </Text>
                </View>
                <Text style={styles.promoBrandName}>{promo.brand}</Text>
              </View>
              <Text style={styles.promoTitle}>{promo.title}</Text>
              <Text style={styles.promoDesc}>{promo.desc}</Text>
              <View style={styles.promoFooter}>
                <FontAwesome name="clock-o" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.promoExpires}> {promo.expires}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Fuel type switcher ──────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Price Deals by Fuel</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fuelTabs}
        >
          {FUEL_TYPES.map((ft) => {
            const tier = dealTiers.find((d) => d.fuelType === ft);
            const color = FUEL_COLORS[ft];
            const isActive = selectedFuel === ft;
            return (
              <TouchableOpacity
                key={ft}
                style={[
                  styles.fuelTab,
                  isActive && { borderColor: color, backgroundColor: color + '12' },
                ]}
                onPress={() => setSelectedFuel(ft)}
                activeOpacity={0.7}
              >
                <Text style={styles.fuelTabEmoji}>{FUEL_EMOJIS[ft]}</Text>
                <Text style={[styles.fuelTabLabel, isActive && { color }]}>
                  {FUEL_TYPE_LABELS[ft]}
                </Text>
                {tier?.deals && tier.deals.length > 0 && (
                  <View style={[styles.fuelTabBadge, { backgroundColor: color }]}>
                    <Text style={styles.fuelTabBadgeText}>{tier.deals.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Market context for selected fuel */}
        {currentDeals && currentDeals.avg != null && currentDeals.min != null && (
          <View style={styles.marketContext}>
            <View style={styles.marketContextStat}>
              <Text style={styles.marketContextLabel}>National avg</Text>
              <Text style={styles.marketContextValue}>
                {formatPrice(currentDeals.avg)}
              </Text>
            </View>
            <View style={styles.marketContextDivider} />
            <View style={styles.marketContextStat}>
              <Text style={styles.marketContextLabel}>Best price</Text>
              <Text style={[styles.marketContextValue, { color: '#16a34a' }]}>
                {formatPrice(currentDeals.min)}
              </Text>
            </View>
            <View style={styles.marketContextDivider} />
            <View style={styles.marketContextStat}>
              <Text style={styles.marketContextLabel}>Stations with deals</Text>
              <Text style={[styles.marketContextValue, { color: FUEL_COLORS[selectedFuel] }]}>
                {currentDeals.deals.length}
              </Text>
            </View>
          </View>
        )}

        {/* Deal cards */}
        {currentDeals && currentDeals.deals.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardScroll}
          >
            {currentDeals.deals.map((station) => (
              <MarketplaceCard
                key={station.id}
                station={station}
                fuelType={selectedFuel}
                avgPrice={currentDeals.avg}
                isDeal
                onPress={() => router.push(`/station/${station.id}`)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noDealsCard}>
            <Text style={styles.noDealsEmoji}>😊</Text>
            <Text style={styles.noDealsTitle}>Prices are consistent</Text>
            <Text style={styles.noDealsDesc}>
              No station is significantly cheaper than the average for{' '}
              {FUEL_TYPE_LABELS[selectedFuel]} right now
            </Text>
          </View>
        )}
      </View>

      {/* ── All-fuel cheapest stations ──────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Cheapest across all fuels</Text>
        <View style={styles.allFuelTable}>
          {dealTiers.map(({ fuelType, min, avg }) => {
            if (!min || !avg) return null;
            const color = FUEL_COLORS[fuelType];
            const saving = avg - min;
            return (
              <View key={fuelType} style={styles.allFuelRow}>
                <Text style={styles.allFuelEmoji}>{FUEL_EMOJIS[fuelType]}</Text>
                <Text style={styles.allFuelLabel}>{FUEL_TYPE_LABELS[fuelType]}</Text>
                <View style={styles.allFuelRight}>
                  <Text style={[styles.allFuelPrice, { color }]}>{formatPrice(min)}</Text>
                  {saving > 0.001 && (
                    <Text style={styles.allFuelSaving}>
                      Save {formatPrice(saving)} vs avg
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── CTA to become partner ───────────────────────────── */}
      <View style={styles.partnerBanner}>
        <Text style={styles.partnerBannerEmoji}>🚀</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.partnerBannerTitle}>
            Attract more customers
          </Text>
          <Text style={styles.partnerBannerDesc}>
            Station operators: post deals, earn reviews, get featured
          </Text>
        </View>
        <TouchableOpacity style={styles.partnerBannerBtn}>
          <Text style={styles.partnerBannerBtnText}>Learn more</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 110 },

  header: { padding: 20, paddingTop: 12 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.8,
  },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  section: { marginTop: 8, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  comingSoonText: { fontSize: 10, fontWeight: '700', color: '#92400e' },

  // Partner promos
  promoScroll: { paddingLeft: 20, paddingRight: 8 },
  promoCard: {
    width: 220,
    borderRadius: 20,
    padding: 18,
    marginRight: 12,
    overflow: 'hidden',
  },
  promoBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FCD34D',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  promoBadgeText: { fontSize: 11, fontWeight: '900', color: '#78350F' },
  promoBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  promoBrandCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBrandInitials: { fontSize: 12, fontWeight: '900', color: '#fff' },
  promoBrandName: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  promoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 17,
    marginBottom: 14,
  },
  promoFooter: { flexDirection: 'row', alignItems: 'center' },
  promoExpires: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  // Fuel tabs
  fuelTabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  fuelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  fuelTabEmoji: { fontSize: 14 },
  fuelTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  fuelTabBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  fuelTabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Market context
  marketContext: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    marginBottom: 14,
  },
  marketContextStat: { flex: 1, alignItems: 'center' },
  marketContextLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  marketContextValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  marketContextDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 8,
  },

  cardScroll: { paddingLeft: 20, paddingRight: 8 },

  // No deals
  noDealsCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    gap: 8,
  },
  noDealsEmoji: { fontSize: 32 },
  noDealsTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  noDealsDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  // All fuel table
  allFuelTable: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  allFuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  allFuelEmoji: { fontSize: 18, width: 26 },
  allFuelLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  allFuelRight: { alignItems: 'flex-end' },
  allFuelPrice: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  allFuelSaving: { fontSize: 10, color: '#16a34a', fontWeight: '600', marginTop: 2 },

  // Partner banner
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
  },
  partnerBannerEmoji: { fontSize: 28 },
  partnerBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  partnerBannerDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  partnerBannerBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  partnerBannerBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
