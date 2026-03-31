import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { fetchStations } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { getCheapestPrice, formatPrice } from '@/utils/fuel';
import { FUEL_TYPE_LABELS } from '@/utils/constants';
import { FuelType } from '@/types';

const FUEL_TYPES: FuelType[] = ['unleaded95', 'unleaded98', 'diesel', 'kerosene'];

const LOYALTY_TIERS = [
  { name: 'Bronze', min: 0,    max: 499,  color: '#cd7c2f', emoji: '🥉' },
  { name: 'Silver', min: 500,  max: 1999, color: '#94a3b8', emoji: '🥈' },
  { name: 'Gold',   min: 2000, max: Infinity, color: '#f59e0b', emoji: '🥇' },
];

function getLoyaltyTier(points: number) {
  return LOYALTY_TIERS.find((t) => points >= t.min && points <= t.max) ?? LOYALTY_TIERS[0];
}

export default function ProfileScreen() {
  const router = useRouter();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const { defaultFuelType, setDefaultFuelType } = useSettingsStore();
  const { user, profile, signOut } = useAuthStore();

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 15 * 60 * 1000,
  });

  const favoriteStations = useMemo(
    () => stations.filter((s) => favorites.includes(s.id)),
    [stations, favorites]
  );

  const POINTS = profile?.loyalty_points ?? 0;
  const tier = getLoyaltyTier(POINTS);
  const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1];
  const progressToNext = nextTier
    ? Math.min((POINTS - tier.min) / (nextTier.min - tier.min), 1)
    : 1;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* ── Loyalty card ───────────────────────────────────── */}
      <View style={[styles.loyaltyCard, { backgroundColor: tier.color }]}>
        <View style={styles.loyaltyTop}>
          <View>
            <Text style={styles.loyaltyTierLabel}>Lepidus Member</Text>
            <View style={styles.loyaltyTierRow}>
              <Text style={styles.loyaltyTierEmoji}>{tier.emoji}</Text>
              <Text style={styles.loyaltyTierName}>{tier.name}</Text>
            </View>
          </View>
          <View style={styles.loyaltyPointsBox}>
            <Text style={styles.loyaltyPointsNum}>{POINTS}</Text>
            <Text style={styles.loyaltyPointsLabel}>points</Text>
          </View>
        </View>

        {nextTier && (
          <>
            <View style={styles.loyaltyProgress}>
              <View style={[styles.loyaltyProgressFill, { width: `${Math.round(progressToNext * 100)}%` }]} />
            </View>
            <Text style={styles.loyaltyProgressLabel}>
              {nextTier.min - POINTS} points to {nextTier.emoji} {nextTier.name}
            </Text>
          </>
        )}

        {/* How to earn */}
        <View style={styles.loyaltyEarnRow}>
          <View style={styles.loyaltyEarnItem}>
            <Text style={styles.loyaltyEarnIcon}>⛽</Text>
            <Text style={styles.loyaltyEarnText}>Fill up{'\n'}+10 pts/L</Text>
          </View>
          <View style={styles.loyaltyEarnItem}>
            <Text style={styles.loyaltyEarnIcon}>⭐</Text>
            <Text style={styles.loyaltyEarnText}>Leave a{'\n'}review +50</Text>
          </View>
          <View style={styles.loyaltyEarnItem}>
            <Text style={styles.loyaltyEarnIcon}>👥</Text>
            <Text style={styles.loyaltyEarnText}>Refer a{'\n'}friend +200</Text>
          </View>
        </View>

        <View style={styles.loyaltyComingSoon}>
          <FontAwesome name="info-circle" size={11} color="rgba(255,255,255,0.6)" />
          <Text style={styles.loyaltyComingSoonText}>
            Loyalty program launching soon — sign up to be first
          </Text>
        </View>
      </View>

      {/* ── Saved stations ─────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>❤️ Saved Stations</Text>
          <Text style={styles.sectionCount}>{favoriteStations.length}</Text>
        </View>

        {favoriteStations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🤍</Text>
            <Text style={styles.emptyTitle}>No saved stations yet</Text>
            <Text style={styles.emptyDesc}>
              Tap the heart icon on any station to save it here
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/index')}
            >
              <Text style={styles.emptyBtnText}>Discover stations →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.favList}>
            {favoriteStations.map((station) => {
              const price = getCheapestPrice(station, defaultFuelType);
              return (
                <TouchableOpacity
                  key={station.id}
                  style={styles.favRow}
                  onPress={() => router.push(`/station/${station.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.favLeft}>
                    <Text style={styles.favBrand}>{station.brand}</Text>
                    <Text style={styles.favName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.favMeta}>{station.district} · {station.address}</Text>
                  </View>
                  <View style={styles.favRight}>
                    {price != null && (
                      <Text style={styles.favPrice}>{formatPrice(price)}</Text>
                    )}
                    <TouchableOpacity
                      onPress={() => toggleFavorite(station.id)}
                      hitSlop={10}
                      style={{ marginTop: 4 }}
                    >
                      <FontAwesome name="heart" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Price Alerts (UI ready) ─────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔔 Price Alerts</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        </View>
        <View style={styles.alertsCard}>
          {FUEL_TYPES.map((ft) => (
            <TouchableOpacity
              key={ft}
              style={styles.alertRow}
              onPress={() =>
                Alert.alert(
                  'Price Alerts',
                  'Price alerts will be available when Lepidus launches its partner programme. Stay tuned!',
                  [{ text: 'Got it' }]
                )
              }
              activeOpacity={0.7}
            >
              <View style={styles.alertLeft}>
                <Text style={styles.alertFuelLabel}>{FUEL_TYPE_LABELS[ft]}</Text>
                <Text style={styles.alertSubLabel}>Notify me when price drops below…</Text>
              </View>
              <View style={styles.alertRight}>
                <Text style={styles.alertThreshold}>Set alert</Text>
                <FontAwesome name="chevron-right" size={11} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Preferences ────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Preferences</Text>
        <View style={styles.prefCard}>
          <Text style={styles.prefLabel}>Default fuel type</Text>
          <View style={styles.prefFuelRow}>
            {FUEL_TYPES.map((ft) => (
              <TouchableOpacity
                key={ft}
                style={[
                  styles.prefFuelChip,
                  defaultFuelType === ft && styles.prefFuelChipActive,
                ]}
                onPress={() => setDefaultFuelType(ft)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.prefFuelChipText,
                    defaultFuelType === ft && styles.prefFuelChipTextActive,
                  ]}
                >
                  {FUEL_TYPE_LABELS[ft]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── About / Partner ────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>
        <View style={styles.aboutCard}>
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutRowText}>Data source</Text>
            <View style={styles.aboutRowRight}>
              <Text style={styles.aboutRowValue}>Cyprus Gov. Observatory</Text>
              <FontAwesome name="chevron-right" size={11} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutRowText}>Updated</Text>
            <View style={styles.aboutRowRight}>
              <Text style={styles.aboutRowValue}>Daily</Text>
              <FontAwesome name="chevron-right" size={11} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aboutRow} activeOpacity={0.7}>
            <Text style={styles.aboutRowText}>Become a partner station</Text>
            <View style={styles.aboutRowRight}>
              <Text style={[styles.aboutRowValue, { color: '#16a34a' }]}>Join →</Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.aboutRowText}>Version</Text>
            <Text style={styles.aboutRowValue}>1.0.0 (Beta)</Text>
          </View>
        </View>
      </View>

      {/* ── Account ────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Account</Text>
        <View style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutRowText}>Signed in as</Text>
            <Text style={[styles.aboutRowValue, { maxWidth: 180 }]} numberOfLines={1}>
              {user?.email ?? 'Guest'}
            </Text>
          </View>
          {profile?.display_name ? (
            <View style={styles.aboutRow}>
              <Text style={styles.aboutRowText}>Name</Text>
              <Text style={styles.aboutRowValue}>{profile.display_name}</Text>
            </View>
          ) : null}
          {profile?.is_operator ? (
            <View style={styles.aboutRow}>
              <Text style={styles.aboutRowText}>Account type</Text>
              <View style={styles.operatorBadge}>
                <Text style={styles.operatorBadgeText}>⛽ Station Operator</Text>
              </View>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.aboutRow, { borderBottomWidth: 0 }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={[styles.aboutRowText, { color: '#ef4444' }]}>Sign out</Text>
            <FontAwesome name="sign-out" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── App branding ───────────────────────────────────── */}
      <View style={styles.branding}>
        <Text style={styles.brandingLogo}>Lepidus</Text>
        <Text style={styles.brandingTagline}>Cyprus's fuel marketplace</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 110 },

  // Loyalty card
  loyaltyCard: {
    margin: 16,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  loyaltyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loyaltyTierLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  loyaltyTierRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loyaltyTierEmoji: { fontSize: 22 },
  loyaltyTierName: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  loyaltyPointsBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  loyaltyPointsNum: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  loyaltyPointsLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  loyaltyProgress: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  loyaltyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
    minWidth: 4,
  },
  loyaltyProgressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 16,
  },
  loyaltyEarnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  loyaltyEarnItem: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  loyaltyEarnIcon: { fontSize: 18 },
  loyaltyEarnText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 13,
  },
  loyaltyComingSoon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    padding: 10,
  },
  loyaltyComingSoonText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 15,
  },

  // Sections
  section: { marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
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

  // Favourites
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    gap: 8,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  favList: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  favLeft: { flex: 1, marginRight: 12 },
  favBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  favName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  favMeta: { fontSize: 11, color: '#9CA3AF' },
  favRight: { alignItems: 'flex-end' },
  favPrice: { fontSize: 17, fontWeight: '800', color: '#16a34a', letterSpacing: -0.4 },

  // Price alerts
  alertsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertLeft: { flex: 1 },
  alertFuelLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  alertSubLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  alertRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertThreshold: { fontSize: 13, fontWeight: '600', color: '#16a34a' },

  // Preferences
  prefCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    padding: 16,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  prefFuelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefFuelChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  prefFuelChipActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16a34a',
  },
  prefFuelChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  prefFuelChipTextActive: { color: '#16a34a' },

  // About
  aboutCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    overflow: 'hidden',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aboutRowText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  aboutRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aboutRowValue: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  operatorBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  operatorBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },

  // Branding footer
  branding: { alignItems: 'center', paddingVertical: 28 },
  brandingLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  brandingTagline: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
